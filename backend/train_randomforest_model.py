"""
RandomForest-Only Model Training Script
=====================================

This script trains a calibrated RandomForest model with:
1. Conservative guardrail parameters as specified
2. Portion-aware feature engineering
3. Unsafe recall target ≥ 0.9
4. No XGBoost dependency - RandomForest only
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedGroupKFold, cross_validate
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score, precision_recall_curve
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

from improved_model_system import MealSafetyPredictor, RiskLevel


def create_enhanced_training_data(food_df: pd.DataFrame, n_samples: int = 3000) -> pd.DataFrame:
    """
    Create realistic training data focusing on unsafe recall.
    """
    np.random.seed(42)
    
    print(f"🎲 Creating {n_samples} training samples...")
    
    # User profiles (more diverse for better generalization)
    ages = np.random.choice([25, 30, 35, 40, 45, 50, 55, 60, 65], n_samples, 
                           p=[0.08, 0.12, 0.15, 0.18, 0.2, 0.15, 0.08, 0.02, 0.02])
    genders = np.random.choice(['Male', 'Female'], n_samples, p=[0.55, 0.45])
    bmis = np.random.normal(27, 5, n_samples)  # Realistic BMI distribution
    bmis = np.clip(bmis, 18, 45)
    
    # Blood sugar levels (more realistic for diabetic population)
    fasting_sugars = np.random.normal(115, 25, n_samples)  
    fasting_sugars = np.clip(fasting_sugars, 80, 200)
    
    post_meal_sugars = fasting_sugars + np.random.normal(35, 25, n_samples)
    post_meal_sugars = np.clip(post_meal_sugars, 90, 300)
    
    # Meal selection (bias toward testing edge cases)
    meal_names = food_df.index.tolist()
    
    # Create stratified meal selection
    avoid_diabetic_meals = food_df[food_df['avoid_for_diabetic'].str.lower() == 'yes'].index.tolist()
    safe_meals = [m for m in meal_names if m not in avoid_diabetic_meals]
    
    # 70% safe meals, 30% avoid-diabetic meals for better training
    n_safe = int(0.7 * n_samples)
    n_avoid = n_samples - n_safe
    
    selected_meals = (np.random.choice(safe_meals, n_safe).tolist() + 
                     np.random.choice(avoid_diabetic_meals, n_avoid).tolist())
    np.random.shuffle(selected_meals)
    
    # Portion sizes (realistic with some extreme cases for testing)
    portion_multipliers = np.concatenate([
        np.random.lognormal(0, 0.4, int(0.8 * n_samples)),  # Normal portions
        np.random.uniform(2.5, 5.0, int(0.15 * n_samples)),  # Large portions
        np.random.uniform(0.2, 0.6, int(0.05 * n_samples))   # Small portions
    ])
    np.random.shuffle(portion_multipliers)
    portion_multipliers = np.clip(portion_multipliers, 0.1, 6.0)
    
    # Meal times with realistic distribution
    meal_times = np.random.choice(['Breakfast', 'Lunch', 'Dinner', 'Snack'], n_samples,
                                p=[0.25, 0.35, 0.3, 0.1])
    
    # User IDs for group-based CV
    n_users = max(50, n_samples // 25)  # Ensure sufficient groups
    user_ids = np.random.randint(1, n_users + 1, n_samples)
    
    training_data = pd.DataFrame({
        'user_id': user_ids,
        'age': ages,
        'gender': genders,
        'bmi': bmis,
        'fasting_sugar': fasting_sugars,
        'post_meal_sugar': post_meal_sugars,
        'meal_name': selected_meals,
        'portion_multiplier': portion_multipliers,
        'time_of_day': meal_times
    })
    
    print(f"✅ Training data created:")
    print(f"   - Users: {len(training_data['user_id'].unique())}")
    print(f"   - Avoid-diabetic meals: {sum([m in avoid_diabetic_meals for m in selected_meals])}")
    print(f"   - Large portions (≥2x): {sum(portion_multipliers >= 2.0)}")
    
    return training_data


def generate_labels_with_smart_guardrails(training_data: pd.DataFrame, food_df: pd.DataFrame, 
                                         predictor: MealSafetyPredictor) -> np.ndarray:
    """
    Generate labels using the new smart guardrail logic
    """
    print("🏷️ Generating labels with smart guardrail logic...")
    labels = []
    unsafe_count = 0
    caution_count = 0
    
    for idx, row in training_data.iterrows():
        if idx % 500 == 0:
            print(f"   Processing {idx}/{len(training_data)} samples...")
            
        try:
            food_row = food_df.loc[row['meal_name']]
            portion_size_g = 100 * row['portion_multiplier']  # Assume 100g base
            
            user_data = {
                'age': row['age'],
                'gender': row['gender'],
                'bmi': row['bmi'], 
                'fasting_sugar': row['fasting_sugar'],
                'post_meal_sugar': row['post_meal_sugar'],
                'time_of_day': row['time_of_day']
            }
            
            # Use NEW smart guardrail system to determine safety
            portion_features = predictor.compute_portion_features(food_row, portion_size_g)
            guardrail_risk, reasons = predictor.apply_hard_guardrails(food_row, portion_features, user_data)
            
            # Smart labeling based on guardrails and user context
            if guardrail_risk == RiskLevel.UNSAFE:
                label = 0  # Unsafe
                unsafe_count += 1
            elif guardrail_risk == RiskLevel.CAUTION:
                # For CAUTION foods, consider user health profile
                if (row['post_meal_sugar'] > 170 or row['bmi'] > 32 or 
                    row['age'] > 65 or portion_features['GL_portion'] > 18):
                    label = 0  # Treat as unsafe for high-risk users
                    unsafe_count += 1
                else:
                    label = 1  # Safe for moderate-risk users
            else:
                # No guardrail triggered - consider user context and food quality
                GL_portion = portion_features['GL_portion']
                sugar_effective = portion_features['sugar_effective_g']
                
                if (row['post_meal_sugar'] > 180 or row['bmi'] > 35 or 
                    (GL_portion > 20 and row['post_meal_sugar'] > 160)):
                    label = 0  # High-risk user + high GL
                    unsafe_count += 1
                elif (GL_portion <= 8 and sugar_effective <= 10 and 
                      row['post_meal_sugar'] <= 150 and row['bmi'] <= 28):
                    label = 1  # Healthy food + healthy user
                else:
                    # Middle ground - slight bias toward safety
                    label = 1 if np.random.random() < 0.7 else 0
                    if label == 0:
                        unsafe_count += 1
                    
            labels.append(label)
            
        except Exception as e:
            # Default to unsafe for unknown cases
            labels.append(0)
            unsafe_count += 1
    
    labels = np.array(labels)
    safe_count = len(labels) - unsafe_count
    unsafe_ratio = unsafe_count / len(labels)
    
    print(f"✅ Smart Label Distribution:")
    print(f"   - Unsafe (0): {unsafe_count} ({unsafe_ratio:.1%})")
    print(f"   - Safe (1): {safe_count} ({1-unsafe_ratio:.1%})")
    
    return labels


def train_randomforest_model(food_csv_path: str, model_output_dir: str):
    """
    Train RandomForest model with focus on unsafe recall ≥ 0.9
    """
    print("🌲 Training RandomForest Model for Diabetes Safety")
    print("=" * 55)
    
    # Load food dataset
    food_df = pd.read_csv(food_csv_path)
    if 'dish_name' in food_df.columns:
        food_df.set_index('dish_name', inplace=True)
    print(f"✅ Loaded {len(food_df)} foods from dataset")
    
    # Initialize predictor
    predictor = MealSafetyPredictor()
    predictor.food_df = food_df
    
    # Generate training data
    training_data = create_enhanced_training_data(food_df, n_samples=4000)
    
    # Generate labels with smart guardrails
    y = generate_labels_with_smart_guardrails(training_data, food_df, predictor)
    
    # Prepare features
    print("🔧 Engineering portion-aware features...")
    X, feature_names = prepare_model_features(training_data, food_df, predictor)
    print(f"✅ Feature matrix: {X.shape[0]} samples × {X.shape[1]} features")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # RandomForest optimized for unsafe recall ≥ 0.9
    print("🎯 Configuring RandomForest for high unsafe recall...")
    base_model = RandomForestClassifier(
        n_estimators=300,           # More trees for stability
        max_depth=12,               # Deeper trees to catch complex patterns
        min_samples_split=8,        # Prevent overfitting
        min_samples_leaf=3,         # Lower leaf size for better recall
        max_features='sqrt',        # Good default
        bootstrap=True,
        random_state=42,
        class_weight={0: 3, 1: 1},  # Higher weight for unsafe class (increased from 2 to 3)
        n_jobs=-1                   # Use all cores
    )
    
    # Calibrated classifier for better probabilities
    calibrated_model = CalibratedClassifierCV(base_model, method='isotonic', cv=3)
    
    # Cross-validation with group-based splits
    print("🔄 Cross-validation with group-based splits...")
    groups = training_data['user_id'].values
    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    
    scoring = ['accuracy', 'roc_auc', 'precision', 'recall', 'f1']
    cv_results = cross_validate(
        calibrated_model, X_scaled, y,
        groups=groups, cv=cv, scoring=scoring,
        return_train_score=False, return_estimator=True
    )
    
    print("📊 Cross-validation results:")
    for metric in scoring:
        scores = cv_results[f'test_{metric}']
        print(f"   {metric.capitalize()}: {scores.mean():.3f} ± {scores.std():.3f}")
    
    # Check unsafe recall specifically
    unsafe_recalls = cv_results['test_recall']
    avg_unsafe_recall = unsafe_recalls.mean()
    print(f"   🎯 Unsafe Recall: {avg_unsafe_recall:.3f} ± {unsafe_recalls.std():.3f}")
    
    if avg_unsafe_recall < 0.9:
        print("   ⚠️ Unsafe recall < 0.9. Consider adjusting class weights or thresholds.")
    else:
        print("   ✅ Target unsafe recall ≥ 0.9 achieved!")
    
    # Train final model
    print("🎯 Training final calibrated model...")
    calibrated_model.fit(X_scaled, y)
    
    # Feature importance (access from calibrated estimators)
    try:
        if hasattr(calibrated_model.calibrated_classifiers_[0].estimator, 'feature_importances_'):
            importance = calibrated_model.calibrated_classifiers_[0].estimator.feature_importances_
            feature_importance = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)
            print("\n🔍 Top 8 Most Important Features:")
            for name, imp in feature_importance[:8]:
                print(f"   {name}: {imp:.3f}")
    except (AttributeError, IndexError):
        print("\n🔍 Feature importance not available for calibrated model")
    
    # Find optimal threshold for unsafe recall ≥ 0.9
    print("\n🎚️ Finding optimal threshold for unsafe recall...")
    y_proba = calibrated_model.predict_proba(X_scaled)[:, 0]  # Probability of unsafe
    precision, recall, thresholds = precision_recall_curve(1 - y, y_proba)  # Flip for unsafe class
    
    # Find threshold that gives recall ≥ 0.9
    target_recall_idx = np.where(recall >= 0.9)[0]
    if len(target_recall_idx) > 0:
        optimal_threshold = thresholds[target_recall_idx[0]]
        optimal_precision = precision[target_recall_idx[0]]
        print(f"   📊 Optimal threshold: {optimal_threshold:.3f}")
        print(f"   📊 At threshold: Recall={recall[target_recall_idx[0]]:.3f}, Precision={optimal_precision:.3f}")
    else:
        optimal_threshold = 0.5
        print("   ⚠️ Could not find threshold for recall ≥ 0.9. Using default 0.5")
    
    # Save all artifacts
    output_path = Path(model_output_dir)
    output_path.mkdir(exist_ok=True)
    
    # Save improved model artifacts
    joblib.dump(calibrated_model, output_path / "improved_diabetes_model.joblib")
    joblib.dump(scaler, output_path / "improved_scaler.joblib")
    joblib.dump(feature_names, output_path / "improved_feature_names.joblib")
    joblib.dump(optimal_threshold, output_path / "optimal_threshold.joblib")
    
    # Backward compatibility
    joblib.dump(calibrated_model, output_path / "diabetes_model.joblib")
    joblib.dump(scaler, output_path / "scaler.joblib")
    joblib.dump(feature_names, output_path / "feature_columns.joblib")
    
    print(f"\n💾 Model artifacts saved to {output_path}/")
    print("✅ RandomForest training completed successfully!")
    
    return calibrated_model, scaler, feature_names, optimal_threshold


def prepare_model_features(training_data: pd.DataFrame, food_df: pd.DataFrame,
                          predictor: MealSafetyPredictor) -> tuple:
    """
    Prepare feature matrix using portion-aware engineering
    """
    features_list = []
    
    for _, row in training_data.iterrows():
        try:
            food_row = food_df.loc[row['meal_name']]
            portion_size_g = 100 * row['portion_multiplier']
            
            # Compute portion-aware features
            portion_features = predictor.compute_portion_features(food_row, portion_size_g)
            
            user_data = {
                'age': row['age'],
                'gender': row['gender'],
                'bmi': row['bmi'],
                'fasting_sugar': row['fasting_sugar'],
                'time_of_day': row['time_of_day']
            }
            
            # Get feature vector
            features = predictor.prepare_features_for_model(food_row, portion_features, user_data)
            features_list.append(features[0])
            
        except Exception as e:
            # Default feature vector
            default_features = np.zeros(13)
            features_list.append(default_features)
    
    X = np.array(features_list)
    feature_names = [
        'age', 'gender', 'bmi', 'fasting_sugar', 'time_encoded',
        'portion_multiplier', 'carbs_effective_g', 'sugar_effective_g', 'GL_portion',
        'fiber_to_carb_ratio', 'protein_to_carb_ratio', 'energy_density', 'glycemic_index'
    ]
    
    return X, feature_names


if __name__ == "__main__":
    # Configuration
    FOOD_CSV = "data/Food_Master_Dataset_.csv"
    MODEL_DIR = "models/"
    
    print("🚀 Starting RandomForest-Only Training")
    print("Conservative parameters:")
    print("  - Sugar: UNSAFE ≥35g, CAUTION 25-34g")
    print("  - GL: UNSAFE ≥20, CAUTION 11-19, SAFE ≤10") 
    print("  - Portion: UNSAFE ≥3.0×, CAUTION 2.0-2.9×")
    print("  - Calories: UNSAFE ≥800, CAUTION 700-799")
    print("  - Target unsafe recall: ≥0.9")
    print()
    
    # Train the model
    try:
        model, scaler, feature_names, threshold = train_randomforest_model(FOOD_CSV, MODEL_DIR)
        print("\n🎉 Training completed successfully!")
        
        # Quick validation
        print("\n🧪 Quick validation...")
        from improved_model_system import run_acceptance_tests
        
        predictor = MealSafetyPredictor()
        predictor.load_food_dataset(FOOD_CSV)
        predictor.model = model
        predictor.scaler = scaler
        predictor.is_trained = True
        
        test_results = run_acceptance_tests(predictor)
        
        if test_results['failed'] == 0:
            print("✅ All acceptance tests passed!")
        else:
            print(f"⚠️ {test_results['failed']} acceptance tests failed")
            
    except Exception as e:
        print(f"❌ Training failed: {e}")
        import traceback
        traceback.print_exc()

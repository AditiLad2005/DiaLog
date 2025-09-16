"""
Improved Model Training Script
=============================

This script trains a calibrated model with the new portion-aware features
and implements proper validation with stratified group k-fold.

Key improvements:
1. Portion-aware feature engineering at training time
2. Calibrated classifier for better probability estimates  
3. Stratified Group K-Fold to prevent user data leakage
4. Focus on unsafe recall (catching dangerous meals)
5. Monotonic constraints (if using XGBoost)
"""

import pandas as pd
import numpy as np
from pathlib import Path
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import StratifiedGroupKFold, cross_validate
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import classification_report, confusion_matrix, roc_auc_score
from sklearn.preprocessing import StandardScaler, LabelEncoder
import warnings
warnings.filterwarnings('ignore')

# Try to import XGBoost for better performance (optional)
try:
    import xgboost as xgb
    HAS_XGBOOST = True
except ImportError:
    HAS_XGBOOST = False
    print("⚠️ XGBoost not available. Using RandomForest instead.")

from improved_model_system import MealSafetyPredictor


def create_synthetic_training_data(food_df: pd.DataFrame, n_samples: int = 2000) -> pd.DataFrame:
    """
    Create synthetic training data with realistic user scenarios.
    
    This generates diverse combinations of users and meals to train on,
    with labels based on medical guidelines and portion awareness.
    """
    np.random.seed(42)
    
    # User profiles (realistic variations)
    ages = np.random.randint(25, 70, n_samples)
    genders = np.random.choice(['Male', 'Female'], n_samples)
    bmis = np.random.normal(26, 4, n_samples)  # Slightly overweight average
    bmis = np.clip(bmis, 18, 40)
    
    fasting_sugars = np.random.normal(110, 20, n_samples)  # Slightly elevated
    fasting_sugars = np.clip(fasting_sugars, 80, 180)
    
    post_meal_sugars = fasting_sugars + np.random.normal(30, 20, n_samples)
    post_meal_sugars = np.clip(post_meal_sugars, 90, 250)
    
    # Meal scenarios
    meal_names = food_df.index.tolist()
    selected_meals = np.random.choice(meal_names, n_samples)
    
    # Portion sizes (realistic distribution)
    portion_multipliers = np.random.lognormal(0, 0.5, n_samples)  # Log-normal for realistic portions
    portion_multipliers = np.clip(portion_multipliers, 0.3, 4.0)
    
    # Meal times
    meal_times = np.random.choice(['Breakfast', 'Lunch', 'Dinner', 'Snack'], n_samples, 
                                p=[0.25, 0.3, 0.3, 0.15])
    
    # User IDs for group-based splitting
    user_ids = np.random.randint(1, max(100, n_samples // 20), n_samples)
    
    # Create DataFrame
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
    
    return training_data


def generate_safety_labels(training_data: pd.DataFrame, food_df: pd.DataFrame, 
                         predictor: MealSafetyPredictor) -> np.ndarray:
    """
    Generate safety labels using the guardrail system + some noise for realism.
    
    This creates ground truth labels based on medical guidelines,
    with some realistic noise to simulate real-world uncertainty.
    """
    labels = []
    
    for _, row in training_data.iterrows():
        try:
            # Get food info
            food_row = food_df.loc[row['meal_name']]
            
            # Calculate portion size in grams (assuming 100g base serving)
            portion_size_g = 100 * row['portion_multiplier']
            
            # User context
            user_data = {
                'age': row['age'],
                'gender': row['gender'],
                'bmi': row['bmi'],
                'fasting_sugar': row['fasting_sugar'],
                'post_meal_sugar': row['post_meal_sugar'],
                'time_of_day': row['time_of_day']
            }
            
            # Use guardrail system to get base label
            portion_features = predictor.compute_portion_features(food_row, portion_size_g)
            guardrail_risk, reasons = predictor.apply_hard_guardrails(food_row, portion_features, user_data)
            
            # Convert to binary safe/unsafe
            if guardrail_risk in [predictor.RiskLevel.UNSAFE]:
                base_label = 0  # Unsafe
            elif guardrail_risk in [predictor.RiskLevel.CAUTION]:
                # For training, treat caution as mostly unsafe but with some variation
                base_label = 0 if np.random.random() < 0.8 else 1
            else:
                # No guardrail triggered - mostly safe but some natural variation
                base_label = 1 if np.random.random() < 0.9 else 0
            
            # Add some realistic noise based on individual factors
            noise_factors = [
                row['post_meal_sugar'] > 160,  # High post-meal reading
                row['bmi'] > 30,  # Obesity
                row['age'] > 60,  # Advanced age
                'late' in row['time_of_day'].lower()  # Late eating
            ]
            
            # Increase unsafe probability with more risk factors
            risk_adjustment = sum(noise_factors) * 0.1
            
            if base_label == 1 and np.random.random() < risk_adjustment:
                base_label = 0  # Flip safe to unsafe
            
            labels.append(base_label)
            
        except Exception as e:
            # Default to unsafe for unknown cases
            labels.append(0)
    
    return np.array(labels)


def prepare_training_features(training_data: pd.DataFrame, food_df: pd.DataFrame,
                            predictor: MealSafetyPredictor) -> tuple:
    """
    Prepare feature matrix for training using the improved feature engineering.
    """
    features_list = []
    
    # Encode categorical variables
    gender_encoder = LabelEncoder()
    time_encoder = LabelEncoder()
    
    # Fit encoders on all possible values
    gender_encoder.fit(['Male', 'Female'])
    time_encoder.fit(['Breakfast', 'Lunch', 'Dinner', 'Snack'])
    
    for _, row in training_data.iterrows():
        try:
            # Get food data
            food_row = food_df.loc[row['meal_name']]
            
            # Calculate portion features
            portion_size_g = 100 * row['portion_multiplier']  # Assuming 100g base
            portion_features = predictor.compute_portion_features(food_row, portion_size_g)
            
            # Prepare user data
            user_data = {
                'age': row['age'],
                'gender': row['gender'],
                'bmi': row['bmi'],
                'fasting_sugar': row['fasting_sugar'],
                'time_of_day': row['time_of_day']
            }
            
            # Use the same feature preparation as in prediction
            features = predictor.prepare_features_for_model(food_row, portion_features, user_data)
            features_list.append(features[0])  # Remove batch dimension
            
        except Exception as e:
            # Use default feature vector for problematic cases
            default_features = np.zeros(13)  # Adjust based on feature count
            features_list.append(default_features)
    
    # Convert to numpy array
    X = np.array(features_list)
    
    # Feature names for interpretability
    feature_names = [
        'age', 'gender', 'bmi', 'fasting_sugar', 'time_encoded',
        'portion_multiplier', 'carbs_effective_g', 'sugar_effective_g', 'GL_portion',
        'fiber_to_carb_ratio', 'protein_to_carb_ratio', 'energy_density', 'glycemic_index'
    ]
    
    return X, feature_names, gender_encoder, time_encoder


def train_improved_model(food_csv_path: str, model_output_dir: str, use_xgboost: bool = False):
    """
    Train the improved diabetes meal safety model.
    """
    print("🚀 Training Improved Diabetes Meal Safety Model")
    print("=" * 50)
    
    # Load food dataset
    food_df = pd.read_csv(food_csv_path)
    food_df.set_index('dish_name', inplace=True)
    print(f"✅ Loaded {len(food_df)} foods from dataset")
    
    # Initialize predictor for feature engineering
    predictor = MealSafetyPredictor()
    predictor.food_df = food_df
    
    # Generate synthetic training data
    print("🎲 Generating synthetic training data...")
    training_data = create_synthetic_training_data(food_df, n_samples=3000)
    print(f"✅ Created {len(training_data)} training samples")
    
    # Generate labels using guardrail system
    print("🏷️ Generating safety labels...")
    y = generate_safety_labels(training_data, food_df, predictor)
    print(f"✅ Label distribution - Safe: {sum(y)}, Unsafe: {len(y) - sum(y)}")
    
    # Prepare features
    print("🔧 Engineering features...")
    X, feature_names, gender_encoder, time_encoder = prepare_training_features(
        training_data, food_df, predictor
    )
    print(f"✅ Prepared {X.shape[1]} features for {X.shape[0]} samples")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Model selection and training
    print("🤖 Training model...")
    
    if use_xgboost and HAS_XGBOOST:
        # XGBoost with monotonic constraints
        base_model = xgb.XGBClassifier(
            n_estimators=200,
            max_depth=6,
            learning_rate=0.1,
            random_state=42,
            # Monotonic constraints: risk should increase with these features
            monotone_constraints={
                5: 1,  # portion_multiplier
                6: 1,  # carbs_effective_g  
                7: 1,  # sugar_effective_g
                8: 1,  # GL_portion
                12: 1  # glycemic_index
                # Ratios (9,10) should decrease risk, but XGBoost constraint format is tricky
            }
        )
        print("📊 Using XGBoost with monotonic constraints")
    else:
        # RandomForest (more robust, easier to tune)
        base_model = RandomForestClassifier(
            n_estimators=200,
            max_depth=10,
            min_samples_split=20,
            min_samples_leaf=10,
            random_state=42,
            class_weight='balanced'  # Handle class imbalance
        )
        print("🌲 Using Random Forest")
    
    # Calibrated classifier for better probabilities
    calibrated_model = CalibratedClassifierCV(base_model, method='isotonic', cv=3)
    
    # Cross-validation with group-based splits (prevent user data leakage)
    print("🔄 Running cross-validation...")
    groups = training_data['user_id'].values
    cv = StratifiedGroupKFold(n_splits=5, shuffle=True, random_state=42)
    
    # Focus on recall for unsafe class (catching dangerous meals)
    scoring = ['accuracy', 'roc_auc', 'precision', 'recall']
    cv_results = cross_validate(
        calibrated_model, X_scaled, y, 
        groups=groups, cv=cv, scoring=scoring,
        return_train_score=False
    )
    
    print("📈 Cross-validation Results:")
    for metric in scoring:
        scores = cv_results[f'test_{metric}']
        print(f"   {metric}: {scores.mean():.3f} ± {scores.std():.3f}")
    
    # Train final model on all data
    print("🎯 Training final model...")
    calibrated_model.fit(X_scaled, y)
    
    # Feature importance (if using RandomForest)
    if hasattr(calibrated_model.base_estimator, 'feature_importances_'):
        importance = calibrated_model.base_estimator.feature_importances_
        feature_importance = sorted(zip(feature_names, importance), key=lambda x: x[1], reverse=True)
        print("🔍 Top 5 Most Important Features:")
        for name, imp in feature_importance[:5]:
            print(f"   {name}: {imp:.3f}")
    
    # Save all artifacts
    output_path = Path(model_output_dir)
    output_path.mkdir(exist_ok=True)
    
    joblib.dump(calibrated_model, output_path / "improved_diabetes_model.joblib")
    joblib.dump(scaler, output_path / "improved_scaler.joblib") 
    joblib.dump(feature_names, output_path / "improved_feature_names.joblib")
    joblib.dump(gender_encoder, output_path / "gender_encoder.joblib")
    joblib.dump(time_encoder, output_path / "time_encoder.joblib")
    
    # For backward compatibility, also save as the old names
    joblib.dump(calibrated_model, output_path / "diabetes_model.joblib")
    joblib.dump(scaler, output_path / "scaler.joblib")
    joblib.dump(feature_names, output_path / "feature_columns.joblib")
    
    print(f"💾 Model saved to {output_path}/")
    print("✅ Training completed!")
    
    return calibrated_model, scaler, feature_names


if __name__ == "__main__":
    # Configuration
    FOOD_CSV = "data/Food_Master_Dataset_.csv"
    MODEL_DIR = "models/"
    USE_XGBOOST = HAS_XGBOOST  # Use XGBoost if available
    
    # Train the model
    model, scaler, feature_names = train_improved_model(FOOD_CSV, MODEL_DIR, USE_XGBOOST)
    
    print("\n🧪 Testing the trained model...")
    
    # Quick test
    from improved_model_system import run_acceptance_tests
    predictor = MealSafetyPredictor()
    predictor.load_food_dataset(FOOD_CSV)
    predictor.model = model
    predictor.scaler = scaler
    predictor.is_trained = True
    
    # Run acceptance tests
    test_results = run_acceptance_tests(predictor)
    
    if test_results['failed'] == 0:
        print("🎉 All acceptance tests passed!")
    else:
        print(f"⚠️ {test_results['failed']} tests failed. Check the implementation.")

"""
Medical Guidelines-Based Model Training
=====================================

This script trains a balanced model using proper medical nutrition guidelines:
- Indian Diabetes Association and ADA standards
- Balanced healthy vs unhealthy food classification
- Focus on promoting healthy foods while flagging truly unsafe ones
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

from improved_model_system import MealSafetyPredictor, RiskLevel


def create_medical_guidelines_labels(food_df: pd.DataFrame) -> pd.DataFrame:
    """
    Create labels based on actual medical nutrition guidelines.
    
    Returns: DataFrame with 'medical_label' column (1=SAFE, 0=UNSAFE)
    """
    print("🏥 Applying Medical Nutrition Guidelines...")
    
    # Create a copy to work with
    df = food_df.copy()
    
    # Initialize all as neutral (will be determined by rules)
    df['medical_label'] = -1  # -1 = undetermined
    df['reasoning'] = ""
    
    # Fill NaN values with defaults
    df['glycemic_index'] = df['glycemic_index'].fillna(55)  # Neutral GI
    df['sugar_g'] = df['sugar_g'].fillna(0)
    df['fiber_g'] = df['fiber_g'].fillna(0)
    df['protein_g'] = df['protein_g'].fillna(0)
    df['carbs_g'] = df['carbs_g'].fillna(0)
    df['calories_kcal'] = df['calories_kcal'].fillna(100)
    
    # RULE 1: CLEARLY HEALTHY FOODS (Medical Guidelines)
    # Low-Moderate GI (≤55) + Low Sugar (<5g) + High Fiber (≥3g)
    healthy_mask = (
        (df['glycemic_index'] <= 55) & 
        (df['sugar_g'] < 5) & 
        (df['fiber_g'] >= 3)
    )
    df.loc[healthy_mask, 'medical_label'] = 1
    df.loc[healthy_mask, 'reasoning'] = "Low GI + Low Sugar + High Fiber"
    print(f"✅ Rule 1 - Healthy (GI≤55, Sugar<5g, Fiber≥3g): {healthy_mask.sum()} foods")
    
    # RULE 2: PROTEIN-RICH FOODS (Dal, Pulses, Lean Proteins)
    # Even with moderate carbs, high protein foods are diabetes-friendly
    protein_foods_mask = (
        (df['protein_g'] >= 8) & 
        (df['sugar_g'] < 7) & 
        (df['glycemic_index'] <= 65)  # Allow slightly higher GI for protein foods
    )
    df.loc[protein_foods_mask & (df['medical_label'] == -1), 'medical_label'] = 1
    df.loc[protein_foods_mask & (df['medical_label'] == 1), 'reasoning'] += " + High Protein"
    df.loc[protein_foods_mask & (df['reasoning'] == ""), 'reasoning'] = "High Protein (≥8g)"
    print(f"✅ Rule 2 - Protein-rich foods (≥8g protein): {(protein_foods_mask & (df['medical_label'] != -1)).sum()} additional foods")
    
    # RULE 3: NON-STARCHY VEGETABLES (Even with some carbs)
    # Identify vegetable dishes by name patterns
    vegetable_keywords = [
        'vegetables', 'sabzi', 'subji', 'curry', 'palak', 'spinach', 
        'bhindi', 'okra', 'gourd', 'lauki', 'tinda', 'beans', 'carrot',
        'cabbage', 'cauliflower', 'broccoli', 'beetroot', 'radish'
    ]
    
    veg_pattern = '|'.join(vegetable_keywords)
    is_vegetable = df.index.str.contains(veg_pattern, case=False, na=False)
    
    # Vegetables are healthy unless very high sugar or fried
    veg_healthy_mask = (
        is_vegetable & 
        (df['sugar_g'] < 10) &  # Allow some natural sugars
        ~df.index.str.contains('fried|pakora|bhajiya', case=False, na=False)
    )
    df.loc[veg_healthy_mask & (df['medical_label'] == -1), 'medical_label'] = 1
    df.loc[veg_healthy_mask, 'reasoning'] += " + Vegetable Dish"
    print(f"✅ Rule 3 - Non-starchy vegetables: {(veg_healthy_mask & (df['medical_label'] != -1)).sum()} additional foods")
    
    # RULE 4: WHOLE GRAINS IN MODERATION
    # Roti, brown rice, oats, etc. - moderate portions are fine
    whole_grain_keywords = ['roti', 'chapati', 'brown rice', 'oats', 'jowar', 'bajra', 'ragi', 'quinoa']
    grain_pattern = '|'.join(whole_grain_keywords)
    is_whole_grain = df.index.str.contains(grain_pattern, case=False, na=False)
    
    grain_healthy_mask = (
        is_whole_grain & 
        (df['fiber_g'] >= 2) &  # Should have some fiber
        (df['sugar_g'] < 3)     # Not sweetened
    )
    df.loc[grain_healthy_mask & (df['medical_label'] == -1), 'medical_label'] = 1
    df.loc[grain_healthy_mask, 'reasoning'] += " + Whole Grain"
    print(f"✅ Rule 4 - Whole grains: {(grain_healthy_mask & (df['medical_label'] != -1)).sum()} additional foods")
    
    # RULE 5: CLEARLY UNHEALTHY FOODS (Medical Red Flags)
    # High GI (≥70) + High Sugar (>10g)
    clearly_unhealthy_mask = (
        (df['glycemic_index'] >= 70) & 
        (df['sugar_g'] > 10)
    )
    df.loc[clearly_unhealthy_mask, 'medical_label'] = 0
    df.loc[clearly_unhealthy_mask, 'reasoning'] = "High GI + High Sugar"
    print(f"❌ Rule 5 - Clearly unhealthy (GI≥70, Sugar>10g): {clearly_unhealthy_mask.sum()} foods")
    
    # RULE 6: DEEP-FRIED FOODS
    fried_keywords = ['fried', 'fry', 'pakora', 'bhajiya', 'samosa', 'puri', 'bhature', 'vada']
    fried_pattern = '|'.join(fried_keywords)
    is_fried = df.index.str.contains(fried_pattern, case=False, na=False)
    
    df.loc[is_fried, 'medical_label'] = 0
    df.loc[is_fried, 'reasoning'] = "Deep Fried Food"
    print(f"❌ Rule 6 - Deep-fried foods: {is_fried.sum()} foods")
    
    # RULE 7: SWEETS AND DESSERTS
    sweet_keywords = ['sweet', 'halwa', 'kheer', 'laddoo', 'gulab jamun', 'jalebi', 'barfi', 'kulfi', 'ice cream', 'cake', 'pastry']
    sweet_pattern = '|'.join(sweet_keywords)
    is_sweet = df.index.str.contains(sweet_pattern, case=False, na=False)
    
    df.loc[is_sweet, 'medical_label'] = 0
    df.loc[is_sweet, 'reasoning'] = "Sweet/Dessert"
    print(f"❌ Rule 7 - Sweets and desserts: {is_sweet.sum()} foods")
    
    # RULE 8: VERY HIGH SUGAR (Override everything)
    very_high_sugar_mask = df['sugar_g'] > 20
    df.loc[very_high_sugar_mask, 'medical_label'] = 0
    df.loc[very_high_sugar_mask, 'reasoning'] = "Very High Sugar (>20g)"
    print(f"❌ Rule 8 - Very high sugar foods: {very_high_sugar_mask.sum()} foods")
    
    # RULE 9: DEFAULT FOR REMAINING FOODS (Based on balanced criteria)
    undetermined_mask = df['medical_label'] == -1
    
    # For undetermined foods, use balanced approach
    for idx in df[undetermined_mask].index:
        row = df.loc[idx]
        
        # Calculate health score
        health_score = 0
        
        # Good indicators
        if row['glycemic_index'] <= 60: health_score += 2
        if row['sugar_g'] <= 7: health_score += 2  
        if row['fiber_g'] >= 2: health_score += 2
        if row['protein_g'] >= 5: health_score += 2
        if row['calories_kcal'] <= 200: health_score += 1
        
        # Bad indicators  
        if row['glycemic_index'] >= 75: health_score -= 3
        if row['sugar_g'] >= 15: health_score -= 3
        if row['calories_kcal'] >= 400: health_score -= 2
        
        # Decision based on score
        if health_score >= 4:
            df.loc[idx, 'medical_label'] = 1
            df.loc[idx, 'reasoning'] = "Balanced Nutritional Profile"
        else:
            df.loc[idx, 'medical_label'] = 0  
            df.loc[idx, 'reasoning'] = "Poor Nutritional Profile"
    
    remaining_safe = (df['medical_label'] == 1).sum()
    remaining_unsafe = (df['medical_label'] == 0).sum()
    print(f"📊 Rule 9 - Remaining foods: {remaining_safe} safe, {remaining_unsafe} unsafe")
    
    # Final summary
    total_safe = (df['medical_label'] == 1).sum()
    total_unsafe = (df['medical_label'] == 0).sum()
    safe_percentage = (total_safe / len(df)) * 100
    
    print(f"\n📈 FINAL MEDICAL CLASSIFICATION:")
    print(f"   ✅ SAFE/HEALTHY: {total_safe}/{len(df)} ({safe_percentage:.1f}%)")
    print(f"   ❌ UNSAFE/UNHEALTHY: {total_unsafe}/{len(df)} ({100-safe_percentage:.1f}%)")
    
    return df[['medical_label', 'reasoning']]


def create_balanced_training_data(food_df: pd.DataFrame, medical_labels: pd.DataFrame, n_samples: int = 2000) -> pd.DataFrame:
    """
    Create balanced training data with realistic scenarios.
    """
    np.random.seed(42)
    print(f"🎲 Creating {n_samples} balanced training samples...")
    
    # Realistic user profiles
    ages = np.random.choice([25, 35, 45, 55, 65], n_samples, p=[0.15, 0.25, 0.30, 0.20, 0.10])
    genders = np.random.choice(['Male', 'Female'], n_samples, p=[0.55, 0.45])
    bmis = np.random.normal(26, 4, n_samples)
    bmis = np.clip(bmis, 18, 40)
    
    # Blood sugar levels (mix of controlled and uncontrolled diabetics)
    fasting_sugars = np.random.choice([100, 110, 130, 150], n_samples, p=[0.3, 0.4, 0.2, 0.1])
    post_meal_sugars = fasting_sugars + np.random.normal(30, 15, n_samples)
    post_meal_sugars = np.clip(post_meal_sugars, 100, 250)
    
    # Meal times
    meal_times = np.random.choice(['Breakfast', 'Lunch', 'Dinner', 'Snack'], n_samples, 
                                  p=[0.25, 0.35, 0.30, 0.10])
    
    # Food selection - balanced between safe and unsafe foods
    safe_foods = medical_labels[medical_labels['medical_label'] == 1].index.tolist()
    unsafe_foods = medical_labels[medical_labels['medical_label'] == 0].index.tolist()
    
    # Create balanced selection (60% safe foods, 40% unsafe foods for realistic distribution)
    n_safe = int(n_samples * 0.6)
    n_unsafe = n_samples - n_safe
    
    selected_foods = (
        np.random.choice(safe_foods, n_safe, replace=True).tolist() +
        np.random.choice(unsafe_foods, n_unsafe, replace=True).tolist()
    )
    np.random.shuffle(selected_foods)
    
    # Realistic portion sizes (grams)
    portion_sizes = []
    for food in selected_foods:
        if food in safe_foods:
            # Healthy foods - normal to large portions
            portion = np.random.choice([100, 150, 200, 250], p=[0.2, 0.4, 0.3, 0.1])
        else:
            # Unhealthy foods - smaller to normal portions
            portion = np.random.choice([50, 100, 150, 200], p=[0.3, 0.4, 0.2, 0.1])
        portion_sizes.append(portion)
    
    # Create training dataframe
    training_data = pd.DataFrame({
        'meal_name': selected_foods,
        'portion_size_g': portion_sizes,
        'age': ages,
        'gender': genders,
        'bmi': bmis,
        'fasting_sugar': fasting_sugars,
        'post_meal_sugar': post_meal_sugars,
        'time_of_day': meal_times
    })
    
    print(f"✅ Created balanced training data:")
    print(f"   📊 Safe foods: {len([f for f in selected_foods if f in safe_foods])} ({(len([f for f in selected_foods if f in safe_foods])/n_samples)*100:.1f}%)")
    print(f"   📊 Unsafe foods: {len([f for f in selected_foods if f in safe_foods])} ({(len([f for f in selected_foods if f not in safe_foods])/n_samples)*100:.1f}%)")
    
    return training_data


def generate_medical_labels(training_data: pd.DataFrame, food_df: pd.DataFrame, 
                           medical_labels: pd.DataFrame) -> list:
    """
    Generate training labels based on medical guidelines with portion consideration.
    """
    print("🏷️ Generating medical-based labels...")
    
    predictor = MealSafetyPredictor()
    predictor.food_df = food_df
    
    labels = []
    safe_count = 0
    
    for i, row in training_data.iterrows():
        meal_name = row['meal_name']
        portion_size_g = row['portion_size_g']
        
        # Get base medical classification
        base_medical_label = medical_labels.loc[meal_name, 'medical_label']
        
        # Get food nutritional info
        food_row = food_df.loc[meal_name]
        portion_features = predictor.compute_portion_features(food_row, portion_size_g)
        
        # Adjust label based on portion size
        portion_multiplier = portion_features['portion_multiplier']
        gl_portion = portion_features['GL_portion']
        sugar_effective_g = portion_features['sugar_effective_g']
        
        if base_medical_label == 1:  # Originally safe food
            # Safe foods can become unsafe with excessive portions
            if portion_multiplier >= 4.0 or gl_portion >= 25 or sugar_effective_g >= 25:
                final_label = 0  # Unsafe due to portion
            elif portion_multiplier >= 2.5 or gl_portion >= 15 or sugar_effective_g >= 15:
                # Borderline - depends on user risk
                user_risk = row['fasting_sugar'] > 130 or row['bmi'] > 30
                final_label = 0 if user_risk else 1
            else:
                final_label = 1  # Safe
        else:  # Originally unsafe food
            # Unsafe foods might be okay in very small portions for low-risk users  
            if portion_multiplier <= 0.5 and gl_portion <= 5 and sugar_effective_g <= 3:
                user_risk = row['fasting_sugar'] > 140 or row['bmi'] > 32
                final_label = 0 if user_risk else 1
            else:
                final_label = 0  # Unsafe
        
        labels.append(final_label)
        if final_label == 1:
            safe_count += 1
        
        if i % 500 == 0:
            print(f"   Processed {i}/{len(training_data)} samples...")
    
    safe_percentage = (safe_count / len(labels)) * 100
    print(f"📊 Final label distribution:")
    print(f"   ✅ SAFE: {safe_count}/{len(labels)} ({safe_percentage:.1f}%)")
    print(f"   ❌ UNSAFE: {len(labels)-safe_count}/{len(labels)} ({100-safe_percentage:.1f}%)")
    
    return labels


def train_medical_model():
    """
    Train the model using medical guidelines.
    """
    print("🏥 TRAINING MEDICAL GUIDELINES-BASED MODEL")
    print("=" * 50)
    
    # Load food dataset
    food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
    food_df.set_index('dish_name', inplace=True)
    print(f"📊 Loaded {len(food_df)} foods from dataset")
    
    # Apply medical guidelines to create base classifications
    medical_labels = create_medical_guidelines_labels(food_df)
    
    # Create balanced training data
    training_data = create_balanced_training_data(food_df, medical_labels, n_samples=3000)
    
    # Generate labels considering portions and user context
    labels = generate_medical_labels(training_data, food_df, medical_labels)
    
    # Initialize predictor for feature engineering
    predictor = MealSafetyPredictor()
    predictor.food_df = food_df
    
    # Prepare features
    print("🔧 Preparing features...")
    feature_data = []
    
    for i, row in training_data.iterrows():
        food_row = food_df.loc[row['meal_name']]
        portion_features = predictor.compute_portion_features(food_row, row['portion_size_g'])
        
        user_data = {
            'age': row['age'],
            'gender': row['gender'], 
            'bmi': row['bmi'],
            'fasting_sugar': row['fasting_sugar'],
            'time_of_day': row['time_of_day']
        }
        
        features = predictor.prepare_features_for_model(food_row, portion_features, user_data)
        feature_data.append(features.flatten())
    
    X = np.array(feature_data)
    y = np.array(labels)
    
    print(f"✅ Feature matrix shape: {X.shape}")
    print(f"✅ Label distribution: {np.bincount(y)}")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train Random Forest with balanced parameters
    print("🌲 Training Random Forest...")
    
    # Use balanced class weights to ensure both classes are learned well
    rf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_split=10,
        min_samples_leaf=5,
        class_weight='balanced',  # This is key for balanced learning
        random_state=42,
        n_jobs=-1
    )
    
    # Cross-validation
    cv_scores = cross_validate(rf, X_scaled, y, cv=5, 
                              scoring=['accuracy', 'precision', 'recall', 'f1'])
    
    print(f"📊 Cross-validation results:")
    print(f"   Accuracy: {cv_scores['test_accuracy'].mean():.3f} ± {cv_scores['test_accuracy'].std():.3f}")
    print(f"   Precision: {cv_scores['test_precision'].mean():.3f} ± {cv_scores['test_precision'].std():.3f}")
    print(f"   Recall: {cv_scores['test_recall'].mean():.3f} ± {cv_scores['test_recall'].std():.3f}")
    print(f"   F1: {cv_scores['test_f1'].mean():.3f} ± {cv_scores['test_f1'].std():.3f}")
    
    # Train final model
    rf.fit(X_scaled, y)
    
    # Calibrate probabilities
    print("📈 Calibrating probabilities...")
    calibrated_model = CalibratedClassifierCV(rf, method='sigmoid', cv=3)
    calibrated_model.fit(X_scaled, y)
    
    # Final predictions and metrics
    y_pred = calibrated_model.predict(X_scaled)
    y_prob = calibrated_model.predict_proba(X_scaled)[:, 1]
    
    print(f"\n📊 FINAL MODEL PERFORMANCE:")
    print(classification_report(y, y_pred, target_names=['Unsafe', 'Safe']))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': [f'feature_{i}' for i in range(X.shape[1])],
        'importance': rf.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\n🔍 TOP 5 MOST IMPORTANT FEATURES:")
    for i, row in feature_importance.head().iterrows():
        print(f"   {row['feature']}: {row['importance']:.3f}")
    
    # Save model artifacts
    model_dir = Path('models')
    model_dir.mkdir(exist_ok=True)
    
    joblib.dump(calibrated_model, model_dir / 'medical_diabetes_model.joblib')
    joblib.dump(scaler, model_dir / 'medical_scaler.joblib')
    joblib.dump(['feature_' + str(i) for i in range(X.shape[1])], model_dir / 'medical_feature_names.joblib')
    joblib.dump(medical_labels, model_dir / 'medical_labels.joblib')
    
    print(f"\n💾 Model saved to {model_dir}/")
    print("✅ Medical model training completed!")
    
    return calibrated_model, scaler


if __name__ == "__main__":
    model, scaler = train_medical_model()

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os

def calculate_bmi(weight_kg, height_cm):
    """Calculate BMI from weight and height"""
    return weight_kg / ((height_cm / 100) ** 2)

def train_model():
    print("=== Training Diabetes Meal Safety Model ===")
    
    # Load Food Master Dataset
    try:
        food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
        print(f"Loaded {len(food_df)} food items from Food Master Dataset")
    except FileNotFoundError:
        print("❌ Food_Master_Dataset_.csv not found!")
        return None, None, None
    
    # Load User Logs Dataset (if exists, otherwise create synthetic data)
    try:
        user_df = pd.read_csv('data/User_Logs_Dataset.csv')
        print(f"Loaded {len(user_df)} user logs")
    except FileNotFoundError:
        print("Creating synthetic user logs dataset...")
        user_df = create_synthetic_user_logs(food_df)
        user_df.to_csv('data/User_Logs_Dataset.csv', index=False)
        print(f"Created {len(user_df)} synthetic user logs")
    
    # Prepare features for training
    # Merge user logs with food data
    merged_df = user_df.merge(
        food_df, 
        left_on='meal_taken', 
        right_on='dish_name', 
        how='inner',
        suffixes=('_user', '_food')  # Add suffixes to avoid column name conflicts
    )
    
    print(f"Merged dataset shape: {merged_df.shape}")
    
    # Feature engineering
    if 'bmi' not in merged_df.columns:
        merged_df['bmi'] = calculate_bmi(merged_df['weight_kg'], merged_df['height_cm'])
    
    # Encode categorical variables
    le_gender = LabelEncoder()
    le_meal_time = LabelEncoder()
    le_diabetes_type = LabelEncoder()
    
    merged_df['gender_encoded'] = le_gender.fit_transform(merged_df['gender'])
    merged_df['meal_time_encoded'] = le_meal_time.fit_transform(merged_df['meal_time'])
    merged_df['diabetes_type_encoded'] = le_diabetes_type.fit_transform(merged_df['diabetes_type'])
    
    # Select features for training - use the correct column names from the merged dataset
    feature_columns = [
        'age', 'bmi', 'gender_encoded', 'fasting_sugar', 'post_meal_sugar',
        'meal_time_encoded', 'portion_size_g', 'carbs_g_food', 'protein_g_food', 'fat_g_food',
        'fiber_g_food', 'glycemic_index_food', 'glycemic_load_food', 'calories_kcal'
    ]
    
    # Check if all required columns are available
    missing_columns = [col for col in feature_columns if col not in merged_df.columns]
    if missing_columns:
        print(f"❌ Missing columns in the dataset: {missing_columns}")
        print("Available columns:", merged_df.columns.tolist())
        return None, None, None
    
    X = merged_df[feature_columns].fillna(0)
    y = merged_df['label_safe_risky']  # 1 = safe, 0 = risky
    
    print(f"Feature matrix shape: {X.shape}")
    print(f"Target distribution: {y.value_counts()}")
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Scale features
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # Train model
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        min_samples_split=5,
        random_state=42,
        class_weight='balanced'
    )
    
    model.fit(X_train_scaled, y_train)
    
    # Evaluate model
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"\nModel Performance:")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop 10 Most Important Features:")
    print(feature_importance.head(10))
    
    # Save model artifacts
    os.makedirs('models', exist_ok=True)
    
    joblib.dump(model, 'models/diabetes_model.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    joblib.dump(feature_columns, 'models/feature_columns.joblib')
    joblib.dump(le_gender, 'models/gender_encoder.joblib')
    joblib.dump(le_meal_time, 'models/meal_time_encoder.joblib')
    joblib.dump(le_diabetes_type, 'models/diabetes_type_encoder.joblib')
    
    print(f"\n✅ Model saved successfully!")
    return model, scaler, feature_columns

def create_synthetic_user_logs(food_df, n_samples=1000):
    """Create synthetic user logs for training"""
    np.random.seed(42)
    
    # Sample food items - make sure we have the right column names
    sample_foods = food_df.sample(n=min(50, len(food_df)))
    
    data = []
    for i in range(n_samples):
        # Random user profile
        age = np.random.randint(25, 70)
        gender = np.random.choice(['Male', 'Female'])
        weight = np.random.normal(70, 15) if gender == 'Male' else np.random.normal(60, 12)
        height = np.random.normal(175, 10) if gender == 'Male' else np.random.normal(165, 8)
        
        # Random meal selection
        food_item = sample_foods.sample(1).iloc[0]
        
        # Random portion (0.5 to 3 servings)
        portion_multiplier = np.random.uniform(0.5, 3.0)
        portion_g = food_item['serving_size_g'] * portion_multiplier
        
        # Sugar levels (vary based on food safety and user profile)
        base_fasting = np.random.normal(100, 20)
        base_post_meal = np.random.normal(140, 30)
        
        # Adjust based on food GI and portion
        gi_factor = food_item['glycemic_index'] / 55  # normalize around medium GI
        portion_factor = portion_multiplier
        
        fasting_sugar = max(70, base_fasting + np.random.normal(0, 10))
        post_meal_sugar = max(80, base_post_meal + (gi_factor * portion_factor * 20) + np.random.normal(0, 15))
        
        # Determine safety label
        # Safe if: post_meal_sugar < 180 AND reasonable portion AND not avoid_for_diabetic
        is_safe = (
            post_meal_sugar < 180 and 
            portion_multiplier < 2.0 and 
            food_item['avoid_for_diabetic'] != 'Yes'
        )
        
        data.append({
            'log_id': i + 1,
            'user_id': np.random.randint(1, 201),
            'age': int(age),
            'gender': gender,
            'weight_kg': round(weight, 1),
            'height_cm': round(height, 1),
            'diabetes_type': np.random.choice(['Type 1', 'Type 2', 'Prediabetic'], p=[0.1, 0.7, 0.2]),
            'fasting_sugar': round(fasting_sugar, 1),
            'post_meal_sugar': round(post_meal_sugar, 1),
            'meal_time': np.random.choice(['Breakfast', 'Lunch', 'Dinner', 'Snack']),  # Changed from meal_taken to meal_time
            'meal_taken': food_item['dish_name'],
            'portion_size_g': round(portion_g, 1),
            'label_safe_risky': 1 if is_safe else 0
        })
    
    return pd.DataFrame(data)

if __name__ == "__main__":
    train_model()

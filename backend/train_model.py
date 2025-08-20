import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, accuracy_score
import joblib
import os
from pathlib import Path

def create_directories():
    """Create necessary directories"""
    Path("models").mkdir(exist_ok=True)
    Path("data").mkdir(exist_ok=True)

def load_and_prepare_data():
    """Load and prepare the dataset"""
    try:
        # Load food dataset
        food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
        print(f"✅ Loaded {len(food_df)} food items")
        
        # Generate synthetic user data for training
        np.random.seed(42)
        n_samples = 2000
        
        # Create synthetic user data
        ages = np.random.randint(18, 80, n_samples)
        genders = np.random.choice([0, 1], n_samples)  # 0=Female, 1=Male
        weights = np.random.normal(70, 15, n_samples)  # kg
        heights = np.random.normal(170, 10, n_samples)  # cm
        
        # Calculate BMI
        bmis = weights / ((heights/100) ** 2)
        
        # Generate blood sugar levels
        fasting_sugars = np.random.normal(100, 20, n_samples)
        post_meal_sugars = np.random.normal(140, 30, n_samples)
        
        # Sample foods randomly
        food_indices = np.random.choice(len(food_df), n_samples)
        selected_foods = food_df.iloc[food_indices]
        
        # Generate meal timing and portion data
        meal_times = np.random.choice([0, 1, 2, 3], n_samples)  # Breakfast, Lunch, Dinner, Snack
        portion_sizes = np.random.uniform(0.5, 2.0, n_samples)
        
        # Create feature matrix
        features = np.column_stack([
            ages,
            genders,
            weights,
            heights,
            bmis,
            fasting_sugars,
            post_meal_sugars,
            selected_foods['carbs_g'].values,
            selected_foods['protein_g'].values,
            selected_foods['fat_g'].values,
            selected_foods['fiber_g'].values,
            selected_foods['calories_kcal'].values,
            selected_foods['glycemic_index'].fillna(50).values,
            meal_times,
            portion_sizes
        ])
        
        # Generate target labels based on multiple criteria
        targets = []
        for i in range(n_samples):
            # Safety criteria
            high_carbs = selected_foods.iloc[i]['carbs_g'] > 30
            high_gi = selected_foods.iloc[i]['glycemic_index'] > 70
            high_sugar = post_meal_sugars[i] > 180
            large_portion = portion_sizes[i] > 1.5
            avoid_diabetic = selected_foods.iloc[i]['avoid_for_diabetic'] == 'Yes'
            
            # Calculate risk score
            risk_factors = sum([high_carbs, high_gi, high_sugar, large_portion, avoid_diabetic])
            
            # Determine safety (0 = unsafe, 1 = safe)
            if risk_factors >= 3:
                targets.append(0)  # Unsafe
            elif risk_factors <= 1:
                targets.append(1)  # Safe
            else:
                # Medium risk - random assignment with bias towards unsafe
                targets.append(np.random.choice([0, 1], p=[0.7, 0.3]))
        
        targets = np.array(targets)
        
        # Create feature names
        feature_names = [
            'age', 'gender', 'weight_kg', 'height_cm', 'bmi',
            'fasting_sugar', 'post_meal_sugar', 'carbs_g', 'protein_g',
            'fat_g', 'fiber_g', 'calories_kcal', 'glycemic_index',
            'time_of_day', 'portion_size'
        ]
        
        # Create DataFrame
        df = pd.DataFrame(features, columns=feature_names)
        df['is_safe'] = targets
        
        print(f"✅ Generated {len(df)} training samples")
        print(f"Safe meals: {sum(targets)} ({sum(targets)/len(targets)*100:.1f}%)")
        print(f"Unsafe meals: {len(targets)-sum(targets)} ({(len(targets)-sum(targets))/len(targets)*100:.1f}%)")
        
        return df, feature_names
        
    except Exception as e:
        print(f"❌ Error loading data: {e}")
        return None, None

def train_model(df, feature_names):
    """Train the Random Forest model"""
    try:
        # Prepare features and target
        X = df[feature_names].values
        y = df['is_safe'].values
        
        # Split the data
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        
        # Scale the features
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_test_scaled = scaler.transform(X_test)
        
        # Train Random Forest
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=15,
            min_samples_split=5,
            min_samples_leaf=2,
            random_state=42,
            class_weight='balanced'
        )
        
        print("🔄 Training Random Forest model...")
        model.fit(X_train_scaled, y_train)
        
        # Make predictions
        y_pred = model.predict(X_test_scaled)
        
        # Calculate accuracy
        accuracy = accuracy_score(y_test, y_pred)
        print(f"✅ Model trained successfully!")
        print(f"Accuracy: {accuracy:.3f}")
        
        # Print classification report
        print("\nClassification Report:")
        print(classification_report(y_test, y_pred, target_names=['Unsafe', 'Safe']))
        
        # Feature importance
        feature_importance = pd.DataFrame({
            'feature': feature_names,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        
        print("\nTop 10 Most Important Features:")
        print(feature_importance.head(10))
        
        return model, scaler, feature_names
        
    except Exception as e:
        print(f"❌ Error training model: {e}")
        return None, None, None

def save_model_artifacts(model, scaler, feature_names):
    """Save trained model and preprocessing artifacts"""
    try:
        joblib.dump(model, 'models/diabetes_model.joblib')
        joblib.dump(scaler, 'models/scaler.joblib')
        joblib.dump(feature_names, 'models/feature_columns.joblib')
        
        print("✅ Model artifacts saved successfully!")
        print("📁 Files saved:")
        print("   - models/diabetes_model.joblib")
        print("   - models/scaler.joblib") 
        print("   - models/feature_columns.joblib")
        
        return True
    except Exception as e:
        print(f"❌ Error saving model: {e}")
        return False

def main():
    """Main training pipeline"""
    print("🚀 Starting DiaLog Model Training Pipeline")
    print("=" * 50)
    
    # Create directories
    create_directories()
    
    # Load and prepare data
    print("\n📊 Loading and preparing data...")
    df, feature_names = load_and_prepare_data()
    if df is None:
        print("❌ Failed to load data. Exiting.")
        return
    
    # Train model
    print("\n🤖 Training machine learning model...")
    model, scaler, feature_names = train_model(df, feature_names)
    if model is None:
        print("❌ Failed to train model. Exiting.")
        return
    
    # Save artifacts
    print("\n💾 Saving model artifacts...")
    if save_model_artifacts(model, scaler, feature_names):
        print("\n🎉 Training completed successfully!")
        print("🚀 You can now start the API server with: uvicorn main:app --reload")
    else:
        print("❌ Failed to save model artifacts.")

if __name__ == "__main__":
    main()

import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

def train_model():
    print("Loading dataset...")
    df = pd.read_csv('data/pred_food.csv')
    
    # Select features for training
    features = [
        'Glycemic Index', 'Calories', 'Carbohydrates', 'Protein', 'Fat',
        'Sodium Content', 'Potassium Content', 'Magnesium Content',
        'Calcium Content', 'Fiber Content'
    ]
    
    X = df[features]
    y = df['Suitable for Diabetes']
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Train model
    print("Training model...")
    model = RandomForestClassifier(
        n_estimators=200,
        max_depth=10,
        random_state=42
    )
    
    # Cross-validation
    cv_scores = cross_val_score(model, X_scaled, y, cv=5)
    print(f"Cross-validation scores: {cv_scores.mean():.4f} (+/- {cv_scores.std() * 2:.4f})")
    
    # Final training
    X_train, X_test, y_train, y_test = train_test_split(X_scaled, y, test_size=0.2)
    model.fit(X_train, y_train)
    
    # Save model and scaler
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/diabetes_model.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    joblib.dump(features, 'models/feature_names.joblib')
    
    print("Model trained and saved successfully!")

if __name__ == "__main__":
    train_model()
        
        # Scale features
        scaler = StandardScaler()
        X_scaled = scaler.fit_transform(X)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_scaled, y, test_size=0.2, random_state=42
        )
        
        # Train model
        print("\nTraining Random Forest model...")
        model = RandomForestClassifier(
            n_estimators=100,
            max_depth=10,
            min_samples_split=5,
            random_state=42
        )
        model.fit(X_train, y_train)
        
        # Evaluate
        train_score = model.score(X_train, y_train)
        test_score = model.score(X_test, y_test)
        print(f"\nModel Performance:")
        print(f"Train accuracy: {train_score:.4f}")
        print(f"Test accuracy: {test_score:.4f}")
        
        # Feature importance
        importance = pd.DataFrame({
            'feature': feature_columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)
        print("\nFeature Importance:")
        print(importance)
        
        # Save model and scaler
        os.makedirs('models', exist_ok=True)
        joblib.dump(model, 'models/diabetes_model.joblib')
        joblib.dump(scaler, 'models/scaler.joblib')
        joblib.dump(feature_columns, 'models/feature_columns.joblib')
        print("\nModel, scaler, and feature columns saved successfully!")
        
    except Exception as e:
        print(f"\nError during model training: {e}")
        if 'df' in locals():
            print("\nActual columns in dataset:", df.columns.tolist())
        raise

if __name__ == "__main__":
    train_model()

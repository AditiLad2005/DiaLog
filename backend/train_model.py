import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
import joblib
import os

def train_model():
    try:
        print("Starting model training...")
        
        # Load data with specific column names
        data_path = 'data/pred_food.csv'
        
        # Define expected column names exactly as in your CSV
        columns = [
            'Food Name',
            'Glycemic Index',
            'Calories',
            'Carbohydrates',
            'Protein',
            'Fat',
            'Suitable for Diabetes',
            'Suitable for Blood Pressure',
            'Sodium Content',
            'Potassium Content',
            'Magnesium Content',
            'Calcium Content',
            'Fiber Content'
        ]
        
        # Read CSV
        df = pd.read_csv(data_path)
        print("Available columns in dataset:", df.columns.tolist())
        
        # Select feature columns (excluding Food Name and target variables)
        feature_columns = [
            'Glycemic Index',
            'Calories',
            'Carbohydrates',
            'Protein',
            'Fat',
            'Sodium Content',
            'Potassium Content',
            'Magnesium Content',
            'Calcium Content',
            'Fiber Content'
        ]
        
        # Prepare features and target
        X = df[feature_columns]
        y = df['Suitable for Diabetes']
        
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

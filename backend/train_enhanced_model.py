import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split, GridSearchCV
from sklearn.ensemble import RandomForestClassifier, RandomForestRegressor
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.metrics import classification_report, mean_absolute_error, r2_score
import joblib
import os

def train_enhanced_models():
    """
    Train both Classification and Regression models
    """
    
    print("=== Training Enhanced ML Models ===")
    
    # Load dataset
    df = pd.read_csv('data/pred_food.csv')
    print(f"Loaded {len(df)} records from dataset")
    
    # Define features for training
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
    
    # Prepare data
    X = df[feature_columns].copy()
    y = df['Suitable for Diabetes'].copy()
    
    # Handle any missing values
    X = X.fillna(X.mean())
    
    print(f"Features shape: {X.shape}")
    print(f"Target distribution: {y.value_counts()}")
    
    # Scale features
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Split data
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42, stratify=y
    )
    
    # Train model
    print("Training Random Forest model...")
    model = RandomForestClassifier(
        n_estimators=100,
        max_depth=15,
        min_samples_split=5,
        random_state=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate model
    train_score = model.score(X_train, y_train)
    test_score = model.score(X_test, y_test)
    
    y_pred = model.predict(X_test)
    
    print(f"\nModel Performance:")
    print(f"Train accuracy: {train_score:.4f}")
    print(f"Test accuracy: {test_score:.4f}")
    print(f"\nClassification Report:")
    print(classification_report(y_test, y_pred))
    
    # Feature importance
    importance_df = pd.DataFrame({
        'feature': feature_columns,
        'importance': model.feature_importances_
    }).sort_values('importance', ascending=False)
    
    print(f"\nTop 5 Most Important Features:")
    print(importance_df.head())
    
    # Save model artifacts
    os.makedirs('models', exist_ok=True)
    
    joblib.dump(model, 'models/diabetes_model.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    joblib.dump(feature_columns, 'models/feature_columns.joblib')
    
    print(f"\nModel saved successfully!")
    return model, scaler, feature_columns

if __name__ == "__main__":
    train_enhanced_models()
        'max_depth': [10, 15, 20],
        'min_samples_split': [2, 5],
        'class_weight': ['balanced']
    }
    
    clf_grid = GridSearchCV(
        RandomForestClassifier(random_state=42),
        clf_params, cv=5, scoring='f1', n_jobs=-1
    )
    clf_grid.fit(X_train_cls, y_train_cls)
    
    best_classifier = clf_grid.best_estimator_
    y_pred_cls = best_classifier.predict(X_test_cls)
    
    print(f"Best Classification Parameters: {clf_grid.best_params_}")
    print(f"Classification Report:")
    print(classification_report(y_test_cls, y_pred_cls, target_names=['Risky', 'Safe']))
    
    # === REGRESSION MODEL ===
    print("\n2. Training Regression Model (Predicted Sugar Spike)")
    
    y_regression = df['predicted_sugar_spike']
    X_train_reg, X_test_reg, y_train_reg, y_test_reg = train_test_split(
        X_scaled, y_regression, test_size=0.2, random_state=42
    )
    
    # Train regression model
    regressor = RandomForestRegressor(n_estimators=200, max_depth=15, random_state=42)
    regressor.fit(X_train_reg, y_train_reg)
    
    y_pred_reg = regressor.predict(X_test_reg)
    mae = mean_absolute_error(y_test_reg, y_pred_reg)
    r2 = r2_score(y_test_reg, y_pred_reg)
    
    print(f"Regression MAE: {mae:.2f} mg/dL")
    print(f"Regression R²: {r2:.3f}")
    
    # Feature importance analysis
    feature_importance = pd.DataFrame({
        'feature': feature_columns,
        'classification_importance': best_classifier.feature_importances_,
        'regression_importance': regressor.feature_importances_
    }).sort_values('classification_importance', ascending=False)
    
    print(f"\nTop 10 Most Important Features:")
    print(feature_importance.head(10))
    
    # === SAVE MODELS ===
    os.makedirs('models', exist_ok=True)
    
    # Save classification model
    joblib.dump(best_classifier, 'models/diabetes_classifier.joblib')
    joblib.dump(regressor, 'models/diabetes_regressor.joblib')
    joblib.dump(scaler, 'models/enhanced_scaler.joblib')
    joblib.dump(feature_columns, 'models/feature_columns.joblib')
    joblib.dump(le_meal_time, 'models/meal_time_encoder.joblib')
    
    # Save metadata
    model_metadata = {
        'classification_score': clf_grid.best_score_,
        'regression_mae': mae,
        'regression_r2': r2,
        'feature_columns': feature_columns,
        'training_samples': len(df),
        'model_version': '2.0'
    }
    
    joblib.dump(model_metadata, 'models/model_metadata.joblib')
    
    print(f"\n=== Models Saved Successfully ===")
    print(f"Classification Model: models/diabetes_classifier.joblib")
    print(f"Regression Model: models/diabetes_regressor.joblib")
    
    return best_classifier, regressor, scaler

if __name__ == "__main__":
    # Step 1: Generate enhanced dataset
    from enhance_dataset import enhance_dataset
    enhance_dataset()
    
    # Step 2: Train models
    classifier, regressor, scaler = train_enhanced_models()

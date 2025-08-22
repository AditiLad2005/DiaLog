import pandas as pd
import joblib
import os
import sys

def test_model_loading():
    """Test if the model and related files can be loaded correctly"""
    print("=== Testing Model Loading ===")
    
    # Check if model files exist
    model_path = 'models/diabetes_model.joblib'
    if not os.path.exists(model_path):
        print(f"❌ Model file not found at {model_path}")
        return False
        
    try:
        # Try to load the model
        model = joblib.load(model_path)
        print(f"✅ Model loaded successfully! Type: {type(model).__name__}")
        
        # Try to load other artifacts
        scaler = joblib.load('models/scaler.joblib')
        feature_columns = joblib.load('models/feature_columns.joblib')
        
        print(f"✅ Scaler loaded successfully! Type: {type(scaler).__name__}")
        print(f"✅ Feature columns loaded: {feature_columns}")
        
        # Try to load data
        food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
        print(f"✅ Food dataset loaded with {len(food_df)} items")
        
        return True
    except Exception as e:
        print(f"❌ Error during loading: {str(e)}")
        return False

if __name__ == "__main__":
    # Change to backend directory if not already there
    if not os.path.exists('models'):
        # Try to find the backend directory
        if os.path.exists('backend/models'):
            os.chdir('backend')
        else:
            print("❌ Can't find the models directory. Run this script from the project root or backend directory.")
            sys.exit(1)
    
    if test_model_loading():
        print("\n✅ All model artifacts loaded successfully. Model is ready to use!")
        sys.exit(0)
    else:
        print("\n❌ There were errors loading the model. Please check and fix the issues.")
        sys.exit(1)

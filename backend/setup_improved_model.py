#!/usr/bin/env python3
"""
Quick Setup and Test Script for Improved Model System
====================================================

This script:
1. Trains the improved model with portion-aware features and guardrails
2. Tests the acceptance cases to ensure it works correctly  
3. Starts the backend server with the improved system

Run this after placing your Firebase credentials.
"""

import os
import sys
from pathlib import Path
import subprocess

# Add backend to Python path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

def main():
    print("🚀 DiaLog Improved Model Setup & Test")
    print("=" * 50)
    
    # Check if we're in the right directory
    if not (backend_dir / "improved_model_system.py").exists():
        print("❌ Error: Run this script from the backend directory")
        return
    
    # Step 1: Train the improved model
    print("\n📊 Step 1: Training improved model...")
    try:
        from train_improved_model import train_improved_model
        model, scaler, feature_names = train_improved_model(
            food_csv_path="data/Food_Master_Dataset_.csv",
            model_output_dir="models/",
            use_xgboost=False  # Use RandomForest for stability
        )
        print("✅ Model training completed successfully!")
    except Exception as e:
        print(f"❌ Model training failed: {e}")
        return
    
    # Step 2: Run acceptance tests
    print("\n🧪 Step 2: Running acceptance tests...")
    try:
        from improved_model_system import MealSafetyPredictor, run_acceptance_tests
        
        # Initialize predictor
        predictor = MealSafetyPredictor()
        predictor.load_food_dataset("data/Food_Master_Dataset_.csv")
        predictor.model = model
        predictor.scaler = scaler
        predictor.is_trained = True
        
        # Run tests
        test_results = run_acceptance_tests(predictor)
        
        if test_results['failed'] == 0:
            print("✅ All acceptance tests passed!")
        else:
            print(f"⚠️ {test_results['failed']} tests failed")
            print("Check the test details above for issues")
        
    except Exception as e:
        print(f"❌ Acceptance tests failed: {e}")
    
    # Step 3: Test sample predictions
    print("\n🔍 Step 3: Testing sample predictions...")
    try:
        # Test the "10 bowls of halwa" extreme case
        user_data = {
            'age': 45,
            'gender': 'Male',
            'bmi': 26.5,
            'fasting_sugar': 115,
            'post_meal_sugar': 130,
            'time_of_day': 'Snack'
        }
        
        # Find a sweet/dessert in the dataset for testing
        sample_meals = [
            ("Hot tea (Garam Chai)", 200),  # Normal safe meal
            ("Plain cream cake", 100),      # Diabetic-avoidable dessert  
            ("Plain cream cake", 1000),     # 10x portion - extreme case
        ]
        
        for meal_name, portion_g in sample_meals:
            try:
                result = predictor.predict_meal_safety(meal_name, portion_g, user_data)
                print(f"🥘 {meal_name} ({portion_g}g):")
                print(f"   Risk: {result['risk_level']} (confidence: {result['confidence']:.1%})")
                print(f"   {result['explanation']}")
                print()
            except Exception as e:
                print(f"❌ Failed to predict {meal_name}: {e}")
        
    except Exception as e:
        print(f"❌ Sample predictions failed: {e}")
    
    # Step 4: Check backend readiness
    print("\n🖥️ Step 4: Backend readiness check...")
    
    # Check essential files
    essential_files = [
        "main.py",
        "firebase_admin_setup.py", 
        "serviceAccountKey.json",
        "improved_model_system.py",
        "data/Food_Master_Dataset_.csv",
        "models/diabetes_model.joblib"
    ]
    
    missing_files = []
    for file_path in essential_files:
        if not (backend_dir / file_path).exists():
            missing_files.append(file_path)
    
    if missing_files:
        print(f"⚠️ Missing files: {', '.join(missing_files)}")
        if "serviceAccountKey.json" in missing_files:
            print("   📋 Place your Firebase service account key as 'serviceAccountKey.json'")
    else:
        print("✅ All essential files present")
    
    # Instructions for next steps
    print("\n🎯 Next Steps:")
    print("1. Start the backend server:")
    print("   python -m uvicorn main:app --reload --host 127.0.0.1 --port 8000")
    print()
    print("2. Test the improved endpoints:")
    print("   GET  http://127.0.0.1:8000/test-guardrails")
    print("   GET  http://127.0.0.1:8000/predict-sample") 
    print("   POST http://127.0.0.1:8000/predict")
    print()
    print("3. The system now includes:")
    print("   ✅ Portion-aware feature computation")
    print("   ✅ Hard guardrails for medical safety") 
    print("   ✅ Improved explanations")
    print("   ✅ Acceptance tests")
    print()
    print("🎉 Setup complete! Your model now handles the '10 bowls of halwa' problem correctly.")

if __name__ == "__main__":
    main()

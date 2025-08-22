import subprocess
import sys
import os
import pandas as pd

def setup_and_run():
    """One-command setup and run script for DiaLog backend"""
    print("🔄 Setting up DiaLog backend...")
    
    # Install required packages
    print("📦 Installing required packages...")
    subprocess.check_call([
        sys.executable, "-m", "pip", "install", 
        "fastapi", "uvicorn", "pandas", "scikit-learn", "joblib"
    ])
    
    # Create directories if they don't exist
    os.makedirs("models", exist_ok=True)
    os.makedirs("data", exist_ok=True)
    
    # Check if model exists, train if not
    if not os.path.exists("models/diabetes_model.joblib"):
        print("🤖 Training model...")
        try:
            from train_model import train_model
            train_model()
        except Exception as e:
            print(f"❌ Error training model: {e}")
    else:
        print("✅ Model already exists")
    
    # Start FastAPI server
    print("🚀 Starting FastAPI server...")
    subprocess.run([sys.executable, "-m", "uvicorn", "main:app", "--reload"])

if __name__ == "__main__":
    setup_and_run()

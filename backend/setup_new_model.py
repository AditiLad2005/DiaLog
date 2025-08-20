import os
import subprocess
import sys

def setup_diabetes_model():
    """Complete setup script for the new diabetes model"""
    print("🔄 Setting up DiaLog with new Food Master Dataset...")
    
    # Create necessary directories
    os.makedirs("models", exist_ok=True)
    os.makedirs("data", exist_ok=True)
    
    print("📂 Directories created")
    
    # Install required packages
    print("📦 Installing required packages...")
    packages = [
        "fastapi", "uvicorn[standard]", "pandas", "scikit-learn", 
        "joblib", "numpy", "python-multipart"
    ]
    
    for package in packages:
        subprocess.check_call([sys.executable, "-m", "pip", "install", package])
    
    print("✅ Packages installed")
    
    # Check if Food Master Dataset exists
    if not os.path.exists("data/Food_Master_Dataset_.csv"):
        print("❌ Food_Master_Dataset_.csv not found in data/ directory!")
        print("Please add your Food_Master_Dataset_.csv file to the data/ directory")
        return False
    
    print("📊 Food Master Dataset found")
    
    # Train the model
    print("🤖 Training the new model...")
    try:
        from train_model import train_model
        model, scaler, features = train_model()
        if model is None:
            print("❌ Model training failed!")
            return False
        print("✅ Model trained successfully!")
    except Exception as e:
        print(f"❌ Training error: {e}")
        return False
    
    print("🚀 Setup complete! You can now run:")
    print("   python -m uvicorn main:app --reload")
    return True

if __name__ == "__main__":
    success = setup_diabetes_model()
    if success:
        print("\n🎉 DiaLog is ready to use!")
    else:
        print("\n❌ Setup failed. Please check the errors above.")

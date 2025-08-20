# backend/main.py

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import numpy as np
import os
from typing import Optional, List, Dict, Any
from pathlib import Path

# Create FastAPI app
app = FastAPI(
    title="DiaLog API - Diabetes Meal Safety Predictor",
    description="""
    ## DiaLog API for Diabetes Meal Safety Prediction

    This API provides endpoints to:
    * 🍽️ **Predict meal safety** for diabetic users
    * 📊 **Get nutritional information** for foods
    * 🥗 **Fetch available foods** from the database
    * ❤️ **Check API health** and model status

    ### Model Information
    - Uses Random Forest Classifier trained on food nutritional data
    - Considers user BMI, sugar levels, and meal timing
    - Provides confidence scores and recommendations

    ### Usage
    1. Check `/health` to verify API is running
    2. Use `/foods` to get available food options
    3. Send meal data to `/predict` for safety analysis
    """,
    version="2.0.0",
    contact={
        "name": "DiaLog Team",
        "email": "team@dialog.com",
    },
    license_info={
        "name": "MIT",
        "url": "https://opensource.org/licenses/MIT",
    },
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Data and model paths
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = BASE_DIR / "data"
MODEL_DIR = BASE_DIR / "models"

# Load the food dataset directly
try:
    food_df = pd.read_csv(DATA_DIR / "Food_Master_Dataset_.csv")
    print(f"Loaded {len(food_df)} foods from dataset")
except Exception as e:
    print(f"Error loading food dataset: {e}")
    food_df = pd.DataFrame()

# Global variables for model artifacts
model = None
scaler = None
feature_columns = None
gender_encoder = None
meal_time_encoder = None

# Load models and data
def load_model_artifacts():
    global model, scaler, feature_columns, gender_encoder, meal_time_encoder
    
    try:
        model = joblib.load(MODEL_DIR / "diabetes_model.joblib")
        scaler = joblib.load(MODEL_DIR / "scaler.joblib")
        feature_columns = joblib.load(MODEL_DIR / "feature_columns.joblib")
        gender_encoder = joblib.load(MODEL_DIR / "gender_encoder.joblib")
        meal_time_encoder = joblib.load(MODEL_DIR / "meal_time_encoder.joblib")
        
        print("✅ All model artifacts loaded successfully!")
        return True
    except Exception as e:
        print(f"❌ Error loading model: {str(e)}")
        return False

# Load on startup
load_model_artifacts()

class MealLogInput(BaseModel):
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    fasting_sugar: float
    post_meal_sugar: float
    meal_taken: str
    portion_size: float
    portion_unit: str
    time_of_day: str

class PredictionResponse(BaseModel):
    is_safe: bool
    confidence: float
    risk_level: str
    bmi: float
    portion_analysis: dict
    nutritional_info: dict
    recommendations: list
    message: str
    meal_taken: str = ""

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """Calculate BMI"""
    return weight_kg / ((height_cm / 100) ** 2)

def convert_portion_to_grams(portion_size: float, portion_unit: str, serving_size_g: float) -> float:
    """Convert portion to grams based on unit"""
    unit_conversions = {
        'cup': serving_size_g * 1.0,      # 1 cup = 1 serving
        'bowl': serving_size_g * 1.5,     # 1 bowl = 1.5 servings
        'spoon': serving_size_g * 0.1,    # 1 spoon = 0.1 serving
        'g': 1.0,                         # already in grams
        'serving': serving_size_g          # 1 serving = serving_size_g
    }
    
    if portion_unit == 'g':
        return portion_size
    
    base_grams = unit_conversions.get(portion_unit.lower(), serving_size_g)
    return portion_size * base_grams

@app.get("/", 
         summary="Root endpoint", 
         description="Basic API information and status")
def root():
    return {
        "status": "DiaLog API Running!",
        "version": "2.0.0",
        "model_loaded": model is not None,
        "food_items_available": len(food_df) if food_df is not None else 0,
        "endpoints": {
            "health": "/health - Check API health",
            "foods": "/foods - Get available foods",
            "predict": "/predict - Predict meal safety",
            "docs": "/docs - API documentation"
        }
    }

@app.get("/health", response_model=HealthResponse, tags=["General"])
def health_check():
    """Check if the API and models are properly loaded."""
    model_loaded = model is not None and scaler is not None and feature_columns is not None
    foods_loaded = len(food_df) if not food_df.empty else 0
    
    return {
        "status": "healthy" if model_loaded else "degraded",
        "message": "API is running normally" if model_loaded else "Model failed to load",
        "model_loaded": model_loaded,
        "foods_loaded": foods_loaded,
        "version": "1.0.0"
    }

@app.get("/foods", tags=["Food"])
def get_foods():
    """Get all available foods from the dataset."""
    if food_df.empty:
        raise HTTPException(status_code=500, detail="Food database not loaded")
    
    # Return all unique food names alphabetically
    try:
        food_list = sorted(food_df['dish_name'].unique().tolist())
        return {
            "success": True,
            "count": len(food_list),
            "foods": food_list,
            "message": f"Retrieved {len(food_list)} foods"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve foods: {str(e)}")

@app.get("/food/{name}", tags=["Food"])
def get_food(name: str):
    """Get details about a specific food item."""
    if food_df.empty:
        raise HTTPException(status_code=500, detail="Food database not loaded")
    
    # Case-insensitive exact match search first
    food_info = food_df[food_df['dish_name'].str.lower() == name.lower()]
    
    # If not found, try partial match
    if len(food_info) == 0:
        food_info = food_df[food_df['dish_name'].str.lower().str.contains(name.lower())]
    
    if len(food_info) == 0:
        raise HTTPException(status_code=404, detail=f"Food '{name}' not found in database")
    
    # Get the first matching food (best match)
    food_data = food_info.iloc[0].to_dict()
    
    # Remove unnecessary fields for cleaner response
    if 'avoid_for_diabetic' in food_data:
        food_data['avoid_for_diabetic'] = food_data['avoid_for_diabetic'].lower() == 'yes'
    
    return {
        "success": True,
        "food": food_data
    }

@app.post("/predict", tags=["Prediction"])
async def predict_meal(request: MealLogInput):
    """Predict if a meal is diabetes-friendly based on user data and food."""
    if model is None or scaler is None or feature_columns is None:
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    if food_df.empty:
        raise HTTPException(status_code=500, detail="Food database not loaded")
    
    # Find the food in the database (case insensitive)
    food_info = food_df[food_df['dish_name'].str.lower() == request.meal_taken.lower()]
    
    # If exact match not found, try partial match
    if len(food_info) == 0:
        food_info = food_df[food_df['dish_name'].str.lower().str.contains(request.meal_taken.lower())]
        
        if len(food_info) > 0:
            # Use the first match and inform the user
            print(f"Using closest match: {food_info.iloc[0]['dish_name']} for query: {request.meal_taken}")
    
    if len(food_info) == 0:
        raise HTTPException(status_code=404, detail=f"Food '{request.meal_taken}' not found in database")
    
    # Get the first matching food
    food_data = food_info.iloc[0]
    
    # Calculate BMI
    bmi = request.weight_kg / ((request.height_cm / 100) ** 2)
    
    # Prepare input features in the correct order as used during training
    input_data = {
        'age': request.age,
        'gender': request.gender,
        'bmi': bmi,
        'fasting_sugar': request.fasting_sugar,
        'post_meal_sugar': request.post_meal_sugar,
        'glycemic_index': food_data['glycemic_index'],
        'glycemic_load': food_data['glycemic_load'],
        'carbs_g': food_data['carbs_g'] * request.portion_size,
        'protein_g': food_data['protein_g'] * request.portion_size,
        'fat_g': food_data['fat_g'] * request.portion_size,
        'fiber_g': food_data['fiber_g'] * request.portion_size,
        'calories_kcal': food_data['calories_kcal'] * request.portion_size,
        'time_of_day': request.time_of_day,
        'portion_size': request.portion_size
    }
    
    # Create a DataFrame with the correct feature order
    input_df = pd.DataFrame([{col: input_data.get(col, 0) for col in feature_columns}])
    
    # Scale the input features
    scaled_input = scaler.transform(input_df)
    
    # Get prediction and probability
    prediction = model.predict(scaled_input)[0]
    probabilities = model.predict_proba(scaled_input)[0]
    confidence = max(probabilities)
    
    # Determine risk level based on confidence and prediction
    if prediction == 1:  # Safe
        if confidence > 0.85:
            risk_level = "Low Risk"
        elif confidence > 0.70:
            risk_level = "Moderate Risk"
        else:
            risk_level = "Moderate-High Risk"
    else:  # Not safe
        if confidence > 0.85:
            risk_level = "High Risk"
        elif confidence > 0.70:
            risk_level = "Moderate-High Risk"
        else:
            risk_level = "Moderate Risk"
    
    # Create a personalized message
    if prediction == 1:
        if confidence > 0.85:
            message = f"This {food_data['dish_name']} appears safe for your current blood sugar levels. Maintain portion control."
        else:
            message = f"This {food_data['dish_name']} is likely acceptable, but consider reducing the portion size or pairing with fiber-rich vegetables."
    else:
        if confidence > 0.85:
            message = f"This {food_data['dish_name']} may significantly impact your blood sugar levels. Consider an alternative or reduce portion."
        else:
            message = f"This {food_data['dish_name']} may affect your blood sugar levels. Consider a smaller portion or balance with protein and fiber."
    
    # Include nutritional information for the specific portion
    nutritional_info = {
        "calories": food_data['calories_kcal'] * request.portion_size,
        "carbs_g": food_data['carbs_g'] * request.portion_size,
        "protein_g": food_data['protein_g'] * request.portion_size,
        "fat_g": food_data['fat_g'] * request.portion_size,
        "fiber_g": food_data['fiber_g'] * request.portion_size
    }
    
    # Get recommendations based on food properties
    recommendations = []
    
    if not prediction:
        # If not safe, recommend alternatives
        if 'recommended_alternatives' in food_data and isinstance(food_data['recommended_alternatives'], str):
            alt_foods = [alt.strip() for alt in food_data['recommended_alternatives'].split(',')]
            
            for alt in alt_foods[:3]:  # Limit to top 3 alternatives
                alt_info = food_df[food_df['dish_name'] == alt]
                if len(alt_info) > 0:
                    alt_data = alt_info.iloc[0]
                    recommendations.append({
                        "name": alt,
                        "reason": f"Lower glycemic index ({alt_data['glycemic_index']} vs {food_data['glycemic_index']})"
                    })
    
    # Add general recommendations
    if food_data['fiber_g'] < 2:
        recommendations.append({
            "name": "Add a side salad",
            "reason": "Increase fiber intake to slow sugar absorption"
        })
    
    if request.time_of_day == "Dinner" and food_data['carbs_g'] > 30:
        recommendations.append({
            "name": "Consider smaller portion for dinner",
            "reason": "High carb meals are better consumed earlier in the day"
        })
    
    # Return the prediction result
    return {
        "is_safe": bool(prediction),
        "confidence": float(confidence),
        "risk_level": risk_level,
        "message": message,
        "bmi": round(bmi, 1),
        "nutritional_info": nutritional_info,
        "recommendations": recommendations
    }

# Run with: uvicorn main:app --reload
        
        for name, row in safe_foods.iterrows():
            if name != food_info.name:
                recommendations.append({
                    "name": name,
                    "reason": f"Lower GI ({row['glycemic_index']}) alternative"
                })
    
    return recommendations[:5]  # Limit to 5 recommendations

@app.get("/health",
         summary="Health check",
         description="Check API health status and model loading status")
def health_check():
    return {
        "status": "healthy",
        "timestamp": pd.Timestamp.now().isoformat(),
        "model_loaded": model is not None,
        "food_database_loaded": food_df is not None,
        "total_foods": len(food_df) if food_df is not None else 0,
        "model_features": len(feature_columns) if feature_columns else 0,
        "encoders_loaded": {
            "gender": gender_encoder is not None,
            "meal_time": meal_time_encoder is not None
        }
    }

@app.get("/foods")
async def get_foods():
    """Get all available foods from the trained model dataset"""
    try:
        # Return ALL food items from the Food Master Dataset
        food_list = food_df['dish_name'].unique().tolist()
        food_count = len(food_list)
        
        return {
            "success": True,
            "count": food_count,
            "foods": food_list,
            "message": f"Retrieved all {food_count} food items from trained model"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve foods: {str(e)}")

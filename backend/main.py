# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List, Optional
import joblib
import os

app = FastAPI(
    title="DiaLog API",
    description="API for diabetes-friendly meal planning and nutritional analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load model and dependencies
MODEL_PATH = 'models/diabetes_model.joblib'
SCALER_PATH = 'models/scaler.joblib'
FEATURES_PATH = 'models/feature_columns.joblib'

try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_columns = joblib.load(FEATURES_PATH)
except Exception as e:
    print(f"Error loading model: {e}")
    model, scaler, feature_columns = None, None, None

class FoodInput(BaseModel):
    food_name: str = Field(..., description="Name of the food item")
    glycemic_index: float = Field(..., ge=0, description="Glycemic Index of the food")
    calories: float = Field(..., ge=0, description="Calories per serving")
    carbohydrates: float = Field(..., ge=0, description="Carbohydrates content in grams")
    protein: float = Field(..., ge=0, description="Protein content in grams")
    fat: float = Field(..., ge=0, description="Fat content in grams")
    sodium_content: float = Field(..., ge=0, description="Sodium content in mg")
    potassium_content: float = Field(..., ge=0, description="Potassium content in mg")
    magnesium_content: float = Field(..., ge=0, description="Magnesium content in mg")
    calcium_content: float = Field(..., ge=0, description="Calcium content in mg")
    fiber_content: float = Field(..., ge=0, description="Fiber content in grams")

class PredictionResponse(BaseModel):
    food_name: str
    is_diabetes_friendly: bool
    confidence: float
    recommendations: List[str]

@app.get("/", tags=["General"])
async def root():
    """
    Root endpoint - Check if API is running
    """
    return {"status": "healthy", "message": "Welcome to DiaLog API"}

@app.post("/predict", response_model=PredictionResponse, tags=["Predictions"])
async def predict_diabetes_friendly(food: FoodInput):
    """
    Predict if a food item is diabetes-friendly based on its nutritional content
    """
    if not all([model, scaler, feature_columns]):
        raise HTTPException(status_code=500, detail="Model not loaded")
    
    try:
        features = [[
            food.glycemic_index,
            food.calories,
            food.carbohydrates,
            food.protein,
            food.fat,
            food.sodium_content,
            food.potassium_content,
            food.magnesium_content,
            food.calcium_content,
            food.fiber_content
        ]]
        
        features_scaled = scaler.transform(features)
        prediction = model.predict(features_scaled)
        probability = model.predict_proba(features_scaled)[0]
        
        # Generate recommendations based on nutritional values
        recommendations = []
        if food.glycemic_index > 55:
            recommendations.append("Consider reducing portion size due to high glycemic index")
        if food.carbohydrates > 30:
            recommendations.append("High in carbohydrates - monitor blood sugar closely")
        if food.fiber_content < 3:
            recommendations.append("Consider adding fiber-rich sides to slow sugar absorption")
        
        return PredictionResponse(
            food_name=food.food_name,
            is_diabetes_friendly=bool(prediction[0]),
            confidence=float(max(probability)),
            recommendations=recommendations
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health", tags=["General"])
async def health_check():
    """
    Check the health status of the API and model
    """
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "features_available": feature_columns is not None
    }

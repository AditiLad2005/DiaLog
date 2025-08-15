# FastAPI app for Diabetes Meal Planner
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, create_model
from typing import List, Optional
from datetime import datetime
import joblib
import os
from typing import List, Dict

app = FastAPI(
    title="DiaLog API",
    description="API for Diabetes Meal Planning and Blood Sugar Tracking",
    version="1.0.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Model and scaler loading with error handling
MODEL_PATH = os.path.join('models', 'diabetes_model.joblib')
SCALER_PATH = os.path.join('models', 'scaler.joblib')
FEATURES_PATH = os.path.join('models', 'feature_columns.joblib')

try:
    model = joblib.load(MODEL_PATH) if os.path.exists(MODEL_PATH) else None
    scaler = joblib.load(SCALER_PATH) if os.path.exists(SCALER_PATH) else None
    feature_columns = joblib.load(FEATURES_PATH) if os.path.exists(FEATURES_PATH) else None
except Exception as e:
    print(f"Error loading model or scaler: {e}")
    model = None
    scaler = None
    feature_columns = None

# Data Models
class MealBase(BaseModel):
    name: str
    carbs: float
    protein: float
    fat: float
    calories: Optional[float] = None
    
class GlucoseReading(BaseModel):
    value: float
    timestamp: datetime
    meal_related: bool = False
    notes: Optional[str] = None

class PredictionResponse(BaseModel):
    risk_level: str
    probability: float
    recommendations: List[str]

# Dynamically create input model based on features
FoodInput = create_model('FoodInput', **{name: (float, ...) for name in feature_columns}) if feature_columns else None

# API Endpoints
@app.get("/")
def read_root():
    """
    Root endpoint to check API status
    """
    return {"status": "healthy", "service": "DiaLog API"}

@app.get("/test")
def test_endpoint():
    return {"status": "success", "data": "API is working!"}

@app.post('/predict', response_model=PredictionResponse)
async def predict_risk(meal: MealBase):
    """
    Predicts diabetes risk based on meal composition
    """
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded. Please train the model first.")
    
    try:
        # Create features array from request
        features = [[meal.carbs, meal.protein, meal.fat]]
        prediction = model.predict(features)
        risk_level = "low"  # Placeholder
        probability = 0.2    # Placeholder
        recommendations = ["Consider reducing carbs", "Add more fiber"]  # Placeholder
        return {
            "risk_level": risk_level,
            "probability": probability,
            "recommendations": recommendations
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post('/glucose', response_model=GlucoseReading)
async def log_glucose(reading: GlucoseReading):
    """
    Log a blood glucose reading
    """
    return reading

@app.get("/meals/recommended", response_model=List[MealBase])
async def get_recommendations():
    """
    Get personalized meal recommendations
    """
    return [
        {"name": "Oatmeal with berries", "carbs": 30, "protein": 5, "fat": 3, "calories": 150},
        {"name": "Grilled chicken salad", "carbs": 15, "protein": 25, "fat": 10, "calories": 250}
    ]

@app.post('/recommend')
def recommend():
    # TODO: Implement recommendation logic
    return {"result": "Recommendation endpoint not yet implemented"}

@app.post('/log')
def log():
    # TODO: Implement logging logic
    return {"result": "Log endpoint not yet implemented"}

@app.post("/predict")
async def predict_diabetes_friendly(food: FoodInput):
    """
    Predicts diabetes risk based on detailed food input
    """
    if model is None or scaler is None:
        raise HTTPException(status_code=500, detail="Model or scaler not loaded")
    
    # Extract features in the correct order
    features = [[getattr(food, name) for name in feature_columns]]
    
    # Scale features
    features_scaled = scaler.transform(features)
    
    # Make prediction
    prediction = model.predict(features_scaled)
    probability = model.predict_proba(features_scaled)[0]
    
    return {
        "is_diabetes_friendly": bool(prediction[0]),
        "confidence": float(max(probability)),
        "probability": float(probability[1])
    }

@app.get("/features")
async def get_features():
    """Return the list of features needed for prediction"""
    return {"features": feature_columns}
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

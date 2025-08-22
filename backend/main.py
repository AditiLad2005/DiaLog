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
    food_df.set_index('dish_name', inplace=True)
except Exception as e:
    print(f"Error loading food dataset: {e}")
    food_df = pd.DataFrame()

# Global variables for model artifacts
model = None
scaler = None
feature_columns = None

# Load model and artifacts
def load_model_artifacts():
    global model, scaler, feature_columns
    try:
        if os.path.exists(MODEL_DIR / "diabetes_model.joblib"):
            model = joblib.load(MODEL_DIR / "diabetes_model.joblib")
            scaler = joblib.load(MODEL_DIR / "scaler.joblib")
            feature_columns = joblib.load(MODEL_DIR / "feature_columns.joblib")
            print("✅ Model artifacts loaded successfully")
            return True
        else:
            print("❌ Model files not found. Please run train_model.py first")
            return False
    except Exception as e:
        print(f"❌ Error loading model: {e}")
        return False

# Pydantic models for request/response
class MealRequest(BaseModel):
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    fasting_sugar: float
    post_meal_sugar: float
    meal_taken: str
    time_of_day: str
    portion_size: float
    portion_unit: str

class NutritionalInfo(BaseModel):
    calories: float
    carbs_g: float
    protein_g: float
    fat_g: float
    fiber_g: float

class Recommendation(BaseModel):
    name: str
    reason: str

class PredictionResponse(BaseModel):
    is_safe: bool
    confidence: float
    risk_level: str
    message: str
    bmi: float
    nutritional_info: Optional[NutritionalInfo] = None
    recommendations: Optional[List[Recommendation]] = None

class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    foods_count: int
    version: str

class FoodsResponse(BaseModel):
    foods: List[str]
    count: int

# Load model on startup
@app.on_event("startup")
async def startup_event():
    load_model_artifacts()

# API Endpoints
@app.get("/", response_model=Dict[str, str])
async def root():
    return {
        "message": "Welcome to DiaLog API - Diabetes Meal Safety Predictor",
        "version": "2.0.0",
        "docs": "/docs",
        "health": "/health"
    }

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy" if model is not None else "model_not_loaded",
        model_loaded=model is not None,
        foods_count=len(food_df),
        version="2.0.0"
    )

@app.get("/foods", response_model=FoodsResponse)
async def get_foods(search: Optional[str] = Query(None, description="Search term to filter foods")):
    try:
        if food_df.empty:
            raise HTTPException(status_code=500, detail="Food database not loaded")
        
        foods_list = food_df.index.tolist()
        
        if search:
            search_lower = search.lower()
            foods_list = [food for food in foods_list if search_lower in food.lower()]
        
        return FoodsResponse(foods=sorted(foods_list), count=len(foods_list))
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching foods: {str(e)}")

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    height_m = height_cm / 100
    return round(weight_kg / (height_m ** 2), 1)

def get_nutritional_info(food_name: str, portion_size: float) -> NutritionalInfo:
    if food_name not in food_df.index:
        return None
    
    food_row = food_df.loc[food_name]
    
    # Calculate nutritional values based on portion size
    # Assuming the dataset values are per 100g serving
    multiplier = portion_size / 1.0  # Adjust based on your portion unit logic
    
    return NutritionalInfo(
        calories=float(food_row.get('calories_kcal', 0)) * multiplier,
        carbs_g=float(food_row.get('carbs_g', 0)) * multiplier,
        protein_g=float(food_row.get('protein_g', 0)) * multiplier,
        fat_g=float(food_row.get('fat_g', 0)) * multiplier,
        fiber_g=float(food_row.get('fiber_g', 0)) * multiplier
    )

def generate_recommendations(food_name: str, is_safe: bool, bmi: float) -> List[Recommendation]:
    recommendations = []
    
    if not is_safe:
        recommendations.append(Recommendation(
            name="Portion Control",
            reason="Consider reducing portion size by 25-30% to minimize blood sugar impact"
        ))
        
        recommendations.append(Recommendation(
            name="Add Fiber",
            reason="Include high-fiber vegetables or salad to slow sugar absorption"
        ))
    
    if bmi > 25:
        recommendations.append(Recommendation(
            name="Weight Management",
            reason="Consider lower calorie alternatives to support healthy weight"
        ))
    
    # Add exercise recommendation
    recommendations.append(Recommendation(
        name="Post-meal Activity",
        reason="Take a 10-15 minute walk after eating to help regulate blood sugar"
    ))
    
    return recommendations

@app.post("/predict", response_model=PredictionResponse)
async def predict_meal_safety(request: MealRequest):
    try:
        if model is None:
            raise HTTPException(status_code=503, detail="Model not loaded. Please check server configuration.")
        
        if food_df.empty:
            raise HTTPException(status_code=500, detail="Food database not loaded")
        
        # Validate food exists in database
        if request.meal_taken not in food_df.index:
            available_foods = [food for food in food_df.index if request.meal_taken.lower() in food.lower()][:5]
            suggestion_text = f"Did you mean: {', '.join(available_foods)}" if available_foods else "Please check the food name."
            raise HTTPException(
                status_code=400, 
                detail=f"Food '{request.meal_taken}' not found in database. {suggestion_text}"
            )
        
        # Calculate BMI
        bmi = calculate_bmi(request.weight_kg, request.height_cm)
        
        # Get food nutritional data
        food_row = food_df.loc[request.meal_taken]
        
        # Prepare features for prediction
        # Map categorical variables
        gender_map = {'Male': 1, 'Female': 0}
        time_map = {'Breakfast': 0, 'Lunch': 1, 'Dinner': 2, 'Snack': 3}
        
        # Create feature array matching training data
        features = np.array([[
            request.age,
            gender_map.get(request.gender, 0),
            request.weight_kg,
            request.height_cm,
            bmi,
            request.fasting_sugar,
            request.post_meal_sugar,
            float(food_row.get('carbs_g', 0)),
            float(food_row.get('protein_g', 0)),
            float(food_row.get('fat_g', 0)),
            float(food_row.get('fiber_g', 0)),
            float(food_row.get('calories_kcal', 0)),
            float(food_row.get('glycemic_index', 50)),
            time_map.get(request.time_of_day, 0),
            request.portion_size
        ]])
        
        # Scale features
        if scaler is not None:
            features_scaled = scaler.transform(features)
        else:
            features_scaled = features
        
        # Make prediction
        prediction = model.predict(features_scaled)[0]
        prediction_proba = model.predict_proba(features_scaled)[0]
        
        # Determine safety and confidence
        is_safe = prediction == 1
        confidence = float(max(prediction_proba))
        
        # Determine risk level
        if confidence > 0.8:
            risk_level = "Low" if is_safe else "High"
        elif confidence > 0.6:
            risk_level = "Medium"
        else:
            risk_level = "Uncertain"
        
        # Generate message
        safety_text = "safe" if is_safe else "requires caution"
        message = f"This meal is predicted to be {safety_text} for your current health profile. Confidence: {confidence:.1%}"
        
        # Get nutritional information
        nutritional_info = get_nutritional_info(request.meal_taken, request.portion_size)
        
        # Generate recommendations
        recommendations = generate_recommendations(request.meal_taken, is_safe, bmi)
        
        return PredictionResponse(
            is_safe=is_safe,
            confidence=confidence,
            risk_level=risk_level,
            message=message,
            bmi=bmi,
            nutritional_info=nutritional_info,
            recommendations=recommendations
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

@app.get("/food/{food_name}")
async def get_food_details(food_name: str):
    try:
        if food_df.empty:
            raise HTTPException(status_code=500, detail="Food database not loaded")
        
        if food_name not in food_df.index:
            raise HTTPException(status_code=404, detail="Food not found")
        
        food_row = food_df.loc[food_name]
        return {
            "name": food_name,
            "nutritional_info": {
                "calories_per_100g": float(food_row.get('calories_kcal', 0)),
                "carbs_g": float(food_row.get('carbs_g', 0)),
                "protein_g": float(food_row.get('protein_g', 0)),
                "fat_g": float(food_row.get('fat_g', 0)),
                "fiber_g": float(food_row.get('fiber_g', 0)),
                "glycemic_index": float(food_row.get('glycemic_index', 50))
            },
            "safety_info": {
                "avoid_for_diabetic": food_row.get('avoid_for_diabetic', 'No'),
                "safe_threshold_sugar": float(food_row.get('safe_threshold_sugar', 110)),
                "risky_threshold_sugar": float(food_row.get('risky_threshold_sugar', 140))
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching food details: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
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

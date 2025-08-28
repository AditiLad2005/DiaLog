# --- Firestore Backend Logging ---
from firebase_admin_setup import db as firestore_db, firebase_initialized
from firebase_admin import firestore
from pydantic import BaseModel
from improved_model_system import MealSafetyPredictor, RiskLevel, run_acceptance_tests


# Pydantic model for meal log

# Accepts a list of meals per log
class MealLogMeal(BaseModel):
    meal_name: str
    quantity: int
    unit: str
    time_of_day: str

class MealLog(BaseModel):
    userId: str
    sugar_level_fasting: float
    sugar_level_post: float
    meals: list[MealLogMeal]
    createdAt: str = None  # Optional, can be set by backend




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
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Create FastAPI app
app = FastAPI(
    title="DiaLog API - Diabetes Meal Safety Predictor",
    description="""
    ## DiaLog API for Diabetes Meal Safety Prediction

    This API provides endpoints to:
    * Predict meal safety for diabetic users
    * Get nutritional information for foods
    * Fetch available foods from the database
    * Check API health and model status

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


# Endpoint to log each meal in the list to Firestore
@app.post("/log-meal-firestore")
async def log_meal_to_firestore(log: MealLog):
    if not firebase_initialized or not firestore_db:
        raise HTTPException(status_code=503, detail="Firebase/Firestore not available")
    
    try:
        results = []
        for meal in log.meals:
            # Prepare prediction request for each meal
            predict_req = MealRequest(
                age=0,  # If you want to add age, gender, etc., pass from frontend
                gender="Male",
                weight_kg=0,
                height_cm=0,
                fasting_sugar=log.sugar_level_fasting,
                post_meal_sugar=log.sugar_level_post,
                meal_taken=meal.meal_name,
                time_of_day=meal.time_of_day,
                portion_size=meal.quantity,
                portion_unit=meal.unit
            )
            prediction = await predict_meal_safety(predict_req)
            # Prepare log entry
            log_entry = {
                "userId": log.userId,
                "meal_name": meal.meal_name,
                "quantity": meal.quantity,
                "unit": meal.unit,
                "time_of_day": meal.time_of_day,
                "sugar_level_fasting": log.sugar_level_fasting,
                "sugar_level_post": log.sugar_level_post,
                "prediction": prediction.dict(),
                "createdAt": firestore.SERVER_TIMESTAMP if not log.createdAt else log.createdAt
            }
            doc_ref = firestore_db.collection("logs").add(log_entry)
            results.append({"doc_id": doc_ref[1].id, "meal": meal.meal_name, "risk": prediction.risk_level})
        # Calculate overall risk for the meal event
        risk_levels = [r["risk"] for r in results]
        if "high" in risk_levels:
            overall_risk = "high"
        elif "medium" in risk_levels:
            overall_risk = "medium"
        else:
            overall_risk = "low"

        summary_entry = {
            "userId": log.userId,
            "meals": [r["meal"] for r in results],
            "sugar_level_fasting": log.sugar_level_fasting,
            "sugar_level_post": log.sugar_level_post,
            "overall_risk": overall_risk,
            "individual_risks": risk_levels,
            "createdAt": firestore.SERVER_TIMESTAMP if not log.createdAt else log.createdAt
        }
        firestore_db.collection("logs_summary").add(summary_entry)

        return {"success": True, "results": results, "overall_risk": overall_risk}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to log meals: {str(e)}")

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
# New improved predictor
meal_safety_predictor = None

# Load model and artifacts
def load_model_artifacts():
    global model, scaler, feature_columns, meal_safety_predictor
    try:
        # Load traditional model artifacts (for backward compatibility)
        if os.path.exists(MODEL_DIR / "diabetes_model.joblib"):
            model = joblib.load(MODEL_DIR / "diabetes_model.joblib")
            scaler = joblib.load(MODEL_DIR / "scaler.joblib") if os.path.exists(MODEL_DIR / "scaler.joblib") else None
            feature_columns = joblib.load(MODEL_DIR / "feature_columns.joblib") if os.path.exists(MODEL_DIR / "feature_columns.joblib") else None
            print("✅ Traditional model artifacts loaded")
        
        # Initialize improved prediction system
        meal_safety_predictor = MealSafetyPredictor()
        meal_safety_predictor.load_food_dataset(DATA_DIR / "Food_Master_Dataset_.csv")
        
        # If we have trained model, attach it to the predictor
        if model is not None:
            meal_safety_predictor.model = model
            meal_safety_predictor.scaler = scaler
            meal_safety_predictor.is_trained = True
            print("✅ Improved prediction system initialized with existing model")
        else:
            print("⚠️ No trained model found - using guardrails-only mode")
        
        return True
        
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

def get_nutritional_info_enhanced(food_name: str, portion_size_g: float, 
                                portion_features: Dict[str, float]) -> NutritionalInfo:
    """
    Enhanced nutritional info that includes portion-adjusted values.
    """
    if food_name not in food_df.index:
        return None
    
    # Use portion-aware features for more accurate info
    return NutritionalInfo(
        calories=portion_features['calories_effective_kcal'],
        carbs_g=portion_features['carbs_effective_g'],
        protein_g=food_df.loc[food_name].get('protein_g', 0) * portion_features['portion_multiplier'],
        fat_g=food_df.loc[food_name].get('fat_g', 0) * portion_features['portion_multiplier'],
        fiber_g=food_df.loc[food_name].get('fiber_g', 0) * portion_features['portion_multiplier']
    )

def generate_enhanced_recommendations(food_name: str, prediction_result: Dict[str, any], 
                                   bmi: float, user_data: Dict[str, any]) -> List[Recommendation]:
    """
    Generate recommendations based on the improved prediction system.
    """
    recommendations = []
    risk_level = prediction_result['risk_level']
    reasons = prediction_result.get('reasons', [])
    portion_features = prediction_result.get('portion_features', {})
    
    # Risk-specific recommendations
    if risk_level == 'unsafe':
        recommendations.append(Recommendation(
            name="Avoid This Meal",
            reason="Multiple risk factors detected. Consider alternatives or significantly reduce portion."
        ))
        
        if portion_features.get('portion_multiplier', 1) > 2:
            recommendations.append(Recommendation(
                name="Reduce Portion Size", 
                reason=f"Current portion is {portion_features['portion_multiplier']:.1f}× normal. Try 0.5-1× instead."
            ))
            
        if portion_features.get('GL_portion', 0) > 20:
            recommendations.append(Recommendation(
                name="Add Fiber and Protein",
                reason="High glycemic load. Pair with vegetables and protein to slow absorption."
            ))
            
    elif risk_level == 'caution':
        recommendations.append(Recommendation(
            name="Monitor Closely",
            reason="Some risk factors present. Check blood sugar 2 hours after eating."
        ))
        
        if portion_features.get('sugar_effective_g', 0) > 25:
            recommendations.append(Recommendation(
                name="Post-Meal Walk",
                reason=f"High sugar content ({portion_features['sugar_effective_g']:.0f}g). Walk for 15-20 minutes."
            ))
            
    else:  # safe
        recommendations.append(Recommendation(
            name="Good Choice",
            reason="This meal appears suitable for your profile. Continue monitoring as usual."
        ))
    
    # BMI-specific advice
    if bmi > 25:
        recommendations.append(Recommendation(
            name="Portion Control",
            reason="Focus on portion sizes to support healthy weight management."
        ))
    
    # Always add general diabetes advice
    recommendations.append(Recommendation(
        name="Post-Meal Activity",
        reason="Light physical activity after meals helps regulate blood sugar."
    ))
    
    return recommendations

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
    """
    Improved meal safety prediction with hard guardrails and portion awareness.
    """
    try:
        global meal_safety_predictor
        
        if meal_safety_predictor is None:
            raise HTTPException(status_code=503, detail="Prediction system not initialized")
        
        # Convert portion unit to grams (simplified conversion)
        portion_unit_to_grams = {
            'cup': 200, 'bowl': 250, 'plate': 300, 'piece': 100,
            'slice': 50, 'spoon': 15, 'glass': 250, 'g': 1, 'grams': 1
        }
        portion_size_g = request.portion_size * portion_unit_to_grams.get(request.portion_unit.lower(), 100)
        
        # Calculate BMI
        bmi = calculate_bmi(request.weight_kg, request.height_cm)
        
        # Prepare user context for prediction
        user_data = {
            'age': request.age,
            'gender': request.gender,
            'bmi': bmi,
            'fasting_sugar': request.fasting_sugar,
            'post_meal_sugar': request.post_meal_sugar,
            'time_of_day': request.time_of_day
        }
        
        # Use improved prediction system
        result = meal_safety_predictor.predict_meal_safety(
            request.meal_taken, 
            portion_size_g, 
            user_data
        )
        
        # Map risk levels to expected format
        risk_mapping = {
            'safe': ('low', True),
            'caution': ('medium', False), 
            'unsafe': ('high', False)
        }
        
        risk_level, is_safe = risk_mapping.get(result['risk_level'], ('medium', False))
        
        # Create response message with explanation
        message = result['explanation']
        confidence = result['confidence']
        
        # Get nutritional information (enhanced with portion awareness)
        nutritional_info = get_nutritional_info_enhanced(
            request.meal_taken, 
            portion_size_g, 
            result['portion_features']
        )
        
        # Generate enhanced recommendations based on guardrails
        recommendations = generate_enhanced_recommendations(
            request.meal_taken, 
            result, 
            bmi,
            user_data
        )
        
        return PredictionResponse(
            is_safe=is_safe,
            confidence=confidence,
            risk_level=risk_level,
            message=message,
            bmi=bmi,
            nutritional_info=nutritional_info,
            recommendations=recommendations
        )
        
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
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

@app.get("/test-guardrails")
async def test_guardrails():
    """
    Run acceptance tests for the improved prediction system.
    """
    try:
        global meal_safety_predictor
        
        if meal_safety_predictor is None:
            raise HTTPException(status_code=503, detail="Prediction system not initialized")
        
        # Run the acceptance tests
        test_results = run_acceptance_tests(meal_safety_predictor)
        
        return {
            "success": True,
            "test_results": test_results,
            "message": f"Tests completed: {test_results['passed']}/{test_results['passed'] + test_results['failed']} passed"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Test error: {str(e)}")

@app.get("/predict-sample")
async def predict_sample():
    """
    Sample prediction to demonstrate the improved system.
    """
    try:
        global meal_safety_predictor
        
        if meal_safety_predictor is None:
            raise HTTPException(status_code=503, detail="Prediction system not initialized")
        
        # Sample cases showing the improvements
        sample_cases = [
            {
                "case": "Normal portion of safe food",
                "meal": "Hot tea (Garam Chai)",
                "portion_g": 200,
                "user": {"age": 45, "gender": "Male", "bmi": 25, "fasting_sugar": 100, "time_of_day": "Breakfast"}
            },
            {
                "case": "Large portion triggering guardrails",
                "meal": "Plain cream cake", 
                "portion_g": 150,
                "user": {"age": 45, "gender": "Male", "bmi": 25, "fasting_sugar": 100, "time_of_day": "Snack"}
            }
        ]
        
        results = []
        for case in sample_cases:
            try:
                prediction = meal_safety_predictor.predict_meal_safety(
                    case["meal"], case["portion_g"], case["user"]
                )
                results.append({
                    "case": case["case"],
                    "meal": case["meal"], 
                    "risk_level": prediction["risk_level"],
                    "explanation": prediction["explanation"]
                })
            except Exception as e:
                results.append({
                    "case": case["case"],
                    "error": str(e)
                })
        
        return {"sample_predictions": results}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Sample prediction error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

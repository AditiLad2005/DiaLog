# --- Firestore Backend Logging ---
try:
    from firebase_admin_setup import db as firestore_db, firebase_initialized
    from firebase_admin import firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    print("⚠️ Firebase not available - running without cloud logging")
    firestore_db = None
    firebase_initialized = False
    FIREBASE_AVAILABLE = False

from pydantic import BaseModel
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
import pandas as pd
import numpy as np
import os
from typing import Optional, List, Dict, Any
from pathlib import Path
from dotenv import load_dotenv
import datetime

# Load environment variables
load_dotenv()

# Pydantic model for meal log
class MealLogMeal(BaseModel):
    meal_name: str
    quantity: float  # Changed from int to float for better precision
    unit: str
    time_of_day: str
    
    class Config:
        schema_extra = {
            "example": {
                "meal_name": "Rice",
                "quantity": 1.5,
                "unit": "cup",
                "time_of_day": "Breakfast (7-9 AM)"
            }
        }

class MealLog(BaseModel):
    userId: str
    age: int = 35
    gender: str = "Male"
    weight_kg: float = 70
    height_cm: float = 170
    sugar_level_fasting: float
    sugar_level_post: float
    meals: list[MealLogMeal]
    notes: str = ""
    createdAt: str = None
    
    class Config:
        schema_extra = {
            "example": {
                "userId": "user123",
                "age": 35,
                "gender": "Male", 
                "weight_kg": 70.0,
                "height_cm": 170.0,
                "sugar_level_fasting": 95.0,
                "sugar_level_post": 140.0,
                "meals": [
                    {
                        "meal_name": "Rice",
                        "quantity": 1.5,
                        "unit": "cup",
                        "time_of_day": "Breakfast (7-9 AM)"
                    }
                ],
                "notes": "Feeling good after meal"
            }
        }

class AggregatedMealRequest(BaseModel):
    age: int
    gender: str
    weight_kg: float
    height_cm: float
    fasting_sugar: float
    post_meal_sugar: float
    meals: list[MealLogMeal]
    notes: str = ""
    
    class Config:
        schema_extra = {
            "example": {
                "age": 35,
                "gender": "Male",
                "weight_kg": 70.0,
                "height_cm": 170.0,
                "fasting_sugar": 95.0,
                "post_meal_sugar": 140.0,
                "meals": [
                    {
                        "meal_name": "Rice",
                        "quantity": 1.5,
                        "unit": "cup",
                        "time_of_day": "Breakfast (7-9 AM)"
                    }
                ],
                "notes": "Regular breakfast"
            }
        }

# Create FastAPI app
app = FastAPI(
    title="DiaLog API - Diabetes Meal Safety Predictor",
    description="DiaLog API for Diabetes Meal Safety Prediction",
    version="2.0.0"
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

# Load the food dataset
try:
    food_df = pd.read_csv(DATA_DIR / "Food_Master_Dataset_.csv")
    print(f"Loaded {len(food_df)} foods from dataset")
    food_df.set_index('dish_name', inplace=True)
except Exception as e:
    print(f"Error loading food dataset: {e}")
    food_df = pd.DataFrame()

# Portion mapping for realistic portion sizes (in grams)
PORTION_MAPPING = {
    'piece': 50,      # 1 piece = 50g (average for items like idli, dosa)
    'pieces': 50,     # plural form
    'cup': 200,       # 1 cup = 200g 
    'cups': 200,      # plural form
    'bowl': 150,      # 1 bowl = 150g
    'bowls': 150,     # plural form
    'plate': 200,     # 1 plate = 200g
    'plates': 200,    # plural form
    'tbsp': 15,       # 1 tablespoon = 15g
    'tablespoon': 15,
    'tablespoons': 15,
    'tsp': 5,         # 1 teaspoon = 5g
    'teaspoon': 5,
    'teaspoons': 5,
    'gram': 1,        # 1 gram = 1g (base unit)
    'grams': 1,       # plural form
    'g': 1,           # short form
    'kg': 1000,       # 1 kg = 1000g
    'glass': 250,     # 1 glass = 250g (for liquids)
    'glasses': 250,   # plural form
    'ml': 1,          # 1 ml ≈ 1g for most foods
    'liter': 1000,    # 1 liter = 1000g
    'liters': 1000,   # plural form
    'slice': 30,      # 1 slice = 30g (bread, etc.)
    'slices': 30,     # plural form
}

def get_portion_weight_grams(quantity: float, unit: str) -> float:
    """Convert quantity and unit to grams with better validation"""
    if quantity <= 0:
        raise ValueError(f"Quantity must be positive, got {quantity}")
    
    unit_lower = unit.lower().strip()
    multiplier = PORTION_MAPPING.get(unit_lower, 100)  # Default to 100g if unit not found
    
    # Log warning for unknown units
    if unit_lower not in PORTION_MAPPING:
        print(f"Warning: Unknown unit '{unit}', using default 100g per unit")
    
    result = quantity * multiplier
    
    # Reasonable limits for portion sizes
    if result > 2000:  # More than 2kg seems unreasonable for a single food item
        print(f"Warning: Very large portion size: {result}g for {quantity} {unit}")
    
    return result

def calculate_bmi(weight_kg: float, height_cm: float) -> float:
    """Calculate BMI from weight and height with validation"""
    # Validate inputs
    if height_cm <= 0 or weight_kg <= 0:
        raise ValueError("Height and weight must be positive values")
    
    if height_cm < 50 or height_cm > 300:
        raise ValueError("Height must be between 50-300 cm")
    
    if weight_kg < 10 or weight_kg > 500:
        raise ValueError("Weight must be between 10-500 kg")
    
    height_m = height_cm / 100
    bmi = weight_kg / (height_m ** 2)
    return round(bmi, 1)

def calculate_aggregated_nutrition(meals: list[MealLogMeal]) -> dict:
    """Calculate aggregated nutritional values for multiple meals"""
    total_nutrition = {
        'calories': 0,
        'carbs_g': 0,
        'protein_g': 0,
        'fat_g': 0,
        'fiber_g': 0,
        'glycemic_load': 0,
        'meal_names': [],
        'portion_details': []
    }
    
    for meal in meals:
        if meal.meal_name not in food_df.index:
            print(f"Warning: {meal.meal_name} not found in food database")
            continue
            
        food_row = food_df.loc[meal.meal_name]
        
        # Convert portion to grams using realistic mapping
        portion_weight_grams = get_portion_weight_grams(meal.quantity, meal.unit)
        
        # Calculate multiplier based on 100g serving (assuming dataset values are per 100g)
        portion_multiplier = portion_weight_grams / 100.0
        
        # Calculate nutritional values
        calories = float(food_row.get('calories_kcal', 0)) * portion_multiplier
        carbs = float(food_row.get('carbs_g', 0)) * portion_multiplier
        protein = float(food_row.get('protein_g', 0)) * portion_multiplier
        fat = float(food_row.get('fat_g', 0)) * portion_multiplier
        fiber = float(food_row.get('fiber_g', 0)) * portion_multiplier
        
        # Calculate glycemic load: GL = (GI × carbs_in_portion) / 100
        gi = float(food_row.get('glycemic_index', 50))
        glycemic_load = (gi * carbs) / 100.0
        
        # Add to totals
        total_nutrition['calories'] += calories
        total_nutrition['carbs_g'] += carbs
        total_nutrition['protein_g'] += protein
        total_nutrition['fat_g'] += fat
        total_nutrition['fiber_g'] += fiber
        total_nutrition['glycemic_load'] += glycemic_load
        
        total_nutrition['meal_names'].append(meal.meal_name)
        total_nutrition['portion_details'].append(
            f"{meal.quantity} {meal.unit} {meal.meal_name} ({portion_weight_grams:.0f}g)"
        )
    
    # Calculate weighted average glycemic index
    total_carbs = total_nutrition['carbs_g']
    if total_carbs > 0:
        total_nutrition['avg_glycemic_index'] = (total_nutrition['glycemic_load'] * 100) / total_carbs
    else:
        total_nutrition['avg_glycemic_index'] = 50
    
    return total_nutrition

def assess_meal_risk(nutrition: dict, bmi: float, fasting_sugar: float, post_meal_sugar: float) -> dict:
    """Enhanced meal risk assessment with improved thresholds and scoring"""
    risk_factors = []
    risk_score = 0
    
    # Blood sugar level assessment (most important factor)
    if post_meal_sugar > 250:
        risk_factors.append("Dangerously high post-meal blood sugar")
        risk_score += 5
    elif post_meal_sugar > 200:
        risk_factors.append("Very high post-meal blood sugar")
        risk_score += 4
    elif post_meal_sugar > 180:
        risk_factors.append("Elevated post-meal blood sugar")
        risk_score += 3
    elif post_meal_sugar > 140:
        risk_factors.append("Borderline high post-meal blood sugar")
        risk_score += 1.5
    
    if fasting_sugar > 140:
        risk_factors.append("Very high fasting blood sugar")
        risk_score += 3
    elif fasting_sugar > 126:
        risk_factors.append("High fasting blood sugar (diabetic range)")
        risk_score += 2
    elif fasting_sugar > 100:
        risk_factors.append("Elevated fasting blood sugar (pre-diabetic range)")
        risk_score += 1
    
    # Glycemic load assessment (refined thresholds)
    gl = nutrition['glycemic_load']
    if gl >= 25:
        risk_factors.append("Very high glycemic load - rapid blood sugar spike expected")
        risk_score += 3
    elif gl >= 20:
        risk_factors.append("High glycemic load - significant blood sugar impact")
        risk_score += 2.5
    elif gl >= 15:
        risk_factors.append("Moderate-high glycemic load")
        risk_score += 1.5
    elif gl >= 10:
        risk_factors.append("Medium glycemic load")
        risk_score += 0.5
    
    # Carbohydrate assessment (more refined)
    carbs = nutrition['carbs_g']
    if carbs > 80:
        risk_factors.append("Very high carbohydrate content")
        risk_score += 3
    elif carbs > 60:
        risk_factors.append("High carbohydrate content")
        risk_score += 2
    elif carbs > 45:
        risk_factors.append("Moderate carbohydrate content")
        risk_score += 1
    elif carbs > 30:
        risk_factors.append("Moderate-low carbohydrate content")
        risk_score += 0.5
    
    # Calorie consideration for portion control
    calories = nutrition.get('calories', 0)
    if calories > 800:
        risk_factors.append("Very high calorie meal - consider portion control")
        risk_score += 1.5
    elif calories > 600:
        risk_factors.append("High calorie meal")
        risk_score += 1
    elif calories > 400:
        risk_factors.append("Moderate calorie meal")
        risk_score += 0.5
    
    # BMI consideration (enhanced)
    if bmi > 35:
        risk_factors.append("Obesity Class II - strict portion control recommended")
        risk_score += 2
    elif bmi > 30:
        risk_factors.append("Obesity Class I - careful portion control needed")
        risk_score += 1.5
    elif bmi > 25:
        risk_factors.append("Overweight - monitor portions")
        risk_score += 0.5
    
    # Fiber content (protective factor)
    fiber = nutrition.get('fiber_g', 0)
    if fiber >= 10:
        risk_factors.append("Good fiber content helps slow sugar absorption")
        risk_score -= 0.5
    elif fiber >= 5:
        risk_factors.append("Moderate fiber content")
        risk_score -= 0.25
    
    # Protein content (protective factor)
    protein = nutrition.get('protein_g', 0)
    if protein >= 20:
        risk_factors.append("Good protein content helps stabilize blood sugar")
        risk_score -= 0.5
    elif protein >= 10:
        risk_factors.append("Adequate protein content")
        risk_score -= 0.25
    
    # Determine overall risk with improved thresholds
    if risk_score >= 6:
        risk_level = "high"
        recommendation = "High risk meal - consider smaller portions, add protein/fiber, or choose lower-carb alternatives"
    elif risk_score >= 3:
        risk_level = "medium"
        recommendation = "Moderate risk - monitor blood sugar closely and consider pairing with protein/vegetables"
    elif risk_score >= 1:
        risk_level = "low-medium"
        recommendation = "Generally suitable with minor considerations for portion size"
    else:
        risk_level = "low"
        recommendation = "This meal appears well-suited for your current profile"
    
    return {
        "risk_level": risk_level,
        "risk_score": round(risk_score, 2),
        "risk_factors": risk_factors,
        "recommendation": recommendation,
        "thresholds_used": {
            "post_meal_danger": 250,
            "post_meal_high": 200,
            "post_meal_elevated": 180,
            "glycemic_load_high": 20,
            "carbs_high": 60
        }
    }

# Pydantic models for responses
class HealthResponse(BaseModel):
    status: str
    message: str
    model_loaded: bool

class FoodsResponse(BaseModel):
    status: str
    foods: List[str]
    count: int

class AggregatedPredictionResponse(BaseModel):
    meals: List[str]
    total_nutrition: Dict[str, Any]
    risk_assessment: Dict[str, Any]
    recommendations: List[str]
    confidence: float

@app.get("/")
async def root():
    return {"message": "DiaLog API is running", "version": "2.0.0"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(
        status="healthy",
        message="API is running",
        model_loaded=not food_df.empty
    )

@app.get("/foods", response_model=FoodsResponse)
async def get_foods():
    if food_df.empty:
        return FoodsResponse(status="error", foods=[], count=0)
    
    foods = food_df.index.tolist()
    return FoodsResponse(
        status="success",
        foods=foods,
        count=len(foods)
    )

@app.post("/predict-aggregated-meal", response_model=AggregatedPredictionResponse)
async def predict_aggregated_meal_safety(request: AggregatedMealRequest):
    """
    Predict safety for multiple meals combined as one meal event.
    Uses proper glycemic load calculation and risk assessment.
    """
    try:
        if food_df.empty:
            raise HTTPException(status_code=500, detail="Food database not loaded")
        
        # Validate input data
        if not request.meals or len(request.meals) == 0:
            raise HTTPException(status_code=400, detail="At least one meal must be provided")
        
        if request.fasting_sugar < 50 or request.fasting_sugar > 400:
            raise HTTPException(status_code=400, detail="Fasting sugar must be between 50-400 mg/dL")
        
        if request.post_meal_sugar < 50 or request.post_meal_sugar > 600:
            raise HTTPException(status_code=400, detail="Post-meal sugar must be between 50-600 mg/dL")
        
        # Calculate aggregated nutrition
        aggregated_nutrition = calculate_aggregated_nutrition(request.meals)
        
        # Calculate BMI with validation
        try:
            bmi = calculate_bmi(request.weight_kg, request.height_cm)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Assess meal risk
        risk_assessment = assess_meal_risk(
            aggregated_nutrition, bmi, request.fasting_sugar, request.post_meal_sugar
        )
        
        # Generate recommendations
        recommendations = [risk_assessment["recommendation"]]
        
        # Add specific recommendations based on nutrition
        if aggregated_nutrition['fiber_g'] < 5:
            recommendations.append("Consider adding more fiber-rich foods to help regulate blood sugar")
        
        if aggregated_nutrition['protein_g'] < 15:
            recommendations.append("Add protein to help slow carbohydrate absorption")
        
        # Add portion-specific recommendations
        if aggregated_nutrition['calories'] > 800:
            recommendations.append("Consider reducing portion sizes - this meal is quite high in calories")
        
        if aggregated_nutrition['glycemic_load'] > 20:
            recommendations.append("High glycemic load - consider pairing with protein and healthy fats")
        
        # Confidence score (simplified)
        confidence = 0.85 if len(request.meals) > 0 else 0.5
        
        return AggregatedPredictionResponse(
            meals=aggregated_nutrition['meal_names'],
            total_nutrition=aggregated_nutrition,
            risk_assessment=risk_assessment,
            recommendations=recommendations,
            confidence=confidence
        )
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in predict_aggregated_meal_safety: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error analyzing meal: {str(e)}")

async def log_meal_to_firestore(meal_log: MealLog):
    """Log aggregated meal to Firestore"""
    try:
        if not FIREBASE_AVAILABLE or not firebase_initialized:
            print("⚠️ Firebase not available - skipping cloud logging")
            return {"success": False, "message": "Firebase not available"}
        
        # Calculate aggregated nutrition for the meal
        aggregated_nutrition = calculate_aggregated_nutrition(meal_log.meals)
        bmi = calculate_bmi(meal_log.weight_kg, meal_log.height_cm)
        
        # Create the meal log document
        meal_doc = {
            "userId": meal_log.userId,
            "age": meal_log.age,
            "gender": meal_log.gender,
            "weight_kg": meal_log.weight_kg,
            "height_cm": meal_log.height_cm,
            "bmi": bmi,
            "sugar_level_fasting": meal_log.sugar_level_fasting,
            "sugar_level_post": meal_log.sugar_level_post,
            "meals": [meal.dict() for meal in meal_log.meals],
            "meal_names": aggregated_nutrition['meal_names'],
            "total_nutrition": aggregated_nutrition,
            "notes": meal_log.notes,
            "createdAt": meal_log.createdAt or datetime.datetime.now().isoformat(),
            "timestamp": firestore.SERVER_TIMESTAMP
        }
        
        # Store in Firestore under user's collection
        doc_ref = firestore_db.collection('users').document(meal_log.userId).collection('meal_logs').add(meal_doc)
        print(f"✅ Meal logged to Firestore under users/{meal_log.userId}/meal_logs with ID: {doc_ref[1].id}")
        
        return {"success": True, "doc_id": doc_ref[1].id}
        
    except Exception as e:
        print(f"Error logging to Firestore: {str(e)}")
        return {"success": False, "error": str(e)}

@app.post("/log-meal")
async def log_meal(meal_log: MealLog):
    """Log a meal with multiple food items"""
    try:
        # Log to Firestore
        result = await log_meal_to_firestore(meal_log)
        
        # Calculate aggregated nutrition for response
        aggregated_nutrition = calculate_aggregated_nutrition(meal_log.meals)
        bmi = calculate_bmi(meal_log.weight_kg, meal_log.height_cm)
        risk_assessment = assess_meal_risk(
            aggregated_nutrition, bmi, meal_log.sugar_level_fasting, meal_log.sugar_level_post
        )
        
        return {
            "status": "success",
            "message": "Meal logged successfully",
            "meal_count": len(meal_log.meals),
            "total_nutrition": aggregated_nutrition,
            "risk_assessment": risk_assessment,
            "firestore_result": result
        }
        
    except Exception as e:
        print(f"Error in log_meal: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to log meal: {str(e)}")

@app.post("/log-meal-firestore")
async def log_meal_firestore(meal_log: MealLog):
    """Log a meal with multiple food items to Firestore and return prediction"""
    try:
        # Convert to aggregated meal request for prediction
        aggregated_request = AggregatedMealRequest(
            age=meal_log.age,
            gender=meal_log.gender,
            weight_kg=meal_log.weight_kg,
            height_cm=meal_log.height_cm,
            fasting_sugar=meal_log.sugar_level_fasting,
            post_meal_sugar=meal_log.sugar_level_post,
            meals=meal_log.meals,
            notes=meal_log.notes
        )
        
        # Get prediction
        prediction_result = await predict_aggregated_meal_safety(aggregated_request)
        
        # Log to Firestore
        firestore_result = await log_meal_to_firestore(meal_log)
        
        # Calculate aggregated nutrition for response
        aggregated_nutrition = calculate_aggregated_nutrition(meal_log.meals)
        
        return {
            "success": True,
            "message": "Meal logged successfully with prediction",
            "prediction": {
                "meals": prediction_result.meals,
                "total_nutrition": prediction_result.total_nutrition,
                "risk_assessment": prediction_result.risk_assessment,
                "recommendations": prediction_result.recommendations,
                "confidence": prediction_result.confidence
            },
            "aggregated_nutrition": aggregated_nutrition,
            "firestore_result": firestore_result
        }
        
    except Exception as e:
        print(f"Error in log_meal_firestore: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to log meal: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
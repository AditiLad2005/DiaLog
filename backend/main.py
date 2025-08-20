# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import pandas as pd
import joblib
import os
import numpy as np

app = FastAPI(title="DiaLog API - Diabetes Meal Safety Predictor")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global variables for model artifacts
model = None
scaler = None
feature_columns = None
food_df = None
gender_encoder = None
meal_time_encoder = None

# Load models and data
def load_model_artifacts():
    global model, scaler, feature_columns, food_df, gender_encoder, meal_time_encoder
    
    try:
        model = joblib.load('models/diabetes_model.joblib')
        scaler = joblib.load('models/scaler.joblib')
        feature_columns = joblib.load('models/feature_columns.joblib')
        gender_encoder = joblib.load('models/gender_encoder.joblib')
        meal_time_encoder = joblib.load('models/meal_time_encoder.joblib')
        
        food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
        food_df.set_index('dish_name', inplace=True)
        
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

@app.get("/")
def root():
    return {
        "status": "DiaLog API Running!",
        "model_loaded": model is not None,
        "food_items_available": len(food_df) if food_df is not None else 0
    }

@app.get("/foods")
def get_available_foods():
    """Get list of available foods for dropdown"""
    if food_df is None:
        return {"foods": ["Rice", "Dal", "Chicken", "Apple", "Chapati"]}
    
    # Return foods sorted by name
    foods = sorted(food_df.index.tolist())
    return {"foods": foods[:100]}  # Limit to first 100 for performance

@app.get("/food/{food_name}")
def get_food_details(food_name: str):
    """Get nutritional details of a specific food"""
    if food_df is None:
        raise HTTPException(status_code=500, detail="Food database not loaded")
    
    try:
        food_info = food_df.loc[food_name]
        return {
            "name": food_name,
            "serving_size_g": food_info['serving_size_g'],
            "calories": food_info['calories_kcal'],
            "carbs": food_info['carbs_g'],
            "protein": food_info['protein_g'],
            "fat": food_info['fat_g'],
            "fiber": food_info['fiber_g'],
            "glycemic_index": food_info['glycemic_index'],
            "avoid_for_diabetic": food_info['avoid_for_diabetic']
        }
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Food '{food_name}' not found")

@app.post("/predict", response_model=PredictionResponse)
def predict_meal_safety(data: MealLogInput):
    """Main prediction endpoint"""
    
    if model is None:
        # Return dummy response if model not loaded
        return PredictionResponse(
            is_safe=True,
            confidence=0.7,
            risk_level="Medium",
            bmi=22.0,
            portion_analysis={"status": "Model not loaded"},
            nutritional_info={"calories": 200, "carbs": 30},
            recommendations=[{"name": "Apple", "reason": "Low GI"}],
            message="Model loading... Using dummy response"
        )
    
    try:
        # Calculate BMI
        bmi = calculate_bmi(data.weight_kg, data.height_cm)
        
        # Get food information
        if data.meal_taken not in food_df.index:
            raise HTTPException(status_code=404, detail=f"Food '{data.meal_taken}' not found in database")
        
        food_info = food_df.loc[data.meal_taken]
        
        # Convert portion to grams
        portion_g = convert_portion_to_grams(
            data.portion_size, 
            data.portion_unit, 
            food_info['serving_size_g']
        )
        
        # Calculate scaled nutritional values
        serving_ratio = portion_g / food_info['serving_size_g']
        scaled_nutrition = {
            'calories': food_info['calories_kcal'] * serving_ratio,
            'carbs_g': food_info['carbs_g'] * serving_ratio,
            'protein_g': food_info['protein_g'] * serving_ratio,
            'fat_g': food_info['fat_g'] * serving_ratio,
            'fiber_g': food_info['fiber_g'] * serving_ratio
        }
        
        # Prepare features for prediction
        try:
            gender_encoded = gender_encoder.transform([data.gender])[0]
        except:
            gender_encoded = 0  # fallback
            
        try:
            meal_time_encoded = meal_time_encoder.transform([data.time_of_day])[0]
        except:
            meal_time_encoded = 0  # fallback
        
        # Create feature vector
        features = [
            data.age,
            bmi,
            gender_encoded,
            data.fasting_sugar,
            data.post_meal_sugar,
            meal_time_encoded,
            portion_g,
            scaled_nutrition['carbs_g'],
            scaled_nutrition['protein_g'],
            scaled_nutrition['fat_g'],
            scaled_nutrition['fiber_g'],
            food_info['glycemic_index'],
            food_info['glycemic_load'] * serving_ratio,
            scaled_nutrition['calories']
        ]
        
        # Make prediction
        features_scaled = scaler.transform([features])
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0]
        confidence = float(max(probability))
        
        # Determine risk level
        if confidence > 0.8:
            risk_level = "Low" if prediction == 1 else "High"
        elif confidence > 0.6:
            risk_level = "Medium"
        else:
            risk_level = "Uncertain"
        
        # Generate recommendations
        recommendations = generate_recommendations(
            food_info, 
            prediction, 
            portion_g, 
            food_info['serving_size_g']
        )
        
        # Portion analysis
        portion_analysis = {
            "portion_grams": round(portion_g, 1),
            "servings": round(serving_ratio, 2),
            "status": "Normal" if serving_ratio <= 2.0 else "Large",
            "recommended_max_g": food_info['serving_size_g'] * 2
        }
        
        return PredictionResponse(
            is_safe=bool(prediction),
            confidence=round(confidence, 3),
            risk_level=risk_level,
            bmi=round(bmi, 1),
            portion_analysis=portion_analysis,
            nutritional_info=scaled_nutrition,
            recommendations=recommendations,
            message="✅ Analysis complete" if prediction else "⚠️ Exercise caution with this meal",
            meal_taken=data.meal_taken
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction error: {str(e)}")

def generate_recommendations(food_info, is_safe, portion_g, serving_size_g):
    """Generate meal recommendations"""
    recommendations = []
    
    if not is_safe:
        recommendations.append({
            "name": "Reduce portion size",
            "reason": f"Try {serving_size_g}g instead of {portion_g}g"
        })
        
        if food_info['avoid_for_diabetic'] == 'Yes':
            recommendations.append({
                "name": "Consider alternatives",
                "reason": "This food is not recommended for diabetics"
            })
    
    # Add general recommendations
    if food_info['glycemic_index'] > 70:
        recommendations.append({
            "name": "Pair with protein/fiber",
            "reason": "High GI food - add protein or fiber to slow absorption"
        })
    
    # Safe alternatives from the same meal category
    if food_df is not None:
        safe_foods = food_df[
            (food_df['avoid_for_diabetic'] != 'Yes') & 
            (food_df['glycemic_index'] < 55) &
            (food_df['meal_time_category'] == food_info['meal_time_category'])
        ].head(3)
        
        for name, row in safe_foods.iterrows():
            if name != food_info.name:
                recommendations.append({
                    "name": name,
                    "reason": f"Lower GI ({row['glycemic_index']}) alternative"
                })
    
    return recommendations[:5]  # Limit to 5 recommendations

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "food_database_loaded": food_df is not None,
        "total_foods": len(food_df) if food_df is not None else 0
    }

# backend/main.py

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Dict, List
import pandas as pd
import joblib

app = FastAPI(
    title="DiaLog API",
    description="API for diabetes-friendly meal planning and nutritional analysis",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# ----------------- Middleware -----------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ----------------- Load ML resources -----------------
MODEL_PATH = 'models/diabetes_model.joblib'
SCALER_PATH = 'models/scaler.joblib'
FEATURES_PATH = 'models/feature_columns.joblib'
FOOD_DB_PATH = 'data/pred_food.csv'

try:
    model = joblib.load(MODEL_PATH)
    scaler = joblib.load(SCALER_PATH)
    feature_columns = joblib.load(FEATURES_PATH)
    food_db = pd.read_csv(FOOD_DB_PATH)
    food_db.set_index('Food Name', inplace=True)
except Exception as e:
    print(f"Error loading resources: {e}")
    model, scaler, feature_columns, food_db = None, None, None, None

# ----------------- Schemas -----------------
class FoodInput(BaseModel):
    food_name: str = Field(..., description="Name of the food item")
    quantity_grams: float = Field(..., gt=0, description="Quantity in grams")

class NutritionalValues(BaseModel):
    glycemic_index: float
    calories: float
    carbohydrates: float
    protein: float
    fat: float
    sodium_content: float
    potassium_content: float
    magnesium_content: float
    calcium_content: float
    fiber_content: float

class PredictionResponse(BaseModel):
    food_name: str
    quantity_grams: float
    nutritional_values: NutritionalValues
    is_diabetes_friendly: bool
    confidence: float
    recommendations: List[str]

class HealthData(BaseModel):
    sugar_fasting: float
    sugar_post_lunch: float
    meal_time: str
    previous_meal: str
    quantity: float
    unit: str = Field(..., description="Unit of the food item (e.g., spoons, bowls, cups)")
    food_name: str

# ----------------- Helpers -----------------
def convert_to_grams(quantity: float, unit: str, food_name: str) -> float:
    conversions = {"spoons": 15, "bowls": 200, "cups": 240}
    return quantity * conversions.get(unit, 1)

def calculate_nutritional_values(food_row, quantity_grams: float) -> Dict:
    """Scale nutritional values per portion"""
    scale_factor = quantity_grams / 100  # assuming per 100g base
    return {
        "glycemic_index": food_row["Glycemic Index"],  # GI doesn't scale
        "calories": food_row["Calories"] * scale_factor,
        "carbohydrates": food_row["Carbohydrates"] * scale_factor,
        "protein": food_row["Protein"] * scale_factor,
        "fat": food_row["Fat"] * scale_factor,
        "sodium_content": food_row["Sodium Content"] * scale_factor,
        "potassium_content": food_row["Potassium Content"] * scale_factor,
        "magnesium_content": food_row["Magnesium Content"] * scale_factor,
        "calcium_content": food_row["Calcium Content"] * scale_factor,
        "fiber_content": food_row["Fiber Content"] * scale_factor,
    }

def generate_recommendations(sugar_fasting, sugar_post_lunch, food, is_safe):
    recommendations = []
    if sugar_fasting > 100:
        recommendations.append("High fasting sugar - consider low GI alternatives")
    if food["Glycemic Index"] > 55:
        recommendations.append(f"This food has a high glycemic index of {food['Glycemic Index']}")
    return recommendations

# ----------------- Routes -----------------
@app.get("/", tags=["General"])
async def root():
    return {"status": "healthy", "message": "Welcome to DiaLog API"}

@app.get("/foods", tags=["Food"])
async def get_available_foods():
    if food_db is None:
        raise HTTPException(status_code=500, detail="Food database not loaded")
    return {"foods": food_db.index.tolist()}

@app.post("/predict-food", response_model=PredictionResponse, tags=["Predictions"])
async def predict_food(request: FoodInput):
    if not all([model, scaler, feature_columns, food_db is not None]):
        raise HTTPException(status_code=500, detail="Resources not loaded")

    try:
        food = food_db.loc[request.food_name]
        nutritional_values = calculate_nutritional_values(food, request.quantity_grams)

        # Prepare features for ML model
        features = [[
            nutritional_values['glycemic_index'],
            nutritional_values['calories'],
            nutritional_values['carbohydrates'],
            nutritional_values['protein'],
            nutritional_values['fat'],
            nutritional_values['sodium_content'],
            nutritional_values['potassium_content'],
            nutritional_values['magnesium_content'],
            nutritional_values['calcium_content'],
            nutritional_values['fiber_content']
        ]]

        features_scaled = scaler.transform(features)
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0]

        recommendations = []
        if nutritional_values['glycemic_index'] > 55:
            recommendations.append("High glycemic index - consume in moderation")
        if nutritional_values['carbohydrates'] > 30:
            recommendations.append("High in carbohydrates - monitor blood sugar")
        if nutritional_values['fiber_content'] < 3:
            recommendations.append("Consider adding more fiber to your meal")

        return PredictionResponse(
            food_name=request.food_name,
            quantity_grams=request.quantity_grams,
            nutritional_values=nutritional_values,
            is_diabetes_friendly=bool(prediction),
            confidence=float(max(probability)),
            recommendations=recommendations
        )
    except KeyError:
        raise HTTPException(status_code=404, detail=f"Food '{request.food_name}' not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-meal", tags=["Predictions"])
async def predict_meal(data: HealthData):
    if not all([model, scaler, feature_columns, food_db is not None]):
        raise HTTPException(status_code=500, detail="Resources not loaded")

    try:
        food = food_db.loc[data.previous_meal]
        quantity_grams = convert_to_grams(data.quantity, data.unit, data.previous_meal)
        features = calculate_nutritional_values(food, quantity_grams)

        features_scaled = scaler.transform([list(features.values())])
        prediction = model.predict(features_scaled)[0]
        probability = model.predict_proba(features_scaled)[0]

        recommendations = generate_recommendations(
            data.sugar_fasting, data.sugar_post_lunch, food, prediction
        )

        return {
            "is_safe": bool(prediction),
            "confidence": float(max(probability)),
            "nutritional_values": features,
            "recommendations": recommendations,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/meal-log", tags=["Logging"])
async def save_meal_log(meal: dict):
    # For now just return it back. Replace with DB storage later.
    return {"status": "success", "logged_meal": meal}

@app.get("/health", tags=["General"])
async def health_check():
    return {
        "status": "healthy",
        "model_loaded": model is not None,
        "scaler_loaded": scaler is not None,
        "features_available": feature_columns is not None
    }

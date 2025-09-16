import pandas as pd
import numpy as np
import random
from datetime import datetime, timedelta

def enhance_dataset():
    """
    Step 1: Extend Dataset with User Context
    Create synthetic user logs with health data + meal context
    """
    
    print("=== Step 1: Extending Dataset with User Context ===")
    
    # Load original dataset
    original_df = pd.read_csv('data/pred_food.csv')
    print(f"Original dataset: {len(original_df)} foods")
    
    # Generate synthetic user logs
    synthetic_logs = []
    
    for _ in range(5000):  # Generate 5000 user meal logs
        # Random food selection
        food_idx = random.randint(0, len(original_df) - 1)
        food_row = original_df.iloc[food_idx]
        
        # User health context
        age = np.random.randint(25, 70)
        bmi = np.random.normal(25, 4)  # BMI distribution
        sugar_fasting = np.random.normal(110, 20)  # mg/dL
        sugar_post_lunch = np.random.normal(140, 30)  # mg/dL
        
        # Meal context
        portion_grams = np.random.uniform(50, 400)  # portion size
        meal_times = ['Breakfast', 'Lunch', 'Dinner', 'Snack']
        meal_time = random.choice(meal_times)
        time_since_last_meal = np.random.uniform(2, 8)  # hours
        
        # Calculate scaled nutritional values based on portion
        scale_factor = portion_grams / 100
        scaled_carbs = food_row['Carbohydrates'] * scale_factor
        scaled_calories = food_row['Calories'] * scale_factor
        scaled_gi = food_row['Glycemic Index']  # GI doesn't scale
        
        # Step 2: Define Prediction Target - Both Binary & Regression
        predicted_sugar_spike = predict_sugar_spike(
            sugar_fasting, sugar_post_lunch, scaled_gi, scaled_carbs, portion_grams, age, bmi
        )
        
        # Binary classification: Safe vs Risky
        is_safe = 1 if predicted_sugar_spike < 180 else 0  # <180 mg/dL is safe
        risk_level = "Low" if predicted_sugar_spike < 140 else "Medium" if predicted_sugar_spike < 180 else "High"
        
        # Create enhanced log entry
        log_entry = {
            # Food info
            'Food Name': food_row['Food Name'],
            'Glycemic Index': food_row['Glycemic Index'],
            'Calories': food_row['Calories'],
            'Carbohydrates': food_row['Carbohydrates'],
            'Protein': food_row['Protein'],
            'Fat': food_row['Fat'],
            'Fiber Content': food_row['Fiber Content'],
            'Sodium Content': food_row['Sodium Content'],
            'Potassium Content': food_row['Potassium Content'],
            'Magnesium Content': food_row['Magnesium Content'],
            'Calcium Content': food_row['Calcium Content'],
            'Original_Suitable_for_Diabetes': food_row['Suitable for Diabetes'],
            
            # User context
            'age': round(age),
            'bmi': round(bmi, 1),
            'sugar_fasting': round(sugar_fasting, 1),
            'sugar_post_lunch': round(sugar_post_lunch, 1),
            
            # Meal context
            'portion_grams': round(portion_grams, 1),
            'meal_time': meal_time,
            'time_since_last_meal': round(time_since_last_meal, 1),
            
            # Scaled nutritional values
            'scaled_calories': round(scaled_calories, 1),
            'scaled_carbs': round(scaled_carbs, 1),
            'scaled_protein': round(food_row['Protein'] * scale_factor, 1),
            'scaled_fat': round(food_row['Fat'] * scale_factor, 1),
            'scaled_fiber': round(food_row['Fiber Content'] * scale_factor, 1),
            
            # Prediction targets
            'predicted_sugar_spike': round(predicted_sugar_spike, 1),
            'is_safe': is_safe,
            'risk_level': risk_level,
            'confidence_score': calculate_confidence(scaled_gi, scaled_carbs, sugar_fasting)
        }
        
        synthetic_logs.append(log_entry)
    
    # Create enhanced dataset
    enhanced_df = pd.DataFrame(synthetic_logs)
    enhanced_df.to_csv('data/enhanced_meal_logs.csv', index=False)
    
    print(f"Enhanced dataset created: {len(enhanced_df)} user meal logs")
    print(f"Safe meals: {enhanced_df['is_safe'].sum()} ({enhanced_df['is_safe'].mean()*100:.1f}%)")
    print(f"Risky meals: {len(enhanced_df) - enhanced_df['is_safe'].sum()}")
    
    return enhanced_df

def predict_sugar_spike(sugar_fasting, sugar_post_lunch, gi, carbs, portion_grams, age, bmi):
    """
    Domain-based sugar spike prediction using medical rules
    """
    base_spike = sugar_post_lunch
    
    # GI impact (30% weight)
    if gi > 70:
        base_spike += 40
    elif gi > 55:
        base_spike += 20
    elif gi < 30:
        base_spike -= 10
    
    # Carb load impact (25% weight)
    carb_load = carbs
    if carb_load > 60:
        base_spike += 35
    elif carb_load > 30:
        base_spike += 15
    
    # Portion size impact (20% weight)
    if portion_grams > 300:
        base_spike += 25
    elif portion_grams > 200:
        base_spike += 10
    
    # Individual factors (25% weight)
    if sugar_fasting > 130:  # Pre-diabetic
        base_spike += 20
    if bmi > 30:  # Obese
        base_spike += 15
    if age > 50:  # Age factor
        base_spike += 10
    
    # Add some randomness
    base_spike += np.random.normal(0, 10)
    
    return max(base_spike, sugar_post_lunch)  # Can't be lower than baseline

def calculate_confidence(gi, carbs, sugar_fasting):
    """Calculate prediction confidence based on input reliability"""
    confidence = 0.8
    
    # Lower confidence for edge cases
    if gi > 100 or gi < 0:
        confidence -= 0.2
    if carbs > 100:
        confidence -= 0.1
    if sugar_fasting > 200 or sugar_fasting < 70:
        confidence -= 0.2
    
    return max(0.3, min(0.99, confidence))

if __name__ == "__main__":
    enhanced_df = enhance_dataset()
    print("\n=== Dataset Enhancement Completed ===")

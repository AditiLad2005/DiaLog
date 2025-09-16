"""
Test realistic portion sizes and medical recommendations for diabetic patients
Based on actual doctor recommendations and common serving units
"""
from improved_model_system import MealSafetyPredictor
import pandas as pd

def test_medical_portions():
    print("🩺 Testing Medical Portion Recommendations for Diabetics")
    print("=" * 60)
    
    # Initialize predictor
    predictor = MealSafetyPredictor()
    predictor.load_food_dataset('data/Food_Master_Dataset_.csv')
    predictor.load_model('models/')
    
    # Standard user profile (moderate diabetes)
    user_data = {
        'age': 40,
        'gender': 'Male',
        'bmi': 27,
        'fasting_sugar': 115,
        'post_meal_sugar': 145,
        'time_of_day': 'Lunch'
    }
    
    # Medical portion recommendations based on diabetes guidelines
    medical_tests = [
        # VEGETABLES (Should be SAFE - doctors recommend 2-3 cups/day)
        {
            "category": "🥬 VEGETABLES (Should be SAFE)",
            "tests": [
                ("Mixed vegetables", 200, "1 large cup", "SAFE - vegetables are encouraged"),
                ("Green leafy vegetables curry", 150, "1 cup", "SAFE - high fiber, low carb"),
                ("Cauliflower curry", 200, "1 large serving", "SAFE - low carb vegetable"),
                ("Cabbage curry", 200, "1 large serving", "SAFE - cruciferous vegetable"),
            ]
        },
        
        # LENTILS/PULSES (Should be SAFE to CAUTION - good protein source)
        {
            "category": "🫘 LENTILS/PULSES (Should be SAFE-CAUTION)",
            "tests": [
                ("Whole moong (Moong ki dal)", 150, "1 cup cooked", "SAFE - doctors recommend"),
                ("Mixed dal", 150, "1 cup cooked", "SAFE - good protein source"),
                ("Washed moong dal (Dhuli moong ki dal)", 150, "1 cup cooked", "SAFE - easy to digest"),
                ("Whole masoor (Masoor ki dal)", 150, "1 cup cooked", "SAFE - high protein"),
            ]
        },
        
        # GRAINS (Should be CAUTION - portion controlled)
        {
            "category": "🌾 GRAINS (Should be SAFE-CAUTION in moderation)",
            "tests": [
                ("Brown rice", 100, "1/2 cup cooked", "CAUTION - controlled portions"),
                ("Wheat roti/chapati", 60, "2 medium rotis", "SAFE-CAUTION - whole grain"),
                ("Oats porridge", 150, "1 bowl", "SAFE - high fiber"),
            ]
        },
        
        # DESSERTS/SWEETS (Should be UNSAFE - avoid)
        {
            "category": "🍰 DESSERTS (Should be UNSAFE)",
            "tests": [
                ("Plain cream cake", 80, "1 small slice", "UNSAFE - high sugar"),
                ("Gulab jamun", 60, "2 pieces", "UNSAFE - fried + sugar syrup"),
                ("Ice cream", 100, "1 small scoop", "UNSAFE - high sugar"),
            ]
        }
    ]
    
    print("Testing realistic medical portions vs system predictions:\n")
    
    # Run tests
    for category_info in medical_tests:
        print(f"{category_info['category']}")
        print("-" * 50)
        
        for food_name, portion_g, portion_desc, medical_expectation in category_info["tests"]:
            try:
                # Find the food in dataset
                matching_foods = [f for f in predictor.food_df.index if food_name.lower() in f.lower()]
                
                if matching_foods:
                    actual_food = matching_foods[0]
                    result = predictor.predict_meal_safety(actual_food, portion_g, user_data)
                    
                    risk = result['risk_level'].upper()
                    explanation = result['explanation']
                    
                    # Extract GL for analysis
                    gl_value = "?"
                    for part in explanation.split(','):
                        if 'GL=' in part:
                            gl_value = part.strip().split('GL=')[1].split()[0]
                            break
                    
                    print(f"   {food_name[:25]:<25} ({portion_desc})")
                    print(f"      Result: {risk:<8} | GL: {gl_value:<6} | Expected: {medical_expectation}")
                    
                    # Flag issues
                    if "Should be SAFE" in medical_expectation and risk == "UNSAFE":
                        print(f"      ⚠️  ISSUE: Healthy food flagged as UNSAFE!")
                    elif "Should be UNSAFE" in medical_expectation and risk == "SAFE":
                        print(f"      ⚠️  ISSUE: Unhealthy food flagged as SAFE!")
                    
                    print()
                else:
                    print(f"   {food_name}: NOT FOUND in dataset")
                    print()
                    
            except Exception as e:
                print(f"   {food_name}: ERROR - {e}")
                print()
    
    print("\n" + "=" * 60)
    print("🎯 MEDICAL REALITY CHECK:")
    print("   - Vegetables (non-starchy): Should be SAFE even in large portions")
    print("   - Lentils/Dal: Should be SAFE in 1-cup portions (good for diabetes)")
    print("   - Whole grains: Should be SAFE-CAUTION in controlled portions")
    print("   - Desserts/Sweets: Should be UNSAFE even in small portions")
    
if __name__ == "__main__":
    test_medical_portions()

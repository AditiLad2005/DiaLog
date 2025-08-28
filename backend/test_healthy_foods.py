"""
Test script to analyze healthy food behavior and identify constraint issues
"""
from improved_model_system import MealSafetyPredictor
import pandas as pd

def test_healthy_foods():
    print("🥗 Testing Healthy Diabetes-Friendly Foods")
    print("=" * 50)
    
    # Initialize predictor
    predictor = MealSafetyPredictor()
    predictor.load_food_dataset('data/Food_Master_Dataset_.csv')
    
    # Test healthy foods that should be SAFE even in moderate large portions
    healthy_test_cases = [
        {
            "name": "Whole moong (Moong ki dal)",
            "portion": 250,  # 2.5x normal
            "expected": "Should be SAFE/CAUTION - lentils are diabetes-friendly"
        },
        {
            "name": "Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)", 
            "portion": 250,  # 2.5x normal
            "expected": "Should be SAFE/CAUTION - low GI vegetable"
        },
        {
            "name": "Mixed dal",
            "portion": 200,  # 2x normal
            "expected": "Should be SAFE - protein rich, good for diabetes"
        },
        {
            "name": "Stuffed okra (Bharwa bhindi)",
            "portion": 200,  # 2x normal  
            "expected": "Should be SAFE/CAUTION - vegetable based"
        }
    ]
    
    user_data = {
        'age': 35,
        'gender': 'Male', 
        'bmi': 26,
        'fasting_sugar': 110,
        'post_meal_sugar': 140,
        'time_of_day': 'Lunch'
    }
    
    print("🔍 Current Behavior Analysis:")
    for test_case in healthy_test_cases:
        try:
            result = predictor.predict_meal_safety(
                test_case["name"], 
                test_case["portion"], 
                user_data
            )
            
            # Extract key metrics from explanation
            explanation = result['explanation']
            gl_value = "Unknown"
            sugar_value = "Unknown"
            
            for part in explanation.split(','):
                if 'GL=' in part:
                    gl_value = part.strip().split('GL=')[1]
                if 'sugar=' in part:
                    sugar_value = part.strip().split('sugar=')[1].split(' ')[0]
            
            print(f"\n🍽️ {test_case['name']}")
            print(f"   Portion: {test_case['portion']}g ({test_case['portion']/100}x)")
            print(f"   Current Result: {result['risk_level'].upper()}")
            print(f"   GL: {gl_value} | Sugar: {sugar_value}")
            print(f"   Expected: {test_case['expected']}")
            
            # Check if this is incorrectly flagged
            if result['risk_level'] == 'unsafe' and ('dal' in test_case['name'].lower() or 'okra' in test_case['name'].lower() or 'bhindi' in test_case['name'].lower()):
                print(f"   ⚠️ ISSUE: Healthy food flagged as UNSAFE!")
                print(f"   Explanation: {explanation[:150]}...")
                
        except Exception as e:
            print(f"\n❌ {test_case['name']}: {e}")
    
    # Check food dataset for 'avoid_for_diabetic' marking
    print(f"\n📊 Dataset Analysis:")
    food_df = predictor.food_df
    
    for test_case in healthy_test_cases:
        try:
            if test_case['name'] in food_df.index:
                food_row = food_df.loc[test_case['name']]
                avoid_diabetic = food_row.get('avoid_for_diabetic', 'unknown')
                gi = food_row.get('glycemic_index', 'unknown')
                print(f"   {test_case['name'][:30]}: avoid_diabetic={avoid_diabetic}, GI={gi}")
        except:
            pass

if __name__ == "__main__":
    test_healthy_foods()

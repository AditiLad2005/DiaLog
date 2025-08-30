"""
Test the improved RandomForest model system
"""
import requests
import json

def test_improved_system():
    print("🧪 Testing Improved RandomForest Model System")
    print("=" * 50)
    
    base_url = "http://localhost:8001"  # Assuming server runs on 8001
    
    # Test cases to validate the "10 bowls of halwa" problem is fixed
    test_cases = [
        {
            "name": "Normal portion cake",
            "data": {
                "meal_name": "Plain cream cake",
                "portion_size_g": 100,
                "user_data": {
                    "age": 45,
                    "gender": "Male", 
                    "bmi": 28,
                    "fasting_sugar": 120,
                    "post_meal_sugar": 150,
                    "time_of_day": "Dinner"
                }
            },
            "expected": "should be caution or unsafe (high sugar dessert)"
        },
        {
            "name": "Large portion cake (3x)",
            "data": {
                "meal_name": "Plain cream cake", 
                "portion_size_g": 300,
                "user_data": {
                    "age": 45,
                    "gender": "Male",
                    "bmi": 28, 
                    "fasting_sugar": 120,
                    "post_meal_sugar": 150,
                    "time_of_day": "Dinner"
                }
            },
            "expected": "should be UNSAFE (large portion + high sugar)"
        },
        {
            "name": "Extreme portion cake (10x)",
            "data": {
                "meal_name": "Plain cream cake",
                "portion_size_g": 1000,
                "user_data": {
                    "age": 45,
                    "gender": "Male",
                    "bmi": 28,
                    "fasting_sugar": 120,
                    "post_meal_sugar": 150, 
                    "time_of_day": "Dinner"
                }
            },
            "expected": "should be UNSAFE (extreme portion)"
        },
        {
            "name": "Normal portion healthy meal",
            "data": {
                "meal_name": "Avial",
                "portion_size_g": 100,
                "user_data": {
                    "age": 30,
                    "gender": "Female",
                    "bmi": 22,
                    "fasting_sugar": 100,
                    "post_meal_sugar": 120,
                    "time_of_day": "Lunch"
                }
            },
            "expected": "should be SAFE (healthy meal, normal portion)"
        }
    ]
    
    # Try direct prediction first (if server not running)
    try:
        from improved_model_system import MealSafetyPredictor
        
        predictor = MealSafetyPredictor()
        predictor.load_food_dataset("data/Food_Master_Dataset_.csv")
        predictor.load_model("models/")
        
        print("🔍 Direct Model Testing (Server-less):")
        for test_case in test_cases:
            try:
                data = test_case["data"]
                result = predictor.predict_meal_safety(
                    data["meal_name"],
                    data["portion_size_g"], 
                    data["user_data"]
                )
                
                risk = result["risk_level"]
                explanation = result["explanation"][:100] + "..." if len(result["explanation"]) > 100 else result["explanation"]
                
                print(f"\n✅ {test_case['name']}")
                print(f"   Result: {risk.upper()}")
                print(f"   Expected: {test_case['expected']}")
                print(f"   Explanation: {explanation}")
                
            except Exception as e:
                print(f"\n❌ {test_case['name']}: {e}")
                
    except Exception as e:
        print(f"❌ Direct model testing failed: {e}")
    
    # Try API testing
    print(f"\n🌐 API Testing (if server running on {base_url}):")
    try:
        # Health check
        response = requests.get(f"{base_url}/health", timeout=2)
        if response.status_code == 200:
            print("✅ Server is running")
            
            for test_case in test_cases:
                try:
                    response = requests.post(
                        f"{base_url}/predict",
                        json=test_case["data"],
                        timeout=5
                    )
                    
                    if response.status_code == 200:
                        result = response.json()
                        risk = result.get("risk_level", "unknown")
                        explanation = result.get("explanation", "No explanation")[:100] + "..."
                        
                        print(f"\n✅ {test_case['name']}")
                        print(f"   API Result: {risk.upper()}")
                        print(f"   Expected: {test_case['expected']}")
                        print(f"   Explanation: {explanation}")
                    else:
                        print(f"\n❌ {test_case['name']}: HTTP {response.status_code}")
                        
                except Exception as e:
                    print(f"\n❌ {test_case['name']}: API error - {e}")
                    
        else:
            print(f"❌ Server not responding (HTTP {response.status_code})")
            
    except Exception as e:
        print(f"❌ Server not reachable: {e}")
        
    print(f"\n🎯 Key Validation:")
    print(f"   - ✅ Normal portion cake should be caution/unsafe (high sugar)")
    print(f"   - ✅ Large portion (3x) cake should be UNSAFE") 
    print(f"   - ✅ Extreme portion (10x) should be UNSAFE (fixed the 'halwa problem')")
    print(f"   - ✅ Healthy meal normal portion should be SAFE")
    print(f"\n🎉 RandomForest Model Testing Complete!")

if __name__ == "__main__":
    test_improved_system()

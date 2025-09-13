import requests
import json

# Test the truly personalized recommendations endpoint
url = "http://localhost:8002/truly-personalized-recommendations"

# Test with a user from the dataset (user_id: 52 from the first row we saw)
test_request = {
    "user_id": 52,
    "age": 29,
    "gender": "Male", 
    "weight_kg": 53.5,
    "height_cm": 159.5,
    "fasting_sugar": 150,
    "post_meal_sugar": 199,
    "diabetes_type": "Prediabetic",
    "time_of_day": "Lunch",
    "count": 5
}

print("🔄 Testing truly personalized recommendations...")
print(f"Request: {json.dumps(test_request, indent=2)}")

try:
    response = requests.post(url, json=test_request, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ SUCCESS! Personalized recommendations received:")
        print(f"📊 Personalization Status: {result['personalization']['personalization_note']}")
        print(f"👤 User Model: {'YES' if result['personalization']['has_personal_model'] else 'NO'}")
        print(f"📈 Meal Count: {result['personalization']['meal_count']}")
        print(f"💡 Personal Insights: {result['personalization']['personal_insights']}")
        
        print("\n🍽️ RECOMMENDATIONS:")
        for i, rec in enumerate(result['recommendations'], 1):
            print(f"\n{i}. {rec['name']}")
            print(f"   🎯 Predicted Blood Sugar: {rec['predicted_blood_sugar']} mg/dl")
            print(f"   ⚡ Risk Level: {rec['risk_level']}")
            print(f"   💬 Personalized Reason: {rec['personalized_reason']}")
            print(f"   🍎 Nutrition: {rec['carbs']}g carbs, {rec['protein']}g protein")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Connection error: {e}")

# Also test a user without personal model to see fallback
print("\n" + "="*60)
print("🔄 Testing user without personal model (fallback)...")

test_request_new_user = {
    "user_id": 999,  # User not in dataset
    "age": 35,
    "gender": "Female",
    "weight_kg": 65,
    "height_cm": 160,
    "fasting_sugar": 110,
    "post_meal_sugar": 140,
    "diabetes_type": "Type2",
    "time_of_day": "Breakfast",
    "count": 3
}

try:
    response = requests.post(url, json=test_request_new_user, timeout=30)
    
    if response.status_code == 200:
        result = response.json()
        print("\n✅ Fallback recommendations received:")
        print(f"📊 Personalization Status: {result['personalization']['personalization_note']}")
        print(f"👤 User Model: {'YES' if result['personalization']['has_personal_model'] else 'NO'}")
        print(f"💡 Personal Insights: {result['personalization']['personal_insights']}")
        
        print("\n🍽️ FALLBACK RECOMMENDATIONS:")
        for i, rec in enumerate(result['recommendations'], 1):
            print(f"{i}. {rec['name']} - {rec['risk_level']}")
            if 'personalized_reason' in rec:
                print(f"   💬 Reason: {rec['personalized_reason']}")
    else:
        print(f"❌ Error: {response.status_code}")
        print(response.text)
        
except Exception as e:
    print(f"❌ Connection error: {e}")

print("\n🎉 Test completed!")
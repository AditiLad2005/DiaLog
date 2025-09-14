import json

# Simple test data for user 52 (from the dataset)
test_data = {
    "user_id": 52,
    "age": 29,
    "gender": "Male", 
    "weight_kg": 53.5,
    "height_cm": 159.5,
    "fasting_sugar": 150,
    "post_meal_sugar": 199,
    "diabetes_type": "Prediabetic",
    "time_of_day": "Lunch",
    "count": 3
}

print("Test data for truly personalized recommendations:")
print(json.dumps(test_data, indent=2))

print("\nTo test manually:")
print("curl -X POST http://localhost:8002/truly-personalized-recommendations \\")
print("  -H 'Content-Type: application/json' \\")
print(f"  -d '{json.dumps(test_data)}'")

print("\nAlternatively, you can use this PowerShell command:")
print("Invoke-RestMethod -Uri 'http://localhost:8002/truly-personalized-recommendations' -Method POST -ContentType 'application/json' -Body '" + json.dumps(test_data) + "'")
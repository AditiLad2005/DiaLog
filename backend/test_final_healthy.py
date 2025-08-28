from improved_model_system import MealSafetyPredictor

p = MealSafetyPredictor()
p.load_food_dataset('data/Food_Master_Dataset_.csv')
p.load_model('models/')

user_data = {'age': 35, 'gender': 'Male', 'bmi': 26, 'fasting_sugar': 110, 'post_meal_sugar': 140, 'time_of_day': 'Lunch'}

print("🥗 Testing Diabetes-Friendly Foods at Various Portions:")
print("=" * 60)

test_cases = [
    ("Arhar dal (alternative)", "Whole moong (Moong ki dal)", 200, "2 bowls of dal"),
    ("Bhindi", "Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)", 250, "2.5x bhindi"),
    ("Mixed dal", "Mixed dal", 200, "2 bowls mixed dal"),
    ("Large bhindi", "Okra/Lady's fingers fry (Bhindi sabzi/sabji/subji)", 300, "3x bhindi portion"),
    ("Normal cake (control)", "Plain cream cake", 100, "Normal cake portion")
]

for name, food, portion, description in test_cases:
    result = p.predict_meal_safety(food, portion, user_data)
    risk = result['risk_level'].upper()
    
    # Extract key metrics
    explanation = result['explanation']
    gl_val = "Unknown"
    for part in explanation.split(','):
        if 'GL=' in part:
            gl_val = part.strip().split('GL=')[1]
            break
    
    print(f"\n🍽️ {description}")
    print(f"   Food: {name}")
    print(f"   Portion: {portion}g ({portion/100}x)")
    print(f"   Result: {risk}")
    print(f"   GL: {gl_val}")
    
    if 'dal' in food.lower() or 'okra' in food.lower() or 'bhindi' in food.lower():
        if risk == 'UNSAFE':
            print(f"   ⚠️ Issue: Healthy food flagged as unsafe!")
        elif risk == 'SAFE':
            print(f"   ✅ Good: Healthy food correctly identified as safe")
        else:
            print(f"   ⚪ Acceptable: Healthy food flagged as caution (reasonable)")

print(f"\n🎯 Summary: Healthy foods (dal, bhindi) should be SAFE at reasonable portions")
print(f"   - 2 bowls of dal (2x): Should be SAFE ✓")
print(f"   - 2.5x bhindi: Should be SAFE or CAUTION ✓") 
print(f"   - Only extreme portions (5x+) should be UNSAFE")

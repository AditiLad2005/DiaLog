from improved_model_system import MealSafetyPredictor

p = MealSafetyPredictor()
p.load_food_dataset('data/Food_Master_Dataset_.csv')
p.load_model('models/')

user_data = {'age': 35, 'gender': 'Male', 'bmi': 25, 'fasting_sugar': 110, 'post_meal_sugar': 140, 'time_of_day': 'Lunch'}

print("Normal Portion Tests:")
foods = ['Whole moong (Moong ki dal)', 'Mixed dal', 'Stuffed okra (Bharwa bhindi)']

for food in foods:
    result = p.predict_meal_safety(food, 100, user_data)
    print(f"{food[:20]}: {result['risk_level']}")
    
print("\nLarge Portion Tests (2x):")
for food in foods:
    result = p.predict_meal_safety(food, 200, user_data)
    print(f"{food[:20]}: {result['risk_level']}")

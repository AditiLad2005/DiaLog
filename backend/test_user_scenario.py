"""
Test Exact User Scenario
"""

from improved_model_system import MealSafetyPredictor

p = MealSafetyPredictor()
p.load_food_dataset('data/Food_Master_Dataset_.csv')
p.load_model('models/')

# Test the exact scenario from user's message
food_name = 'Black channa curry/Bengal gram curry (Kale chane ki curry)'
user_data = {'age': 45, 'gender': 'Male', 'bmi': 28, 'fasting_sugar': 120, 'time_of_day': 'Lunch'}

# Find what portion gives 2.5× multiplier and GL=10.9
food_row = p.food_df.loc[food_name]
serving_size = food_row.get('serving_size_g', 100)
target_portion = int(serving_size * 2.5)  # 2.5× normal

print(f'🎯 TESTING EXACT SCENARIO FROM USER MESSAGE')
print(f'Serving size: {serving_size}g')
print(f'2.5× portion: {target_portion}g')
print()

result = p.predict_meal_safety(food_name, target_portion, user_data)
print(f'Prediction: {result["risk_level"].upper()}')
print(f'Confidence: {result["confidence"]:.1%}') 
print(f'Explanation: {result["explanation"]}')
print()

# Also test common bowl sizes that should be SAFE
print('🥣 TESTING COMMON BOWL/KATORI/PLATE SIZES:')
realistic_portions = [
    (110, '1 katori'),
    (180, '1 bowl'), 
    (250, '1 plate'),
    (200, '1 cup')
]

for portion, desc in realistic_portions:
    result = p.predict_meal_safety(food_name, portion, user_data)
    status = '✅' if result['risk_level'] == 'safe' else '⚠️' if result['risk_level'] == 'caution' else '❌'
    print(f'{status} {portion}g ({desc}): {result["risk_level"].upper()}')

print()
print('🔍 CHECKING IF ISSUE IS WITH OTHER FOODS:')
test_foods = [
    'Washed moong dal (Dhuli moong ki dal)',
    'Soyabean curry',
    'Chickpeas curry (Safed channa curry)'
]

for food in test_foods:
    result = p.predict_meal_safety(food, 180, user_data)  # 1 bowl
    status = '✅' if result['risk_level'] == 'safe' else '⚠️' if result['risk_level'] == 'caution' else '❌'
    print(f'{status} {food[:40]} (1 bowl): {result["risk_level"].upper()}')

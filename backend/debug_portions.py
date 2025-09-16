"""
Debug Portion Calculations
"""

from improved_model_system import MealSafetyPredictor

# Initialize predictor
p = MealSafetyPredictor()
p.load_food_dataset('data/Food_Master_Dataset_.csv')
p.load_model('models/')

# Test food
food_name = 'Black channa curry/Bengal gram curry (Kale chane ki curry)'
food_row = p.food_df.loc[food_name]

print('🔍 DEBUGGING PORTION CALCULATIONS')
print('=' * 50)
print(f'Food: {food_name}')
print(f'Dataset columns: {list(food_row.index)}')
print(f'Serving size: {food_row.get("serving_size_g", "N/A")}g')
print(f'GL per 100g: {food_row.get("glycemic_load", "N/A")}')
print(f'Sugar per 100g: {food_row.get("sugar_g", "N/A")}g')
print(f'GI: {food_row.get("glycemic_index", "N/A")}')
print()

# Test realistic portions that should be SAFE
portions = [
    (100, '2/3 cup'),
    (150, '1 cup'),
    (180, '1 bowl'),
    (200, '1.25 cups')
]

user_data = {
    'age': 45, 'gender': 'Male', 'bmi': 26, 
    'fasting_sugar': 110, 'time_of_day': 'Lunch'
}

print('🧪 TESTING REALISTIC PORTIONS:')
print('=' * 35)

for portion_g, description in portions:
    # Get portion features
    portion_features = p.compute_portion_features(food_row, portion_g)
    
    # Get full prediction
    result = p.predict_meal_safety(food_name, portion_g, user_data)
    
    print(f'{portion_g}g ({description}):')
    print(f'  Portion multiplier: {portion_features["portion_multiplier"]:.2f}×')
    print(f'  GL portion: {portion_features["GL_portion"]:.1f}')
    print(f'  Sugar effective: {portion_features["sugar_effective_g"]:.1f}g')
    print(f'  Prediction: {result["risk_level"].upper()}')
    print(f'  Confidence: {result["confidence"]:.1%}')
    print(f'  Guardrail triggered: {result["guardrail_triggered"]}')
    if result["reasons"]:
        print(f'  Reasons: {", ".join(result["reasons"])}')
    print()

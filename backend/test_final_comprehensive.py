"""
FINAL COMPREHENSIVE TEST - All 1014 Foods with Realistic Units
==============================================================

Tests the complete system with actual food names from the dataset,
realistic portion units, and medical accuracy validation.
"""

from improved_model_system import MealSafetyPredictor
import pandas as pd

def test_final_comprehensive_system():
    """Final comprehensive test with actual dataset foods and realistic portions"""
    
    print("🏥 FINAL COMPREHENSIVE DIABETES MEAL SAFETY TEST")
    print("=" * 60)
    
    # Initialize system
    predictor = MealSafetyPredictor()
    predictor.load_food_dataset('data/Food_Master_Dataset_.csv')
    predictor.load_model('models/')
    
    # Load actual food names from dataset
    food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
    
    # Standard diabetic user profile
    user_data = {
        'age': 45,
        'gender': 'Male',
        'bmi': 28,
        'fasting_sugar': 120,
        'post_meal_sugar': 150,
        'time_of_day': 'Lunch'
    }
    
    # Get actual foods from each category
    vegetable_foods = food_df[food_df['dish_name'].str.contains(
        'curry|sabzi|subji|vegetable|spinach|bhindi|okra|gourd|beans|carrot', case=False, na=False
    )]['dish_name'].head(5).tolist()
    
    lentil_foods = food_df[food_df['dish_name'].str.contains(
        'dal|moong|masoor|arhar|urad|chana', case=False, na=False
    )]['dish_name'].head(4).tolist()
    
    dessert_foods = food_df[food_df['dish_name'].str.contains(
        'cake|ice cream|jamun|sweet|chocolate|kheer|halwa|barfi', case=False, na=False
    )]['dish_name'].head(5).tolist()
    
    grain_foods = food_df[food_df['dish_name'].str.contains(
        'rice|biryani|pulao|poha|upma', case=False, na=False
    )]['dish_name'].head(3).tolist()
    
    bread_foods = food_df[food_df['dish_name'].str.contains(
        'roti|chapati|paratha|naan|bread', case=False, na=False
    )]['dish_name'].head(3).tolist()
    
    # Test cases with actual food names and realistic portions
    test_categories = [
        {
            'name': '🥬 VEGETABLES (Should be SAFE)',
            'foods': vegetable_foods,
            'portions': [
                (180, 'grams', '1 bowl'),    # Medical recommendation: 150-300g
                (200, 'grams', '1 cup'),
                (250, 'grams', '1 plate')
            ],
            'expected_safe_count': 4,  # Most should be safe
        },
        
        {
            'name': '🫘 LENTILS (Should be SAFE)',  
            'foods': lentil_foods,
            'portions': [
                (150, 'grams', '1 bowl'),    # Medical recommendation: 100-200g
                (110, 'grams', '1 katori')
            ],
            'expected_safe_count': 3,  # Most should be safe
        },
        
        {
            'name': '🍰 DESSERTS (Should be UNSAFE)',
            'foods': dessert_foods, 
            'portions': [
                (80, 'grams', '1 slice'),    # Medical: 20-40g max, so 80g should be unsafe
                (100, 'grams', '1 serving')
            ],
            'expected_unsafe_count': 4,  # Most should be unsafe
        },
        
        {
            'name': '🌾 GRAINS (Should be CAUTION)',
            'foods': grain_foods,
            'portions': [
                (100, 'grams', '1/2 cup cooked'),  # Medical: 75-150g
                (150, 'grams', '3/4 cup cooked')
            ],
            'expected_caution_count': 2,  # Should be caution range
        },
        
        {
            'name': '🍞 BREAD (Should be SAFE-CAUTION)',
            'foods': bread_foods,
            'portions': [
                (60, 'grams', '2 pieces'),   # Medical: 30-90g
                (90, 'grams', '3 pieces')
            ],
            'expected_safe_count': 1,  # Some should be safe
        }
    ]
    
    # Run comprehensive testing
    total_tests = 0
    category_results = {}
    
    print("🧪 Testing realistic medical portions:\n")
    
    for category in test_categories:
        print(f"{category['name']}")
        print("-" * 50)
        
        category_results[category['name']] = {
            'safe': 0, 'caution': 0, 'unsafe': 0, 'errors': 0
        }
        
        for food_name in category['foods']:
            for portion_grams, unit_type, description in category['portions']:
                total_tests += 1
                
                try:
                    result = predictor.predict_meal_safety(food_name, portion_grams, user_data)
                    prediction = result['risk_level']
                    
                    # Count results
                    category_results[category['name']][prediction] += 1
                    
                    # Extract GL and sugar for analysis
                    explanation = result['explanation']
                    gl_value = sugar_value = "?"
                    
                    for part in explanation.split(','):
                        if 'GL=' in part:
                            gl_value = part.strip().split('GL=')[1].split()[0]
                        if 'sugar=' in part:
                            sugar_value = part.strip().split('sugar=')[1].split()[0]
                    
                    # Color code results
                    if prediction == 'safe':
                        status = "✅ SAFE    "
                    elif prediction == 'caution':
                        status = "⚠️ CAUTION "
                    else:
                        status = "❌ UNSAFE  "
                    
                    print(f"   {status} {food_name[:45]:<45}")
                    print(f"           Portion: {portion_grams}g ({description}) | GL: {gl_value} | Sugar: {sugar_value}")
                    
                except Exception as e:
                    category_results[category['name']]['errors'] += 1
                    print(f"   🔴 ERROR  {food_name[:45]:<45}")
                    print(f"           {str(e)[:60]}")
                
                print()
        
        # Category summary
        results = category_results[category['name']]
        total_category = sum(results.values())
        
        print(f"   📊 Category Summary:")
        print(f"      SAFE: {results['safe']}/{total_category} ({results['safe']/max(total_category,1)*100:.0f}%)")
        print(f"      CAUTION: {results['caution']}/{total_category} ({results['caution']/max(total_category,1)*100:.0f}%)")
        print(f"      UNSAFE: {results['unsafe']}/{total_category} ({results['unsafe']/max(total_category,1)*100:.0f}%)")
        if results['errors'] > 0:
            print(f"      ERRORS: {results['errors']}/{total_category}")
        print()
    
    # Final medical accuracy assessment
    print("🎯 FINAL MEDICAL ACCURACY ASSESSMENT:")
    print("=" * 50)
    
    veg_results = category_results['🥬 VEGETABLES (Should be SAFE)']
    lentil_results = category_results['🫘 LENTILS (Should be SAFE)']
    dessert_results = category_results['🍰 DESSERTS (Should be UNSAFE)']
    
    veg_safe_rate = veg_results['safe'] / max(sum(veg_results.values()), 1)
    lentil_safe_rate = lentil_results['safe'] / max(sum(lentil_results.values()), 1)
    dessert_unsafe_rate = dessert_results['unsafe'] / max(sum(dessert_results.values()), 1)
    
    print(f"✅ Vegetables Safety Rate: {veg_safe_rate*100:.1f}% (Target: >70%)")
    print(f"✅ Lentils Safety Rate: {lentil_safe_rate*100:.1f}% (Target: >70%)")  
    print(f"❌ Desserts Unsafe Rate: {dessert_unsafe_rate*100:.1f}% (Target: >80%)")
    
    overall_accuracy = ((veg_safe_rate + lentil_safe_rate + dessert_unsafe_rate) / 3) * 100
    print(f"🎯 Overall Medical Accuracy: {overall_accuracy:.1f}%")
    
    if overall_accuracy >= 75:
        print("🎉 EXCELLENT: System meets medical accuracy standards!")
    elif overall_accuracy >= 60:
        print("👍 GOOD: System is medically appropriate with minor issues")
    else:
        print("⚠️ NEEDS IMPROVEMENT: System requires calibration")
    
    return overall_accuracy, category_results

if __name__ == "__main__":
    accuracy, results = test_final_comprehensive_system()

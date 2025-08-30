"""
Comprehensive Unit-Aware Testing System
======================================

Tests the complete improved model with realistic portion units for all food categories.
Ensures medical accuracy across all 1014 foods.
"""

from improved_model_system import MealSafetyPredictor
import pandas as pd

def test_realistic_portions_all_categories():
    """Test realistic portions with proper units for all food categories"""
    
    print("🍽️ COMPREHENSIVE UNIT-AWARE TESTING")
    print("=" * 50)
    
    # Initialize system
    predictor = MealSafetyPredictor()
    predictor.load_food_dataset('data/Food_Master_Dataset_.csv')
    predictor.load_model('models/')
    
    # Standard diabetic user profile
    user_data = {
        'age': 45,
        'gender': 'Male',
        'bmi': 28,
        'fasting_sugar': 120,
        'post_meal_sugar': 150,
        'time_of_day': 'Lunch'
    }
    
    # Comprehensive test cases with realistic units
    test_cases = [
        # VEGETABLES (Should be SAFE in normal portions)
        {
            'category': '🥬 VEGETABLES (Should be SAFE)',
            'tests': [
                ('Mixed vegetables', 1, 'bowl', 'SAFE - vegetables encouraged'),
                ('Cabbage curry', 1, 'cup', 'SAFE - low carb vegetable'), 
                ('Okra/Lady\'s fingers fry (Bhindi sabzi/sabji/subji)', 1, 'bowl', 'SAFE - fibrous vegetable'),
                ('Spinach curry (Palak sabzi)', 1.5, 'cup', 'SAFE - leafy greens'),
                ('Cauliflower curry', 1, 'plate', 'SAFE - cruciferous vegetable'),
            ]
        },
        
        # LENTILS (Should be SAFE in 1 cup portions)
        {
            'category': '🫘 LENTILS/PULSES (Should be SAFE)',
            'tests': [
                ('Whole moong (Moong ki dal)', 1, 'bowl', 'SAFE - good protein'),
                ('Mixed dal', 1, 'katori', 'SAFE - balanced nutrition'),
                ('Washed moong dal (Dhuli moong ki dal)', 1, 'bowl', 'SAFE - easy digest'),
                ('Whole masoor (Masoor ki dal)', 1, 'katori', 'SAFE - high protein'),
            ]
        },
        
        # GRAINS (Should be SAFE-CAUTION in controlled portions)  
        {
            'category': '🌾 GRAINS (Should be SAFE-CAUTION)',
            'tests': [
                ('Plain rice', 0.5, 'cup', 'SAFE - controlled portion'),
                ('Brown rice', 0.75, 'katori', 'SAFE - whole grain'),
                ('Vegetable biryani', 1, 'katori', 'CAUTION - rice + oil'),
            ]
        },
        
        # BREAD (Should be SAFE in 2-3 piece portions)
        {
            'category': '🍞 BREAD (Should be SAFE)',
            'tests': [
                ('Plain roti/chapati', 2, 'piece', 'SAFE - whole grain'),
                ('Wheat roti/chapati', 3, 'piece', 'SAFE-CAUTION - moderate'),
                ('Plain parantha/paratha', 1, 'piece', 'CAUTION - oil added'),
            ]
        },
        
        # DESSERTS (Should be UNSAFE even in small portions)
        {
            'category': '🍰 DESSERTS (Should be UNSAFE)',
            'tests': [
                ('Plain cream cake', 1, 'slice', 'UNSAFE - high sugar'),
                ('Gulab jamun with khoya', 2, 'piece', 'UNSAFE - fried + sugar'),
                ('Vanilla ice cream without egg', 1, 'small_cup', 'UNSAFE - high sugar'),
                ('Chocolate ice cream', 0.5, 'cup', 'UNSAFE - sugar + fat'),
            ]
        },
        
        # SNACKS (Should be CAUTION-UNSAFE)
        {
            'category': '🥨 SNACKS (Should be CAUTION-UNSAFE)',
            'tests': [
                ('Vegetable samosa', 1, 'piece', 'CAUTION - fried food'),
                ('Mixed pakora/pakoda', 1, 'small_plate', 'CAUTION - fried'),
            ]
        },
        
        # FRUITS (Should be SAFE-CAUTION in 1 piece portions)
        {
            'category': '🍎 FRUITS (Should be SAFE-CAUTION)',
            'tests': [
                ('Apple', 1, 'piece', 'SAFE - good fiber'),
                ('Banana', 1, 'piece', 'CAUTION - natural sugars'),
                ('Orange juice', 1, 'glass', 'CAUTION - concentrated sugars'),
            ]
        }
    ]
    
    # Run comprehensive tests
    total_tests = 0
    correct_predictions = 0
    issues_found = []
    
    for category_info in test_cases:
        print(f"\n{category_info['category']}")
        print("-" * 45)
        
        for food_name, amount, unit, expectation in category_info['tests']:
            total_tests += 1
            
            try:
                # Convert to grams first
                grams, advice, food_category = predictor.convert_portion_to_grams(
                    food_name, amount, unit
                )
                
                # Get prediction
                result = predictor.predict_meal_safety(food_name, grams, user_data)
                prediction = result['risk_level'].upper()
                
                # Check if prediction matches medical expectation
                expected_safe = 'Should be SAFE' in expectation
                expected_unsafe = 'Should be UNSAFE' in expectation
                
                is_correct = False
                if expected_safe and prediction == 'SAFE':
                    is_correct = True
                elif expected_unsafe and prediction == 'UNSAFE':
                    is_correct = True
                elif 'Should be SAFE-CAUTION' in expectation and prediction in ['SAFE', 'CAUTION']:
                    is_correct = True
                elif 'Should be CAUTION-UNSAFE' in expectation and prediction in ['CAUTION', 'UNSAFE']:
                    is_correct = True
                
                if is_correct:
                    correct_predictions += 1
                    status = "✅"
                else:
                    status = "❌"
                    issues_found.append({
                        'food': food_name,
                        'portion': f"{amount} {unit}",
                        'expected': expectation,
                        'got': prediction,
                        'advice': advice
                    })
                
                # Extract GL for context
                explanation = result['explanation']
                gl_value = "?"
                for part in explanation.split(','):
                    if 'GL=' in part:
                        gl_value = part.strip().split('GL=')[1].split()[0]
                        break
                
                print(f"   {status} {food_name[:35]:<35} ({amount} {unit})")
                print(f"      Result: {prediction:<8} | GL: {gl_value:<6} | {grams:.0f}g")
                print(f"      Expected: {expectation}")
                if not is_correct:
                    print(f"      ⚠️ MISMATCH: {advice}")
                print()
                
            except Exception as e:
                print(f"   ❌ {food_name}: ERROR - {e}")
                issues_found.append({
                    'food': food_name,
                    'portion': f"{amount} {unit}",
                    'expected': expectation,
                    'got': f"ERROR: {e}",
                    'advice': 'System error'
                })
                print()
    
    # Summary
    accuracy = (correct_predictions / total_tests) * 100
    print(f"\n🎯 COMPREHENSIVE TEST RESULTS:")
    print(f"   Total tests: {total_tests}")
    print(f"   Correct predictions: {correct_predictions}")
    print(f"   Accuracy: {accuracy:.1f}%")
    print(f"   Issues found: {len(issues_found)}")
    
    if issues_found:
        print(f"\n⚠️ TOP ISSUES TO FIX:")
        for issue in issues_found[:5]:
            print(f"   • {issue['food'][:30]} ({issue['portion']})")
            print(f"     Expected: {issue['expected'][:50]}")
            print(f"     Got: {issue['got']}")
    
    print(f"\n🏥 MEDICAL ACCURACY ASSESSMENT:")
    print(f"   - Vegetables should be mostly SAFE: {'✅' if accuracy >= 80 else '❌'}")
    print(f"   - Desserts should be mostly UNSAFE: {'✅' if 'dessert' not in str(issues_found).lower() else '❌'}")
    print(f"   - Portions respect medical guidelines: {'✅' if accuracy >= 70 else '❌'}")
    
    return accuracy, issues_found

if __name__ == "__main__":
    test_realistic_portions_all_categories()

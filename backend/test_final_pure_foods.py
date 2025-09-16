"""
FINAL TEST - Pure Foods Only (No Mixed/Processed)
=================================================

Tests with actual pure vegetables, dal, and desserts for medical accuracy
"""

from improved_model_system import MealSafetyPredictor

def test_final_pure_foods():
    """Test with pure foods only for maximum medical accuracy"""
    
    print("🏥 FINAL TEST - PURE FOODS ONLY")
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
    
    # Pure food categories
    test_cases = [
        {
            'category': '🥬 PURE VEGETABLES (Should be SAFE)',
            'foods': [
                'Black channa curry/Bengal gram curry (Kale chane ki curry)',
                'Chickpeas curry (Safed channa curry)', 
                'Lobia curry',
                'Soyabean curry',
                'Split bengal gram with bottle gourd (Channa dal with ghiya/lauki)'
            ],
            'portions': [(180, 'grams', '1 bowl')],
            'expected': 'SAFE'
        },
        
        {
            'category': '🫘 PURE LENTILS (Should be SAFE)',
            'foods': [
                'Dal parantha/paratha',
                'Dal stuffed poori',
                'Moong dal stuffed cheela/chilla (Moong dal ka cheela/chilla)'
            ],
            'portions': [(150, 'grams', '1 bowl')],
            'expected': 'SAFE'
        },
        
        {
            'category': '🍰 PURE DESSERTS (Should be UNSAFE)', 
            'foods': [
                'Cold coffee with ice cream',
                'Moong dal kheer',
                'Moong dal halwa'
            ],
            'portions': [(100, 'grams', '1 serving')],
            'expected': 'UNSAFE'
        }
    ]
    
    # Test each category
    total_correct = 0
    total_tests = 0
    
    for test_case in test_cases:
        print(f"\n{test_case['category']}")
        print("-" * 45)
        
        category_correct = 0
        category_total = 0
        
        for food_name in test_case['foods']:
            for portion_grams, unit_type, description in test_case['portions']:
                try:
                    result = predictor.predict_meal_safety(food_name, portion_grams, user_data)
                    prediction = result['risk_level'].upper()
                    expected = test_case['expected']
                    
                    # Check if prediction matches medical expectation
                    is_correct = prediction == expected
                    if is_correct:
                        category_correct += 1
                        total_correct += 1
                        status = "✅"
                    else:
                        status = "❌"
                    
                    category_total += 1
                    total_tests += 1
                    
                    print(f"   {status} {food_name[:50]:<50}")
                    print(f"      Expected: {expected:<8} | Got: {prediction:<8} | Portion: {portion_grams}g ({description})")
                    
                    # Show reasoning
                    explanation = result['explanation']
                    reasons = result.get('reasons', [])
                    if 'GL=' in explanation:
                        gl_part = explanation.split('GL=')[1].split(',')[0].strip()
                        reason_text = ', '.join(reasons) if reasons else 'Model prediction'
                        print(f"      Reasoning: GL={gl_part} | {reason_text[:60]}")
                    else:
                        reason_text = ', '.join(reasons) if reasons else result['explanation'][:80]
                        print(f"      Reasoning: {reason_text}")
                    
                except Exception as e:
                    print(f"   🔴 ERROR  {food_name[:50]:<50}")
                    print(f"      {str(e)[:60]}")
                    category_total += 1
                    total_tests += 1
        
        # Category accuracy
        accuracy = (category_correct / max(category_total, 1)) * 100
        print(f"\n   📊 Category Accuracy: {category_correct}/{category_total} ({accuracy:.1f}%)")
    
    # Final results
    overall_accuracy = (total_correct / max(total_tests, 1)) * 100
    print(f"\n🎯 OVERALL MEDICAL ACCURACY: {total_correct}/{total_tests} ({overall_accuracy:.1f}%)")
    
    if overall_accuracy >= 80:
        print("🎉 EXCELLENT: System meets medical standards!")
    elif overall_accuracy >= 70: 
        print("👍 GOOD: System is medically appropriate")
    else:
        print("⚠️ NEEDS IMPROVEMENT: System requires further calibration")
    
    return overall_accuracy

if __name__ == "__main__":
    accuracy = test_final_pure_foods()

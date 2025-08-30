#!/usr/bin/env python3
"""Quick test of the improved portion-aware system"""

from improved_model_system import MealSafetyPredictor

def test_portion_awareness():
    """Test that portion scaling works correctly"""
    print("🧪 Testing Portion-Aware Features")
    print("=" * 40)
    
    # Load predictor
    predictor = MealSafetyPredictor()
    predictor.load_food_dataset('data/Food_Master_Dataset_.csv')
    
    # Test with a high-sugar dessert
    food_name = 'Plain cream cake'
    if food_name in predictor.food_df.index:
        food_row = predictor.food_df.loc[food_name]
        
        # Compare 1x vs 10x portion
        portion_1x = predictor.compute_portion_features(food_row, 100)   # 1 serving
        portion_10x = predictor.compute_portion_features(food_row, 1000) # 10 servings
        
        print(f"🍰 {food_name}:")
        print(f"  1× portion:  GL={portion_1x['GL_portion']:.1f}, sugar={portion_1x['sugar_effective_g']:.0f}g")
        print(f"  10× portion: GL={portion_10x['GL_portion']:.1f}, sugar={portion_10x['sugar_effective_g']:.0f}g")
        
        # Test guardrails
        user_data = {'age': 45, 'bmi': 25, 'fasting_sugar': 100}
        risk_1x, reasons_1x = predictor.apply_hard_guardrails(food_row, portion_1x, user_data)
        risk_10x, reasons_10x = predictor.apply_hard_guardrails(food_row, portion_10x, user_data)
        
        print(f"  1× risk:  {risk_1x.value if risk_1x else 'None'}")
        print(f"  10× risk: {risk_10x.value if risk_10x else 'None'}")
        
        if risk_10x and risk_10x.value == 'unsafe':
            print("✅ Guardrails correctly catch extreme portions!")
        else:
            print("❌ Guardrails may need adjustment")
            
    else:
        print(f"❌ Food '{food_name}' not found in dataset")

if __name__ == "__main__":
    test_portion_awareness()

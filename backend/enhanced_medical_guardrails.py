"""
ENHANCED MEDICAL GUARDRAILS - Diabetes-Safe Meal Prediction
============================================================

Simple, evidence-based guardrails that follow actual medical recommendations:
1. Vegetables: 2-3 cups/day recommended - should be SAFE unless extreme portions
2. Desserts: High sugar content - should be UNSAFE unless very small portions  
3. Lentils/Dal: Protein + fiber - should be SAFE with normal portions
4. Grains: Need portion control - CAUTION for normal portions
5. Bread: Need portion control - CAUTION for normal portions
"""

def get_enhanced_medical_guardrails(food_row, portion_features, user_context=None):
    """
    Enhanced medical guardrails based on actual diabetes management guidelines
    
    Returns: (risk_level, reasons)
    """
    from improved_model_system import RiskLevel
    
    reasons = []
    risk_level = None
    
    # Extract features
    portion_multiplier = portion_features.get('portion_multiplier', 1.0)
    GL_portion = portion_features.get('GL_portion', 0)
    sugar_effective_g = portion_features.get('sugar_effective_g', 0)
    calories_effective_kcal = portion_features.get('calories_effective_kcal', 0)
    
    # Get food name for categorization
    food_name_lower = str(food_row.name).lower()
    
    # Medical food categories
    is_vegetable = any(keyword in food_name_lower for keyword in [
        'vegetable', 'sabzi', 'subji', 'cabbage', 'cauliflower', 'spinach', 
        'broccoli', 'beans', 'carrot', 'beetroot', 'tomato', 'cucumber', 
        'onion', 'capsicum', 'bell pepper', 'leafy', 'greens', 'bhindi', 
        'okra', 'brinjal', 'eggplant', 'gourd', 'pumpkin', 'radish',
        'stock', 'soup'  # Added vegetable soups/stocks
    ])
    
    is_lentil = any(keyword in food_name_lower for keyword in [
        'dal', 'moong', 'masoor', 'arhar', 'urad', 'chana', 'lentil',
        'chickpea', 'split pea', 'daliya', 'porridge'
    ])
    
    is_dessert = any(keyword in food_name_lower for keyword in [
        'cake', 'ice cream', 'jamun', 'sweet', 'chocolate', 'caramel',
        'kheer', 'halwa', 'laddu', 'barfi', 'rasgulla', 'kulfi', 'pastry',
        'cookie', 'biscuit', 'mithai', 'gulab', 'jalebi', 'lassi'
    ])
    
    is_grain = any(keyword in food_name_lower for keyword in [
        'rice', 'biryani', 'pulao', 'poha', 'upma', 'flakes', 'murmura'
    ])
    
    is_bread = any(keyword in food_name_lower for keyword in [
        'roti', 'chapati', 'paratha', 'naan', 'bread'
    ])
    
    # MEDICAL GUIDELINE 1: VEGETABLES - Doctors recommend 2-3 cups/day
    if is_vegetable and not is_dessert:
        # Vegetables should almost always be SAFE
        if GL_portion <= 15 and sugar_effective_g <= 12:
            # Most vegetables are safe even in large portions
            if portion_multiplier >= 4.0:
                risk_level = RiskLevel.CAUTION
                reasons.append(f"Very large vegetable portion ({portion_multiplier:.1f}×) - generally healthy but excessive")
            else:
                risk_level = RiskLevel.SAFE
                reasons.append(f"Healthy vegetable - doctors recommend 2-3 cups daily")
        elif GL_portion <= 25 and sugar_effective_g <= 20:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"Vegetable with moderate GL/sugar - still generally healthy")
        else:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"High GL/sugar vegetable preparation - check ingredients")
    
    # MEDICAL GUIDELINE 2: LENTILS/DAL - High protein, high fiber, recommended
    elif is_lentil and not is_dessert:
        # Lentils are diabetes-friendly protein sources
        if GL_portion <= 20 and sugar_effective_g <= 15:
            if portion_multiplier >= 3.0:
                risk_level = RiskLevel.CAUTION
                reasons.append(f"Large lentil portion ({portion_multiplier:.1f}×) - generally healthy protein")
            else:
                risk_level = RiskLevel.SAFE
                reasons.append(f"Healthy lentil/dal - good protein and fiber source")
        elif GL_portion <= 35:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"Moderate GL lentil preparation - watch portion")
        else:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"High GL lentil dish - may have added sugars/refined ingredients")
    
    # MEDICAL GUIDELINE 3: DESSERTS - High sugar, limit strictly
    elif is_dessert:
        sugar_per_100g = food_row.get('sugar_g', 0)
        if sugar_per_100g >= 10 or sugar_effective_g >= 6:
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"High-sugar dessert ({sugar_effective_g:.1f}g sugar) - limit for diabetes")
        elif sugar_per_100g >= 5 or sugar_effective_g >= 3:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"Moderate-sugar dessert ({sugar_effective_g:.1f}g) - small portions only")
        else:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"Low-sugar dessert - still watch portion size")
    
    # MEDICAL GUIDELINE 4: GRAINS - Need portion control
    elif is_grain:
        if GL_portion <= 10:
            risk_level = RiskLevel.SAFE
            reasons.append(f"Reasonable grain portion (GL: {GL_portion:.1f})")
        elif GL_portion <= 20:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"Moderate grain portion (GL: {GL_portion:.1f}) - watch blood sugar")
        else:
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"High GL grain portion ({GL_portion:.1f}) - too much refined carbs")
    
    # MEDICAL GUIDELINE 5: BREAD - Need portion control  
    elif is_bread:
        if GL_portion <= 15:
            risk_level = RiskLevel.SAFE
            reasons.append(f"Reasonable bread portion (GL: {GL_portion:.1f})")
        elif GL_portion <= 25:
            risk_level = RiskLevel.CAUTION
            reasons.append(f"Moderate bread portion (GL: {GL_portion:.1f}) - watch blood sugar")
        else:
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"High GL bread portion ({GL_portion:.1f}) - too much refined flour")
    
    # EXTREME SAFETY CHECKS
    if sugar_effective_g >= 30:
        risk_level = RiskLevel.UNSAFE
        reasons.append(f"Very high sugar load ({sugar_effective_g:.1f}g) - dangerous for diabetes")
    elif GL_portion >= 40:
        risk_level = RiskLevel.UNSAFE
        reasons.append(f"Very high glycemic load ({GL_portion:.1f}) - will spike blood sugar")
    elif portion_multiplier >= 6.0:
        risk_level = RiskLevel.UNSAFE
        reasons.append(f"Extremely large portion ({portion_multiplier:.1f}×) - unsafe amount")
    
    return risk_level, reasons

# Test the enhanced guardrails
if __name__ == "__main__":
    print("Testing Enhanced Medical Guardrails...")
    
    # Mock data for testing
    import pandas as pd
    from types import SimpleNamespace
    
    test_foods = [
        ("Spinach curry", {"GL_portion": 8, "sugar_effective_g": 3, "portion_multiplier": 2.0}),
        ("Ice cream", {"GL_portion": 12, "sugar_effective_g": 15, "portion_multiplier": 1.0}),
        ("Dal", {"GL_portion": 15, "sugar_effective_g": 2, "portion_multiplier": 1.5}),
        ("Rice", {"GL_portion": 18, "sugar_effective_g": 1, "portion_multiplier": 1.2}),
        ("Chapati", {"GL_portion": 22, "sugar_effective_g": 1, "portion_multiplier": 1.0})
    ]
    
    for food_name, portion_features in test_foods:
        food_row = SimpleNamespace()
        food_row.name = food_name
        food_row.get = lambda k, default=0: 10 if k == 'sugar_g' and 'ice cream' in food_name else default
        
        risk, reasons = get_enhanced_medical_guardrails(food_row, portion_features)
        print(f"✓ {food_name}: {risk.value if risk else 'MODEL_DECIDE'} - {reasons}")

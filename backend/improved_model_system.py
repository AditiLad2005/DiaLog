"""
Improved Diabetes-Safe Meal Prediction System
============================================

This module implements:
1. Portion-aware feature engineering (computed at runtime)
2. Hard guardrails with medical/sanity constraints
3. Improved ML model with calibration
4. Explanation system for user trust

Features computed at runtime (not stored in CSV):
- portion_multiplier
- carbs_effective_g  
- sugar_effective_g
- calories_effective_kcal
- GL_portion (Glycemic Load adjusted for portion)
- fiber_to_carb_ratio
- protein_to_carb_ratio
- energy_density
"""

import numpy as np
import pandas as pd
from typing import Dict, List, Tuple, Optional
from enum import Enum
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import classification_report, roc_auc_score
import warnings
warnings.filterwarnings('ignore')


class RiskLevel(Enum):
    SAFE = "safe"
    CAUTION = "caution" 
    UNSAFE = "unsafe"


class MealSafetyPredictor:
    """
    Advanced meal safety prediction with hard guardrails and portion awareness.
    """
    
    def __init__(self):
        self.model = None
        self.scaler = None
        self.food_df = None
        self.feature_names = None
        self.is_trained = False
        
    def load_food_dataset(self, csv_path: str):
        """Load the Food Master Dataset."""
        self.food_df = pd.read_csv(csv_path)
        if 'dish_name' in self.food_df.columns:
            self.food_df.set_index('dish_name', inplace=True)
        print(f"✅ Loaded {len(self.food_df)} foods from dataset")
        
    def load_model(self, model_dir: str = "models/"):
        """Load trained model artifacts"""
        try:
            import joblib
            from pathlib import Path
            
            model_path = Path(model_dir)
            
            # Try improved model first, fallback to old naming
            try:
                self.model = joblib.load(model_path / "improved_diabetes_model.joblib")
                self.scaler = joblib.load(model_path / "improved_scaler.joblib")
                self.feature_names = joblib.load(model_path / "improved_feature_names.joblib")
                try:
                    self.optimal_threshold = joblib.load(model_path / "optimal_threshold.joblib")
                except:
                    self.optimal_threshold = 0.5
                print(f"✅ Loaded improved model from {model_path}")
            except:
                # Fallback to legacy naming
                self.model = joblib.load(model_path / "diabetes_model.joblib")
                self.scaler = joblib.load(model_path / "scaler.joblib")
                self.feature_names = joblib.load(model_path / "feature_columns.joblib")
                self.optimal_threshold = 0.5
                print(f"✅ Loaded legacy model from {model_path}")
                
            self.is_trained = True
            return True
            
        except Exception as e:
            print(f"❌ Failed to load model: {e}")
            return False
        
    def compute_portion_features(self, food_row: pd.Series, portion_size_g: float) -> Dict[str, float]:
        """
        Compute portion-aware features at runtime (don't edit CSV).
        
        Args:
            food_row: Row from Food_Master_Dataset_.csv
            portion_size_g: User's actual portion size in grams
            
        Returns:
            Dictionary of computed portion-aware features
        """
        # Get base nutritional values per serving
        serving_size_g = float(food_row.get('serving_size_g', 100))
        carbs_g = float(food_row.get('carbs_g', 0))
        sugar_g = float(food_row.get('sugar_g', 0))
        calories_kcal = float(food_row.get('calories_kcal', 0))
        protein_g = float(food_row.get('protein_g', 0))
        fiber_g = float(food_row.get('fiber_g', 0))
        glycemic_index = float(food_row.get('glycemic_index', 50))
        
        # Calculate portion multiplier
        portion_multiplier = portion_size_g / serving_size_g
        
        # Effective nutrients for this portion
        carbs_effective_g = carbs_g * portion_multiplier
        sugar_effective_g = sugar_g * portion_multiplier
        calories_effective_kcal = calories_kcal * portion_multiplier
        
        # Glycemic Load for this portion
        GL_portion = (carbs_effective_g * glycemic_index) / 100
        
        # Nutritional ratios (per serving, not portion-dependent)
        fiber_to_carb_ratio = fiber_g / max(1, carbs_g)
        protein_to_carb_ratio = protein_g / max(1, carbs_g)
        
        # Energy density (kcal per gram)
        energy_density = calories_kcal / serving_size_g if serving_size_g > 0 else 0
        
        return {
            'portion_multiplier': portion_multiplier,
            'carbs_effective_g': carbs_effective_g,
            'sugar_effective_g': sugar_effective_g,
            'calories_effective_kcal': calories_effective_kcal,
            'GL_portion': GL_portion,
            'fiber_to_carb_ratio': fiber_to_carb_ratio,
            'protein_to_carb_ratio': protein_to_carb_ratio,
            'energy_density': energy_density,
            'glycemic_index': glycemic_index,  # Keep existing
            'glycemic_load': float(food_row.get('glycemic_load', 0))  # Keep existing
        }
    
    def apply_hard_guardrails(self, food_row: pd.Series, portion_features: Dict[str, float], 
                            user_context: Dict[str, any] = None) -> Tuple[RiskLevel, List[str]]:
        """
        Apply deterministic medical/sanity rules before model prediction.
        
        Args:
            food_row: Row from food dataset
            portion_features: Computed portion-aware features
            user_context: Additional user context (BMI, diabetes type, etc.)
            
        Returns:
            (risk_level, reasons) - If UNSAFE/CAUTION, overrides model
        """
        reasons = []
        risk_level = None
        
        # Extract features
        portion_multiplier = portion_features['portion_multiplier']
        GL_portion = portion_features['GL_portion']
        sugar_effective_g = portion_features['sugar_effective_g']
        calories_effective_kcal = portion_features['calories_effective_kcal']
        avoid_for_diabetic = str(food_row.get('avoid_for_diabetic', '')).strip().lower() == 'yes'
        
        # Rule 1: Smart avoid-for-diabetic rule (consider nutritional context)
        if avoid_for_diabetic:
            # For truly healthy foods (very low GL and sugar), override dataset marking
            if GL_portion <= 8 and sugar_effective_g <= 10 and portion_multiplier <= 3.0:
                # These are actually diabetes-friendly despite dataset marking
                # Let model decide - don't apply harsh avoid_diabetic rules
                pass  
                
            # For truly high-risk foods (high sugar + high GL), be strict
            elif sugar_effective_g >= 25 and GL_portion >= 15:
                if portion_multiplier >= 1.0:
                    risk_level = RiskLevel.UNSAFE
                    reasons.append(f"High-risk 'avoid for diabetic' food: high sugar ({sugar_effective_g:.1f}g) + GL ({GL_portion:.1f})")
                else:
                    risk_level = RiskLevel.CAUTION
                    reasons.append(f"High-risk 'avoid for diabetic' food, small portion ({portion_multiplier:.1f}×)")
            
            # For moderate-risk foods (marked avoid but low-moderate GL), be more lenient
            elif GL_portion <= 15 and sugar_effective_g <= 20:
                if portion_multiplier >= 4.0:  # Much higher threshold for low-GL foods
                    risk_level = RiskLevel.UNSAFE
                    reasons.append(f"Excessive portion ({portion_multiplier:.1f}×) of 'avoid for diabetic' food")
                elif portion_multiplier >= 3.0:  # Changed from 2.5 to 3.0
                    risk_level = RiskLevel.CAUTION
                    reasons.append(f"Large portion ({portion_multiplier:.1f}×) of 'avoid for diabetic' food")
                # Otherwise, let model decide for healthy foods
                
            # For medium-risk foods
            else:
                if portion_multiplier >= 2.0:
                    risk_level = RiskLevel.UNSAFE
                    reasons.append(f"'Avoid for diabetic' food with moderate risk at large portion ({portion_multiplier:.1f}×)")
                elif portion_multiplier >= 1.5:
                    risk_level = RiskLevel.CAUTION
                    reasons.append(f"'Avoid for diabetic' food at elevated portion ({portion_multiplier:.1f}×)")
        
        # Rule 2: Extreme portion sanity check (updated thresholds)
        if portion_multiplier >= 5.0:  # Increased from 3.0 for truly extreme cases
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"Extreme portion size ({portion_multiplier:.1f}× ≥5.0)")
        elif portion_multiplier >= 3.0:  # New tier for very large portions
            # Only flag as unsafe if food has concerning nutritional profile
            if GL_portion >= 15 or sugar_effective_g >= 20:
                risk_level = RiskLevel.UNSAFE
                reasons.append(f"Very large portion ({portion_multiplier:.1f}×) with high GL/sugar")
            elif risk_level != RiskLevel.UNSAFE:
                risk_level = RiskLevel.CAUTION
                reasons.append(f"Very large portion size ({portion_multiplier:.1f}×, 3.0-4.9 range)")
        elif portion_multiplier >= 2.0:
            # Only flag healthy foods as caution, not unsafe
            if risk_level != RiskLevel.UNSAFE and (GL_portion >= 12 or sugar_effective_g >= 15):
                risk_level = RiskLevel.CAUTION
                reasons.append(f"Large portion ({portion_multiplier:.1f}×) with moderate GL/sugar")
        
        # Rule 3: Sugar load per meal (updated for medical accuracy)
        if sugar_effective_g >= 40:  # More lenient for healthy foods
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"Very high sugar load ({sugar_effective_g:.1f}g ≥40g)")
        elif sugar_effective_g >= 30:  # Adjusted CAUTION threshold
            if risk_level != RiskLevel.UNSAFE:
                risk_level = RiskLevel.CAUTION
            reasons.append(f"High sugar load ({sugar_effective_g:.1f}g, 30-39g range)")
        
        # Rule 4: Glycemic Load thresholds (per portion) - more lenient for healthy foods
        if GL_portion >= 25:  # Increased from 20 for very high GL foods
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"Very high glycemic load ({GL_portion:.1f} ≥25)")
        elif GL_portion >= 15:  # Increased from 11 for moderate GL
            if risk_level != RiskLevel.UNSAFE:
                risk_level = RiskLevel.CAUTION
            reasons.append(f"High glycemic load ({GL_portion:.1f}, 15-24 range)")
        
        # Rule 5: Calorie density check (unchanged)
        if calories_effective_kcal >= 800:
            risk_level = RiskLevel.UNSAFE
            reasons.append(f"Very high calorie meal ({calories_effective_kcal:.0f} ≥800 kcal)")
        elif calories_effective_kcal >= 700:
            if risk_level != RiskLevel.UNSAFE:
                risk_level = RiskLevel.CAUTION
            reasons.append(f"High calorie meal ({calories_effective_kcal:.0f}, 700-799 kcal)")
        
        return risk_level, reasons
    
    def prepare_features_for_model(self, food_row: pd.Series, portion_features: Dict[str, float], 
                                 user_data: Dict[str, any]) -> np.ndarray:
        """
        Prepare feature vector for ML model prediction.
        
        Focus on features that truly matter for diabetes safety.
        """
        # User factors
        age = float(user_data.get('age', 35))
        gender = 1 if user_data.get('gender', 'Male') == 'Male' else 0
        bmi = float(user_data.get('bmi', 25))
        fasting_sugar = float(user_data.get('fasting_sugar', 100))
        diabetes_type = user_data.get('diabetes_type', 'Type2')  # Could be encoded
        
        # Meal timing (encoded)
        time_of_day = user_data.get('time_of_day', 'Breakfast')
        time_encoded = {'Breakfast': 0, 'Lunch': 1, 'Dinner': 2, 'Snack': 3}.get(time_of_day, 0)
        
        # Portion-aware nutritional features (the key improvement)
        portion_multiplier = portion_features['portion_multiplier']
        carbs_effective_g = portion_features['carbs_effective_g']
        sugar_effective_g = portion_features['sugar_effective_g']
        GL_portion = portion_features['GL_portion']
        fiber_to_carb_ratio = portion_features['fiber_to_carb_ratio']
        protein_to_carb_ratio = portion_features['protein_to_carb_ratio']
        energy_density = portion_features['energy_density']
        glycemic_index = portion_features['glycemic_index']
        
        # Create feature vector
        features = [
            # User context
            age, gender, bmi, fasting_sugar, time_encoded,
            # Portion-aware nutritional features  
            portion_multiplier, carbs_effective_g, sugar_effective_g, GL_portion,
            # Nutritional quality ratios
            fiber_to_carb_ratio, protein_to_carb_ratio, energy_density,
            # Food properties
            glycemic_index
        ]
        
        return np.array([features])
    
    def predict_meal_safety(self, meal_name: str, portion_size_g: float, 
                          user_data: Dict[str, any]) -> Dict[str, any]:
        """
        Complete meal safety prediction with guardrails and explanations.
        
        Args:
            meal_name: Name of the meal/dish
            portion_size_g: Portion size in grams  
            user_data: User context (age, BMI, blood sugar, etc.)
            
        Returns:
            Comprehensive prediction result with explanations
        """
        if self.food_df is None:
            raise ValueError("Food dataset not loaded")
        
        if meal_name not in self.food_df.index:
            available = [food for food in self.food_df.index if meal_name.lower() in food.lower()][:5]
            raise ValueError(f"Food '{meal_name}' not found. Similar: {available}")
        
        # Get food data
        food_row = self.food_df.loc[meal_name]
        
        # Step 1: Compute portion-aware features
        portion_features = self.compute_portion_features(food_row, portion_size_g)
        
        # Step 2: Apply hard guardrails (medical rules)
        guardrail_risk, guardrail_reasons = self.apply_hard_guardrails(food_row, portion_features, user_data)
        
        # Step 3: Model prediction (if guardrails allow)
        model_prediction = None
        model_confidence = 0.0
        
        if self.model is not None and guardrail_risk != RiskLevel.UNSAFE:
            try:
                features = self.prepare_features_for_model(food_row, portion_features, user_data)
                if self.scaler:
                    features = self.scaler.transform(features)
                    
                # Get model prediction and probability
                pred_class = self.model.predict(features)[0]
                pred_proba = self.model.predict_proba(features)[0]
                model_confidence = float(max(pred_proba))
                model_prediction = RiskLevel.SAFE if pred_class == 1 else RiskLevel.CAUTION
            except Exception as e:
                print(f"⚠️ Model prediction failed: {e}")
                model_prediction = RiskLevel.CAUTION
                model_confidence = 0.5
        
        # Step 4: Final decision logic
        if guardrail_risk == RiskLevel.UNSAFE:
            # Hard rules override everything
            final_risk = RiskLevel.UNSAFE
            final_confidence = 0.95
        elif guardrail_risk == RiskLevel.CAUTION:
            # Keep caution unless model is very confident it's safe
            if model_prediction == RiskLevel.SAFE and model_confidence > 0.9:
                final_risk = RiskLevel.SAFE
                final_confidence = model_confidence * 0.8  # Reduce confidence due to guardrail
            else:
                final_risk = RiskLevel.CAUTION
                final_confidence = max(0.7, model_confidence)
        else:
            # No guardrail concerns - trust the model
            final_risk = model_prediction if model_prediction else RiskLevel.CAUTION
            final_confidence = model_confidence if model_confidence > 0 else 0.6
        
        # Step 5: Generate explanation
        explanation = self.generate_explanation(food_row, portion_features, guardrail_reasons, 
                                              final_risk, model_prediction, model_confidence)
        
        return {
            'risk_level': final_risk.value,
            'confidence': final_confidence,
            'explanation': explanation,
            'portion_features': portion_features,
            'guardrail_triggered': guardrail_risk is not None,
            'model_prediction': model_prediction.value if model_prediction else None,
            'reasons': guardrail_reasons
        }
    
    def generate_explanation(self, food_row: pd.Series, portion_features: Dict[str, float],
                           guardrail_reasons: List[str], final_risk: RiskLevel,
                           model_prediction: Optional[RiskLevel], model_confidence: float) -> str:
        """
        Generate human-readable explanation for the prediction.
        
        This builds user trust by showing the reasoning.
        """
        meal_name = food_row.name
        portion_mult = portion_features['portion_multiplier']
        GL_portion = portion_features['GL_portion']
        sugar_eff = portion_features['sugar_effective_g']
        
        explanation_parts = []
        
        # Portion context
        if portion_mult > 1.5:
            explanation_parts.append(f"Large portion ({portion_mult:.1f}× normal)")
        elif portion_mult < 0.5:
            explanation_parts.append(f"Small portion ({portion_mult:.1f}× normal)")
        else:
            explanation_parts.append(f"Normal portion ({portion_mult:.1f}×)")
        
        # Key metrics
        explanation_parts.append(f"GL={GL_portion:.1f}")
        if sugar_eff > 5:
            explanation_parts.append(f"sugar={sugar_eff:.0f}g")
        
        # Guardrail reasons
        if guardrail_reasons:
            explanation_parts.extend(guardrail_reasons)
        
        # Model input if used
        if model_prediction and len(guardrail_reasons) == 0:
            explanation_parts.append(f"Model: {model_prediction.value} ({model_confidence:.1%})")
        
        # Final decision reasoning
        if final_risk == RiskLevel.UNSAFE:
            result_text = "marked UNSAFE"
        elif final_risk == RiskLevel.CAUTION:
            result_text = "marked CAUTION" 
        else:
            result_text = "marked SAFE"
        
        return f"{meal_name}: {', '.join(explanation_parts)} → {result_text}."


# Utility functions for model training and testing
def create_acceptance_test_cases() -> List[Dict[str, any]]:
    """
    Create test cases to validate the guardrail system.
    
    Returns:
        List of test cases with expected outcomes
    """
    test_cases = [
        {
            'name': 'High GI, small portion',
            'meal': 'White rice',  # Assuming this exists in dataset
            'portion_g': 50,  # 0.5x normal
            'user': {'age': 45, 'bmi': 26, 'fasting_sugar': 110},
            'expected_risk': 'caution',  # GL ≤ 10 should be caution/safe
            'reason': 'Small portion should reduce GL'
        },
        {
            'name': 'High GI, big portion', 
            'meal': 'White rice',
            'portion_g': 200,  # 2x normal
            'user': {'age': 45, 'bmi': 26, 'fasting_sugar': 110},
            'expected_risk': 'unsafe',  # GL ≥ 20
            'reason': 'Large portion triggers GL≥20 rule'
        },
        {
            'name': 'High sugar dessert',
            'meal': 'Plain cream cake',  # From your CSV, has avoid_for_diabetic=Yes
            'portion_g': 100,  # 1x normal
            'user': {'age': 45, 'bmi': 26, 'fasting_sugar': 110},
            'expected_risk': 'unsafe',  # avoid_for_diabetic + normal portion
            'reason': 'Avoid-for-diabetic food at normal portion'
        },
        {
            'name': 'Extreme portion',
            'meal': 'Hot tea (Garam Chai)',  # Safe food
            'portion_g': 600,  # 3x normal (200g base)
            'user': {'age': 45, 'bmi': 26, 'fasting_sugar': 110},
            'expected_risk': 'unsafe',  # portion_multiplier ≥ 3.0
            'reason': 'Portion sanity rule (≥3x)'
        },
        {
            'name': 'High fiber salad',
            'meal': 'Avial',  # Vegetable dish from CSV
            'portion_g': 200,  # 2x normal
            'user': {'age': 45, 'bmi': 26, 'fasting_sugar': 110},
            'expected_risk': 'safe',  # Low GL, high fiber
            'reason': 'Vegetables with good fiber ratio'
        }
    ]
    
    return test_cases


def run_acceptance_tests(predictor: MealSafetyPredictor) -> Dict[str, any]:
    """
    Run acceptance tests on the prediction system.
    
    Args:
        predictor: Trained MealSafetyPredictor instance
        
    Returns:
        Test results summary
    """
    test_cases = create_acceptance_test_cases()
    results = {'passed': 0, 'failed': 0, 'details': []}
    
    print("🧪 Running Acceptance Tests...")
    print("=" * 50)
    
    for test_case in test_cases:
        try:
            prediction = predictor.predict_meal_safety(
                test_case['meal'],
                test_case['portion_g'], 
                test_case['user']
            )
            
            predicted_risk = prediction['risk_level']
            expected_risk = test_case['expected_risk']
            
            # Test passes if prediction matches expectation
            passed = predicted_risk == expected_risk
            
            if passed:
                results['passed'] += 1
                status = "✅ PASS"
            else:
                results['failed'] += 1  
                status = "❌ FAIL"
            
            result_detail = {
                'test_name': test_case['name'],
                'meal': test_case['meal'],
                'expected': expected_risk,
                'actual': predicted_risk,
                'passed': passed,
                'explanation': prediction['explanation']
            }
            results['details'].append(result_detail)
            
            print(f"{status} | {test_case['name']}")
            print(f"     Expected: {expected_risk}, Got: {predicted_risk}")
            print(f"     {prediction['explanation']}")
            print()
            
        except Exception as e:
            results['failed'] += 1
            print(f"❌ ERROR | {test_case['name']}: {e}")
    
    success_rate = results['passed'] / len(test_cases) * 100
    print(f"🎯 Test Results: {results['passed']}/{len(test_cases)} passed ({success_rate:.1f}%)")
    
    return results


if __name__ == "__main__":
    # Example usage
    predictor = MealSafetyPredictor()
    
    # Load your dataset
    predictor.load_food_dataset("data/Food_Master_Dataset_.csv")
    
    # Test the system
    user_data = {
        'age': 45,
        'gender': 'Male', 
        'bmi': 26.5,
        'fasting_sugar': 115,
        'time_of_day': 'Lunch'
    }
    
    # Example prediction
    result = predictor.predict_meal_safety("Plain cream cake", 100, user_data)
    print("🔍 Sample Prediction:")
    print(f"Risk: {result['risk_level']}")
    print(f"Confidence: {result['confidence']:.1%}")
    print(f"Explanation: {result['explanation']}")
    
    # Run acceptance tests
    # test_results = run_acceptance_tests(predictor)

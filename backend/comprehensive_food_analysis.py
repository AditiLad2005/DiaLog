"""
Comprehensive Food Unit and Portion Management System
==================================================

This system handles all 1014 foods with realistic portion units and medical accuracy for diabetic patients.
Based on actual medical recommendations and common Indian serving practices.
"""

from typing import Dict, Tuple, List
import pandas as pd
from enum import Enum

class ServingUnit(Enum):
    """Standard Indian serving units with gram conversions"""
    
    # Liquid units
    GLASS = "glass"          # 250ml = ~250g for most liquids
    CUP = "cup"              # 200ml = ~200g 
    SMALL_CUP = "small_cup"  # 150ml = ~150g
    
    # Solid food containers
    BOWL = "bowl"            # 150-200g typical Indian bowl
    KATORI = "katori"        # 100-120g small serving bowl
    PLATE = "plate"          # 200-300g depending on food type
    SMALL_PLATE = "small_plate"  # 150g
    
    # Specific units
    PIECE = "piece"          # Varies by food (roti=30g, samosa=50g, etc.)
    SLICE = "slice"          # Varies by food (cake=80g, bread=25g, etc.)
    TABLESPOON = "tbsp"      # 15g for most foods
    TEASPOON = "tsp"         # 5g for most foods
    
    # Weight units (fallback)
    GRAMS = "grams"
    

class FoodCategoryManager:
    """Manages food categorization and appropriate serving units"""
    
    def __init__(self):
        # Medical portion recommendations for diabetic patients (in grams)
        self.medical_portions = {
            # VEGETABLES (Encouraged - high portions OK)
            'vegetables': {
                'safe_range': (150, 300),      # 1-2 cups
                'caution_range': (300, 500),   # 2-3 cups  
                'unsafe_threshold': 600,       # 4+ cups
                'preferred_units': [ServingUnit.BOWL, ServingUnit.CUP, ServingUnit.PLATE]
            },
            
            # LENTILS/PULSES (Good protein - moderate portions)
            'lentils': {
                'safe_range': (100, 200),      # 1 cup cooked
                'caution_range': (200, 300),   # 1.5 cups
                'unsafe_threshold': 400,       # 2+ cups
                'preferred_units': [ServingUnit.BOWL, ServingUnit.KATORI]
            },
            
            # GRAINS/RICE (Controlled portions)
            'grains': {
                'safe_range': (75, 150),       # 1/2 - 3/4 cup cooked
                'caution_range': (150, 250),   # 1 cup cooked
                'unsafe_threshold': 300,       # 1.5+ cups
                'preferred_units': [ServingUnit.KATORI, ServingUnit.SMALL_PLATE]
            },
            
            # BREAD/ROTI (Controlled portions)
            'bread': {
                'safe_range': (30, 90),        # 1-3 medium rotis
                'caution_range': (90, 150),    # 3-5 rotis
                'unsafe_threshold': 200,       # 6+ rotis
                'preferred_units': [ServingUnit.PIECE]
            },
            
            # DAIRY (Moderate portions)
            'dairy': {
                'safe_range': (150, 250),      # 1 cup
                'caution_range': (250, 400),   # 1.5 cups
                'unsafe_threshold': 500,       # 2+ cups
                'preferred_units': [ServingUnit.GLASS, ServingUnit.CUP, ServingUnit.BOWL]
            },
            
            # FRUITS (Limited portions due to natural sugars)
            'fruits': {
                'safe_range': (100, 150),      # 1 medium fruit
                'caution_range': (150, 250),   # 1-2 fruits
                'unsafe_threshold': 300,       # 2+ fruits
                'preferred_units': [ServingUnit.PIECE, ServingUnit.BOWL, ServingUnit.CUP]
            },
            
            # SNACKS/FRIED (Very limited)
            'snacks': {
                'safe_range': (25, 50),        # Small handful
                'caution_range': (50, 100),    # 1 small plate
                'unsafe_threshold': 150,       # Large portion
                'preferred_units': [ServingUnit.SMALL_PLATE, ServingUnit.PIECE]
            },
            
            # DESSERTS/SWEETS (Minimal portions)
            'desserts': {
                'safe_range': (20, 40),        # 1 small piece
                'caution_range': (40, 80),     # 1-2 pieces
                'unsafe_threshold': 100,       # Large portion
                'preferred_units': [ServingUnit.PIECE, ServingUnit.SLICE, ServingUnit.SMALL_CUP]
            },
            
            # BEVERAGES (Variable)
            'beverages': {
                'safe_range': (150, 250),      # 1 cup
                'caution_range': (250, 400),   # 1.5 cups
                'unsafe_threshold': 500,       # 2+ cups
                'preferred_units': [ServingUnit.GLASS, ServingUnit.CUP]
            }
        }
        
        # Unit to gram conversions (approximate)
        self.unit_conversions = {
            ServingUnit.GLASS: 250,
            ServingUnit.CUP: 200,
            ServingUnit.SMALL_CUP: 150,
            ServingUnit.BOWL: 180,
            ServingUnit.KATORI: 110,
            ServingUnit.PLATE: 250,
            ServingUnit.SMALL_PLATE: 150,
            ServingUnit.TABLESPOON: 15,
            ServingUnit.TEASPOON: 5,
        }
    
    def categorize_food(self, food_name: str, food_row: pd.Series = None) -> str:
        """Categorize food based on name and nutritional profile"""
        name_lower = food_name.lower()
        
        # Desserts (highest priority - medical concern)
        dessert_keywords = [
            'cake', 'ice cream', 'jamun', 'sweet', 'chocolate', 'caramel',
            'kheer', 'halwa', 'laddu', 'barfi', 'rasgulla', 'kulfi', 'pastry',
            'cookie', 'biscuit', 'mithai', 'gulab', 'jalebi', 'rasmalai',
            'payasam', 'pudding', 'dessert', 'candy', 'toffee'
        ]
        if any(kw in name_lower for kw in dessert_keywords):
            return 'desserts'
        
        # Vegetables (encouraged for diabetes)
        vegetable_keywords = [
            'vegetables', 'cabbage', 'cauliflower', 'spinach', 'broccoli',
            'beans', 'carrot', 'beetroot', 'tomato', 'cucumber', 'onion',
            'capsicum', 'bell pepper', 'leafy', 'greens', 'bhindi', 'okra',
            'brinjal', 'eggplant', 'gourd', 'pumpkin', 'radish', 'palak',
            'methi', 'curry', 'sabzi', 'subji', 'fry', 'stir'
        ]
        if any(kw in name_lower for kw in vegetable_keywords) and 'rice' not in name_lower:
            return 'vegetables'
        
        # Lentils/Pulses (good protein for diabetes)
        lentil_keywords = [
            'dal', 'moong', 'masoor', 'arhar', 'toor', 'chana', 'urad',
            'lentil', 'pulse', 'gram', 'bengal'
        ]
        if any(kw in name_lower for kw in lentil_keywords):
            return 'lentils'
        
        # Grains and Rice (controlled portions)
        grain_keywords = [
            'rice', 'biryani', 'pulao', 'khichdi', 'poha', 'upma',
            'oats', 'quinoa', 'barley', 'wheat', 'grain'
        ]
        if any(kw in name_lower for kw in grain_keywords):
            return 'grains'
        
        # Bread/Roti
        bread_keywords = [
            'roti', 'chapati', 'naan', 'paratha', 'bread', 'puri',
            'kulcha', 'bhatura', 'dosa', 'uttapam', 'idli'
        ]
        if any(kw in name_lower for kw in bread_keywords):
            return 'bread'
        
        # Dairy
        dairy_keywords = [
            'milk', 'yogurt', 'curd', 'lassi', 'buttermilk', 'cheese',
            'paneer', 'ghee', 'butter', 'cream', 'dairy'
        ]
        if any(kw in name_lower for kw in dairy_keywords):
            return 'dairy'
        
        # Fruits
        fruit_keywords = [
            'apple', 'banana', 'orange', 'mango', 'grape', 'papaya',
            'pineapple', 'watermelon', 'melon', 'berry', 'fruit',
            'juice', 'smoothie'
        ]
        if any(kw in name_lower for kw in fruit_keywords):
            return 'fruits'
        
        # Snacks/Fried
        snack_keywords = [
            'samosa', 'pakora', 'bhaji', 'vada', 'kachori', 'chaat',
            'namkeen', 'mixture', 'chips', 'crackers', 'fried',
            'deep fried', 'snack'
        ]
        if any(kw in name_lower for kw in snack_keywords):
            return 'snacks'
        
        # Beverages
        beverage_keywords = [
            'tea', 'coffee', 'drink', 'beverage', 'shake', 'cola',
            'soda', 'water', 'soup', 'broth'
        ]
        if any(kw in name_lower for kw in beverage_keywords):
            return 'beverages'
        
        # Default to vegetables if unsure (safer for diabetes)
        return 'vegetables'
    
    def get_appropriate_portion_size(self, food_name: str, requested_amount: float, 
                                   requested_unit: str = "grams") -> Tuple[float, str]:
        """Convert requested portion to appropriate size and provide medical guidance"""
        
        category = self.categorize_food(food_name)
        guidelines = self.medical_portions.get(category, self.medical_portions['vegetables'])
        
        # Convert requested amount to grams if needed
        if requested_unit.lower() in ['cup', 'cups']:
            grams = requested_amount * self.unit_conversions[ServingUnit.CUP]
        elif requested_unit.lower() in ['bowl', 'bowls']:
            grams = requested_amount * self.unit_conversions[ServingUnit.BOWL]
        elif requested_unit.lower() in ['katori', 'katoris']:
            grams = requested_amount * self.unit_conversions[ServingUnit.KATORI]
        elif requested_unit.lower() in ['plate', 'plates']:
            grams = requested_amount * self.unit_conversions[ServingUnit.PLATE]
        elif requested_unit.lower() in ['glass', 'glasses']:
            grams = requested_amount * self.unit_conversions[ServingUnit.GLASS]
        elif requested_unit.lower() in ['piece', 'pieces']:
            # Estimate based on food type
            if category == 'bread':
                grams = requested_amount * 30  # Average roti
            elif category == 'desserts':
                grams = requested_amount * 50  # Average sweet
            elif category == 'snacks':
                grams = requested_amount * 40  # Average snack piece
            else:
                grams = requested_amount * 50  # Generic piece
        else:
            # Assume grams
            grams = requested_amount
        
        # Determine medical appropriateness
        safe_min, safe_max = guidelines['safe_range']
        caution_min, caution_max = guidelines['caution_range']
        unsafe_threshold = guidelines['unsafe_threshold']
        
        if grams <= safe_max:
            safety_level = "SAFE"
            advice = f"Good portion for {category}"
        elif grams <= caution_max:
            safety_level = "CAUTION"
            advice = f"Moderate portion - watch total daily {category} intake"
        else:
            safety_level = "UNSAFE"
            advice = f"Large portion - consider reducing to {safe_max}g or less"
        
        return grams, safety_level, advice, category


def analyze_complete_food_database():
    """Analyze all 1014 foods and create comprehensive portion guidance"""
    
    print("🍽️ COMPREHENSIVE FOOD DATABASE ANALYSIS")
    print("=" * 60)
    
    # Load the complete dataset
    food_df = pd.read_csv('data/Food_Master_Dataset_.csv')
    food_manager = FoodCategoryManager()
    
    # Analyze by category
    category_stats = {}
    problematic_foods = []
    
    print(f"📊 Analyzing all {len(food_df)} foods in database...\n")
    
    for idx, row in food_df.iterrows():
        food_name = row['dish_name']
        category = food_manager.categorize_food(food_name, row)
        
        if category not in category_stats:
            category_stats[category] = {
                'count': 0,
                'avg_sugar': 0,
                'avg_gi': 0,
                'high_risk_foods': []
            }
        
        category_stats[category]['count'] += 1
        
        # Check for potential issues
        sugar_g = row.get('sugar_g', 0)
        gi = row.get('glycemic_index', 0)
        avoid_diabetic = str(row.get('avoid_for_diabetic', '')).lower() == 'yes'
        
        category_stats[category]['avg_sugar'] += sugar_g
        category_stats[category]['avg_gi'] += gi
        
        # Flag foods that might need special attention
        if category == 'vegetables' and avoid_diabetic and sugar_g < 10:
            problematic_foods.append({
                'name': food_name,
                'issue': 'Healthy vegetable marked as avoid_diabetic',
                'sugar': sugar_g,
                'gi': gi
            })
        elif category == 'desserts' and not avoid_diabetic and sugar_g > 15:
            problematic_foods.append({
                'name': food_name,
                'issue': 'High-sugar dessert NOT marked as avoid_diabetic',
                'sugar': sugar_g,
                'gi': gi
            })
    
    # Calculate averages
    for category in category_stats:
        count = category_stats[category]['count']
        if count > 0:
            category_stats[category]['avg_sugar'] /= count
            category_stats[category]['avg_gi'] /= count
    
    # Print comprehensive analysis
    print("📈 CATEGORY BREAKDOWN:")
    print("-" * 40)
    
    for category, stats in sorted(category_stats.items(), key=lambda x: x[1]['count'], reverse=True):
        guidelines = food_manager.medical_portions[category]
        safe_range = guidelines['safe_range']
        
        print(f"\n🍽️  {category.upper()} ({stats['count']} foods)")
        print(f"   Average sugar: {stats['avg_sugar']:.1f}g per 100g")
        print(f"   Average GI: {stats['avg_gi']:.1f}")
        print(f"   Recommended portion: {safe_range[0]}-{safe_range[1]}g")
        print(f"   Preferred units: {[u.value for u in guidelines['preferred_units']]}")
    
    print(f"\n⚠️  POTENTIAL DATASET ISSUES ({len(problematic_foods)} foods):")
    print("-" * 50)
    for food in problematic_foods[:10]:  # Show first 10
        print(f"   • {food['name'][:40]:<40} | {food['issue']}")
        print(f"     Sugar: {food['sugar']:.1f}g, GI: {food['gi']}")
    
    if len(problematic_foods) > 10:
        print(f"   ... and {len(problematic_foods) - 10} more")
    
    return category_stats, problematic_foods


if __name__ == "__main__":
    analyze_complete_food_database()

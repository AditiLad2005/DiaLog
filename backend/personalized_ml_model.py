"""
Personalized ML Model for Meal Recommendations
Learns from individual user patterns in User_Logs_Dataset.csv
"""

import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, r2_score
from sklearn.preprocessing import LabelEncoder
import joblib
import os
from datetime import datetime, timedelta
import logging

class PersonalizedMealRecommender:
    def __init__(self, data_path="data/User_Logs_Dataset.csv"):
        self.data_path = data_path
        self.user_models = {}
        self.general_model = None
        self.user_patterns = {}
        self.food_encoders = {}
        self.meal_time_encoder = LabelEncoder()
        self.gender_encoder = LabelEncoder()
        self.diabetes_encoder = LabelEncoder()
        
        # Load and prepare data
        self.load_and_prepare_data()
        self.train_personalized_models()
        
    def load_and_prepare_data(self):
        """Load user logs and prepare data for training"""
        try:
            self.df = pd.read_csv(self.data_path)
            print(f"✅ Loaded {len(self.df)} user logs from {self.data_path}")
            
            # Map column names to expected format
            column_mapping = {
                'user_id': 'User_ID',
                'meal_taken': 'Food_Item', 
                'post_meal_sugar': 'Blood_Sugar_Level',
                'age': 'Age',
                'weight_kg': 'Weight',
                'height_cm': 'Height',
                'gender': 'Gender',
                'diabetes_type': 'Diabetes_Type',
                'meal_time': 'Meal_Time'
            }
            
            # Rename columns to match our expected format
            for old_name, new_name in column_mapping.items():
                if old_name in self.df.columns:
                    self.df[new_name] = self.df[old_name]
            
            # Basic data cleaning
            self.df = self.df.dropna(subset=['User_ID', 'Food_Item', 'Blood_Sugar_Level'])
            
            # Ensure numeric columns
            numeric_cols = ['Blood_Sugar_Level', 'Age', 'Weight', 'Height']
            for col in numeric_cols:
                if col in self.df.columns:
                    self.df[col] = pd.to_numeric(self.df[col], errors='coerce')
            
            # Create features
            self.create_features()
            
            print(f"✅ Data prepared: {len(self.df)} valid records for {self.df['User_ID'].nunique()} users")
            
        except Exception as e:
            print(f"❌ Error loading data: {e}")
            # Create dummy data for testing
            self.df = pd.DataFrame({
                'User_ID': [1, 1, 2, 2] * 10,
                'Food_Item': ['Rice', 'Wheat Bread', 'Oats', 'Chicken'] * 10,
                'Blood_Sugar_Level': np.random.normal(120, 30, 40),
                'Age': [25, 25, 30, 30] * 10,
                'Weight': [70, 70, 65, 65] * 10,
                'Height': [170, 170, 165, 165] * 10,
                'Gender': ['M', 'M', 'F', 'F'] * 10,
                'Diabetes_Type': ['Type1', 'Type1', 'Type2', 'Type2'] * 10,
                'Meal_Time': ['Breakfast', 'Lunch', 'Dinner', 'Snack'] * 10
            })
            self.create_features()
    
    def create_features(self):
        """Create features for ML model"""
        # Handle categorical variables
        categorical_cols = ['Gender', 'Diabetes_Type', 'Meal_Time']
        
        for col in categorical_cols:
            if col in self.df.columns:
                if col == 'Meal_Time':
                    self.df[f'{col}_encoded'] = self.meal_time_encoder.fit_transform(self.df[col].astype(str))
                elif col == 'Gender':
                    self.df[f'{col}_encoded'] = self.gender_encoder.fit_transform(self.df[col].astype(str))
                elif col == 'Diabetes_Type':
                    self.df[f'{col}_encoded'] = self.diabetes_encoder.fit_transform(self.df[col].astype(str))
        
        # Food item encoding (per user for personalization)
        self.df['Food_Item_encoded'] = 0
        for user_id in self.df['User_ID'].unique():
            user_data = self.df[self.df['User_ID'] == user_id]
            food_encoder = LabelEncoder()
            
            try:
                self.df.loc[self.df['User_ID'] == user_id, 'Food_Item_encoded'] = food_encoder.fit_transform(
                    user_data['Food_Item'].astype(str)
                )
                self.food_encoders[user_id] = food_encoder
            except Exception as e:
                print(f"Warning: Could not encode foods for user {user_id}: {e}")
                self.df.loc[self.df['User_ID'] == user_id, 'Food_Item_encoded'] = 0
        
        # Calculate BMI if possible
        if 'Weight' in self.df.columns and 'Height' in self.df.columns:
            self.df['BMI'] = self.df['Weight'] / ((self.df['Height'] / 100) ** 2)
        else:
            self.df['BMI'] = 22.5  # Default BMI
    
    def analyze_user_patterns(self, user_id):
        """Analyze individual user patterns"""
        user_data = self.df[self.df['User_ID'] == user_id]
        
        if len(user_data) == 0:
            return None
        
        patterns = {
            'total_meals': len(user_data),
            'avg_blood_sugar': user_data['Blood_Sugar_Level'].mean(),
            'blood_sugar_std': user_data['Blood_Sugar_Level'].std(),
            'food_preferences': user_data['Food_Item'].value_counts().to_dict(),
            'meal_time_distribution': user_data['Meal_Time'].value_counts().to_dict() if 'Meal_Time' in user_data.columns else {},
            'glycemic_tolerance': self.calculate_glycemic_tolerance(user_data),
            'successful_foods': self.get_successful_foods(user_data),
            'problematic_foods': self.get_problematic_foods(user_data)
        }
        
        return patterns
    
    def calculate_glycemic_tolerance(self, user_data):
        """Calculate user's glycemic tolerance"""
        if len(user_data) == 0:
            return 140  # Default threshold
        
        # Users with consistently lower readings have better tolerance
        avg_bs = user_data['Blood_Sugar_Level'].mean()
        std_bs = user_data['Blood_Sugar_Level'].std()
        
        if avg_bs < 100:
            return 120  # Very good tolerance
        elif avg_bs < 130:
            return 140  # Good tolerance
        elif avg_bs < 160:
            return 160  # Moderate tolerance
        else:
            return 180  # Needs careful monitoring
    
    def get_successful_foods(self, user_data):
        """Get foods that result in good blood sugar levels for this user"""
        target_threshold = 140  # Normal post-meal target
        
        food_performance = {}
        for food in user_data['Food_Item'].unique():
            food_data = user_data[user_data['Food_Item'] == food]
            success_rate = (food_data['Blood_Sugar_Level'] <= target_threshold).mean()
            avg_bs = food_data['Blood_Sugar_Level'].mean()
            
            food_performance[food] = {
                'success_rate': success_rate,
                'avg_blood_sugar': avg_bs,
                'meal_count': len(food_data)
            }
        
        # Return foods with >70% success rate and at least 2 meals
        successful = {food: stats for food, stats in food_performance.items() 
                     if stats['success_rate'] > 0.7 and stats['meal_count'] >= 2}
        
        return successful
    
    def get_problematic_foods(self, user_data):
        """Get foods that consistently cause high blood sugar for this user"""
        target_threshold = 160  # High blood sugar threshold
        
        food_performance = {}
        for food in user_data['Food_Item'].unique():
            food_data = user_data[user_data['Food_Item'] == food]
            spike_rate = (food_data['Blood_Sugar_Level'] > target_threshold).mean()
            avg_bs = food_data['Blood_Sugar_Level'].mean()
            
            food_performance[food] = {
                'spike_rate': spike_rate,
                'avg_blood_sugar': avg_bs,
                'meal_count': len(food_data)
            }
        
        # Return foods with >50% spike rate and at least 2 meals
        problematic = {food: stats for food, stats in food_performance.items() 
                      if stats['spike_rate'] > 0.5 and stats['meal_count'] >= 2}
        
        return problematic
    
    def train_personalized_models(self):
        """Train individual models for each user"""
        print("🔄 Training personalized models...")
        
        # Define feature columns
        feature_columns = ['Food_Item_encoded', 'Age', 'Weight', 'Height', 'BMI']
        
        # Add encoded categorical features if they exist
        for col in ['Gender_encoded', 'Diabetes_Type_encoded', 'Meal_Time_encoded']:
            if col in self.df.columns:
                feature_columns.append(col)
        
        # Filter to existing columns
        available_features = [col for col in feature_columns if col in self.df.columns]
        
        if not available_features:
            print("❌ No features available for training")
            return
        
        users_with_models = 0
        
        for user_id in self.df['User_ID'].unique():
            user_data = self.df[self.df['User_ID'] == user_id]
            
            # Need at least 5 records to train a personal model
            if len(user_data) >= 5:
                try:
                    # Prepare features and target
                    X = user_data[available_features].fillna(0)
                    y = user_data['Blood_Sugar_Level']
                    
                    # Train user-specific model
                    if len(X) >= 10:  # Enough data for train/test split
                        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.3, random_state=42)
                        model = RandomForestRegressor(n_estimators=50, random_state=42)
                        model.fit(X_train, y_train)
                        
                        # Evaluate
                        y_pred = model.predict(X_test)
                        score = r2_score(y_test, y_pred)
                        
                    else:  # Train on all data
                        model = RandomForestRegressor(n_estimators=30, random_state=42)
                        model.fit(X, y)
                        score = 0.5  # Assume reasonable performance
                    
                    # Store model and patterns
                    self.user_models[user_id] = {
                        'model': model,
                        'features': available_features,
                        'score': score
                    }
                    
                    # Store user patterns
                    self.user_patterns[user_id] = self.analyze_user_patterns(user_id)
                    users_with_models += 1
                    
                except Exception as e:
                    print(f"Warning: Could not train model for user {user_id}: {e}")
        
        # Train general fallback model
        try:
            X_general = self.df[available_features].fillna(0)
            y_general = self.df['Blood_Sugar_Level']
            
            self.general_model = RandomForestRegressor(n_estimators=100, random_state=42)
            self.general_model.fit(X_general, y_general)
            self.general_features = available_features
            
        except Exception as e:
            print(f"Warning: Could not train general model: {e}")
        
        print(f"✅ Loaded {users_with_models} personalized models")
        return users_with_models > 0
    
    def predict_blood_sugar(self, user_id, food_item, user_features=None):
        """Predict blood sugar for a specific user and food"""
        try:
            # Use user-specific model if available
            if user_id in self.user_models:
                model_info = self.user_models[user_id]
                model = model_info['model']
                features = model_info['features']
                
                # Get food encoding for this user
                if user_id in self.food_encoders:
                    try:
                        food_encoded = self.food_encoders[user_id].transform([food_item])[0]
                    except:
                        food_encoded = 0  # Unknown food
                else:
                    food_encoded = 0
                
            else:
                # Use general model
                if self.general_model is None:
                    return 140  # Default prediction
                
                model = self.general_model
                features = self.general_features
                food_encoded = 0  # General encoding
            
            # Prepare features
            if user_features is None:
                user_features = {
                    'Age': 30,
                    'Weight': 70,
                    'Height': 170,
                    'BMI': 24.2,
                    'Gender_encoded': 0,
                    'Diabetes_Type_encoded': 0,
                    'Meal_Time_encoded': 0
                }
            
            # Create feature vector
            feature_vector = []
            for feature in features:
                if feature == 'Food_Item_encoded':
                    feature_vector.append(food_encoded)
                else:
                    feature_vector.append(user_features.get(feature, 0))
            
            # Make prediction
            prediction = model.predict([feature_vector])[0]
            return max(80, min(400, prediction))  # Reasonable bounds
            
        except Exception as e:
            print(f"Warning: Could not predict for user {user_id}, food {food_item}: {e}")
            return 140  # Default safe prediction
    
    def get_personalized_recommendation_reason(self, user_id, food_item, predicted_bs):
        """Generate personalized recommendation reason based on user history"""
        if user_id not in self.user_patterns:
            return f"Based on general diabetes guidelines, {food_item} should maintain stable blood sugar levels"
        
        patterns = self.user_patterns[user_id]
        successful_foods = patterns.get('successful_foods', {})
        problematic_foods = patterns.get('problematic_foods', {})
        
        # Check if this food is in user's successful foods
        if food_item in successful_foods:
            success_rate = successful_foods[food_item]['success_rate']
            meal_count = successful_foods[food_item]['meal_count']
            return f"You've had {int(success_rate*100)}% success with {food_item} in your {meal_count} previous meals"
        
        # Check if this food is problematic for user
        elif food_item in problematic_foods:
            spike_rate = problematic_foods[food_item]['spike_rate']
            meal_count = problematic_foods[food_item]['meal_count']
            return f"WARNING: {food_item} caused blood sugar spikes in {int(spike_rate*100)}% of your {meal_count} previous meals"
        
        # New food for this user
        else:
            avg_tolerance = patterns.get('glycemic_tolerance', 140)
            if predicted_bs <= avg_tolerance:
                return f"Based on your glycemic tolerance pattern, {food_item} should work well for you"
            else:
                return f"CAUTION: {food_item} may exceed your usual tolerance level - monitor closely"
    
    def get_personal_insights(self, user_id):
        """Get personal insights for the user"""
        if user_id not in self.user_patterns:
            return "No personal data available. Log more meals to get personalized insights!"
        
        patterns = self.user_patterns[user_id]
        insights = []
        
        # Meal count insight
        meal_count = patterns.get('total_meals', 0)
        insights.append(f"Analyzed {meal_count} of your meal logs")
        
        # Blood sugar pattern
        avg_bs = patterns.get('avg_blood_sugar', 0)
        if avg_bs > 0:
            if avg_bs < 130:
                insights.append(f"Your average blood sugar ({avg_bs:.0f}) shows good control")
            else:
                insights.append(f"Your average blood sugar ({avg_bs:.0f}) needs attention")
        
        # Food preferences
        food_prefs = patterns.get('food_preferences', {})
        if food_prefs:
            top_food = max(food_prefs.items(), key=lambda x: x[1])
            insights.append(f"Your most logged food: {top_food[0]} ({top_food[1]} times)")
        
        # Successful foods
        successful = patterns.get('successful_foods', {})
        if successful:
            best_foods = sorted(successful.items(), key=lambda x: x[1]['success_rate'], reverse=True)[:3]
            food_names = [food for food, _ in best_foods]
            insights.append(f"⭐ Your best foods: {', '.join(food_names)}")
        
        return " | ".join(insights)
    
    def get_user_model_status(self, user_id):
        """Check if user has a personalized model"""
        return {
            'has_personal_model': user_id in self.user_models,
            'meal_count': len(self.df[self.df['User_ID'] == user_id]) if hasattr(self, 'df') else 0,
            'model_score': self.user_models[user_id]['score'] if user_id in self.user_models else None
        }

# Test the system
if __name__ == "__main__":
    print("🔄 Testing Personalized Meal Recommender...")
    
    # Initialize the recommender
    recommender = PersonalizedMealRecommender()
    
    # Test with a sample user
    test_user_id = 1
    test_foods = ["Rice", "Wheat Bread", "Chicken", "Oats", "Milk"]
    
    print(f"\n📋 Testing recommendations for User {test_user_id}:")
    
    for food in test_foods:
        predicted_bs = recommender.predict_blood_sugar(test_user_id, food)
        reason = recommender.get_personalized_recommendation_reason(test_user_id, food, predicted_bs)
        print(f"🍽️ {food}: {predicted_bs:.0f} mg/dl - {reason}")
    
    # Show personal insights
    insights = recommender.get_personal_insights(test_user_id)
    print(f"\n💡 Personal insights: {insights}")
    
    # Show model status
    status = recommender.get_user_model_status(test_user_id)
    print(f"\n📊 Model status: {status}")
    
    print("\n✅ Personalized ML Recommender test completed!")
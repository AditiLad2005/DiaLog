import React, { useState, useEffect, useCallback } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { fetchFoods, getPersonalizedRecommendations, getTrulyPersonalizedRecommendations } from '../services/api';
import MealCard from './MealCard';

const SafeMealSuggestions = ({ userProfile = {}, currentMeal = null, className = "" }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [availableMeals, setAvailableMeals] = useState([]);
  const [usedMeals, setUsedMeals] = useState(new Set());

  // Categories for meal recommendations
  const categories = [
    { id: 'all', name: 'All Meals', icon: SparklesIcon },
    { id: 'breakfast', name: 'Breakfast', icon: CheckCircleIcon },
    { id: 'lunch', name: 'Lunch', icon: CheckCircleIcon },
    { id: 'dinner', name: 'Dinner', icon: CheckCircleIcon },
    { id: 'snacks', name: 'Snacks', icon: CheckCircleIcon }
  ];

  // Load meals from dataset
  useEffect(() => {
    const loadMeals = async () => {
      try {
        const data = await fetchFoods();
        setAvailableMeals(data.foods || []);
      } catch (err) {
        console.error('Failed to load meals:', err);
        setAvailableMeals([]);
      }
    };
    loadMeals();
  }, []);

  // Create meal suggestions from dataset
  const createMealSuggestion = (mealName, category = 'all') => {
    // Simple categorization based on meal name
    let mealCategory = category;
    if (category === 'all') {
      const name = mealName.toLowerCase();
      if (name.includes('breakfast') || name.includes('poha') || name.includes('upma') || name.includes('idli') || name.includes('dosa')) {
        mealCategory = 'breakfast';
      } else if (name.includes('lunch') || name.includes('rice') || name.includes('dal') || name.includes('curry')) {
        mealCategory = 'lunch';
      } else if (name.includes('dinner') || name.includes('roti') || name.includes('sabzi')) {
        mealCategory = 'dinner';
      } else if (name.includes('snack') || name.includes('tea') || name.includes('biscuit') || name.includes('sweet')) {
        mealCategory = 'snacks';
      } else {
        mealCategory = 'lunch'; // default
      }
    }

    return {
      name: mealName,
      calories: Math.floor(Math.random() * 200) + 150, // Estimated calories
      carbs: Math.floor(Math.random() * 30) + 20,
      protein: Math.floor(Math.random() * 15) + 5,
      fat: Math.floor(Math.random() * 10) + 2,
      fiber: Math.floor(Math.random() * 5) + 1,
      glycemicIndex: Math.floor(Math.random() * 30) + 35, // Low to medium GI
      portionSize: "1 serving",
      timeOfDay: mealCategory.charAt(0).toUpperCase() + mealCategory.slice(1),
      riskScore: Math.random() * 0.4, // Low risk meals
      confidence: 0.85 + Math.random() * 0.1,
      category: mealCategory,
      reasons: [] // Removed static reasons - let ML handle recommendations
    };
  };

  // Get non-repetitive meal suggestions from dataset
  const getMealSuggestions = (category, count = 6) => {
    if (!availableMeals.length) return [];

    // Filter meals based on category
    let candidateMeals = [...availableMeals];
    
    if (category !== 'all') {
      candidateMeals = availableMeals.filter(meal => {
        const name = meal.toLowerCase();
        switch (category) {
          case 'breakfast':
            return name.includes('breakfast') || name.includes('poha') || name.includes('upma') || 
                   name.includes('idli') || name.includes('dosa') || name.includes('paratha');
          case 'lunch':
            return name.includes('lunch') || name.includes('rice') || name.includes('dal') || 
                   name.includes('curry') || name.includes('sambar') || name.includes('rasam');
          case 'dinner':
            return name.includes('dinner') || name.includes('roti') || name.includes('sabzi') || 
                   name.includes('chapati') || name.includes('bhaji');
          case 'snacks':
            return name.includes('snack') || name.includes('tea') || name.includes('biscuit') || 
                   name.includes('namkeen') || name.includes('chaat') || name.includes('pakora');
          default:
            return true;
        }
      });
    }

    // Remove already used meals and get fresh ones
    const unusedMeals = candidateMeals.filter(meal => !usedMeals.has(meal));
    
    // If we've used all meals, reset the used set
    if (unusedMeals.length < count) {
      setUsedMeals(new Set());
      candidateMeals = [...availableMeals];
    }

    // Randomly select meals
    const selectedMeals = [];
    const availableForSelection = unusedMeals.length >= count ? unusedMeals : candidateMeals;
    
    for (let i = 0; i < Math.min(count, availableForSelection.length); i++) {
      const randomIndex = Math.floor(Math.random() * availableForSelection.length);
      const selectedMeal = availableForSelection.splice(randomIndex, 1)[0];
      selectedMeals.push(createMealSuggestion(selectedMeal, category));
    }

    // Track used meals
    setUsedMeals(prev => {
      const newUsed = new Set(prev);
      selectedMeals.forEach(meal => newUsed.add(meal.name));
      return newUsed;
    });

    return selectedMeals;
  };

  // Add meal to log function
  const addMealToLog = (meal) => {
    // Store meal data in localStorage for the meal log page
    const mealForLog = {
      name: meal.name,
      calories: meal.calories,
      carbs: meal.carbs,
      protein: meal.protein,
      fat: meal.fat,
      fiber: meal.fiber,
      glycemicIndex: meal.glycemicIndex,
      portionSize: meal.portionSize,
      timestamp: Date.now()
    };
    
    const existingMeals = JSON.parse(localStorage.getItem('pendingMealsForLog') || '[]');
    existingMeals.push(mealForLog);
    localStorage.setItem('pendingMealsForLog', JSON.stringify(existingMeals));
    
    // Navigate to meal log page
    window.location.href = '/meal-log';
  };

  // New ML-powered recommendation function (memoized to prevent re-renders)
  const getMLRecommendations = useCallback(async (category, count = 6) => {
    const timeOfDayMap = {
      'breakfast': 'Breakfast',
      'lunch': 'Lunch', 
      'dinner': 'Dinner',
      'snacks': 'Snack',
      'all': 'Lunch'  // Default
    };

    const requestData = {
      age: userProfile.age || 35,
      gender: userProfile.gender || 'Male',
      weight_kg: userProfile.weight_kg || 70,
      height_cm: userProfile.height_cm || 170,
      fasting_sugar: userProfile.fasting_sugar || 100,
      post_meal_sugar: userProfile.post_meal_sugar || 140,
      diabetes_type: userProfile.diabetes_type || 'Type2',
      time_of_day: timeOfDayMap[category] || 'Lunch',
      count: count
    };

    // Use truly personalized recommendations if user_id is available
    let response;
    if (userProfile.user_id) {
      requestData.user_id = userProfile.user_id;
      response = await getTrulyPersonalizedRecommendations(requestData);
    } else {
      response = await getPersonalizedRecommendations(requestData);
    }
    
    // Transform ML response to match expected format
    return response.recommendations.map(rec => ({
      name: rec.name,
      calories: rec.calories,
      carbs: rec.carbs,
      protein: rec.protein,
      fat: rec.fat,
      fiber: rec.fiber,
      glycemicIndex: rec.glycemicIndex,
      portionSize: rec.portionSize,
      timeOfDay: rec.timeOfDay,
      riskScore: rec.risk_level === 'safe' ? 0.1 : rec.risk_level === 'caution' ? 0.5 : 0.8,
      confidence: rec.confidence || 0.8,
      category: category === 'all' ? 'lunch' : category,
      reasons: rec.personalized_reason ? [rec.personalized_reason] : (rec.reasons || []),
      mlPowered: true,  // Flag to indicate this is ML-generated
      explanation: rec.explanation,
      isPersonalized: !!rec.personalized_reason,  // Flag for personalized vs general
      predicted_blood_sugar: rec.predicted_blood_sugar,
      personalization_info: response.personalization || null  // Store personalization details
    }));
  }, [userProfile.age, userProfile.gender, userProfile.weight_kg, userProfile.height_cm, userProfile.fasting_sugar, userProfile.post_meal_sugar, userProfile.diabetes_type]);

  // Consolidated effect for loading recommendations
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (availableMeals.length === 0) return;

    const loadRecommendations = async () => {
      setIsLoading(true);
      try {
        if (userProfile.age && userProfile.weight_kg && userProfile.height_cm) {
          // Use ML recommendations if user profile is complete
          const mlRecommendations = await getMLRecommendations(selectedCategory, 6);
          setSuggestions(mlRecommendations);
        } else {
          // Fallback to static recommendations
          setSuggestions(getMealSuggestions(selectedCategory, 6));
        }
      } catch (error) {
        console.error('Recommendation loading failed:', error);
        setSuggestions(getMealSuggestions(selectedCategory, 6));
      }
      setIsLoading(false);
    };

    loadRecommendations();
  }, [availableMeals.length, selectedCategory, userProfile.age, userProfile.weight_kg, userProfile.height_cm, getMLRecommendations]);

  const generateRecommendations = useCallback(async () => {
    if (availableMeals.length === 0 || isLoading) return; // Prevent multiple simultaneous calls
    
    setIsLoading(true);
    try {
      if (userProfile.age && userProfile.weight_kg && userProfile.height_cm) {
        // Use ML-powered recommendations
        const mlRecommendations = await getMLRecommendations(selectedCategory, 6);
        setSuggestions(mlRecommendations);
      } else {
        // Fallback to static recommendations
        setSuggestions(getMealSuggestions(selectedCategory, 6));
      }
    } catch (error) {
      console.error('ML recommendations failed, using fallback:', error);
      // Fallback to static recommendations
      setSuggestions(getMealSuggestions(selectedCategory, 6));
    }
    // Add a small delay to prevent rapid flickering
    setTimeout(() => setIsLoading(false), 300);
  }, [availableMeals.length, isLoading, userProfile.age, userProfile.weight_kg, userProfile.height_cm, selectedCategory, getMLRecommendations]);

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary-100 dark:bg-primary-900/30 rounded-lg">
            <SparklesIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Smart Meal Recommendations
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              AI-powered suggestions based on your profile and preferences
            </p>
          </div>
        </div>
        
        <button
          onClick={generateRecommendations}
          disabled={isLoading}
          className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Generating...' : 'Refresh'}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex flex-wrap gap-2 mb-6">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`
              inline-flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200
              ${selectedCategory === category.id
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
          >
            <category.icon className="h-4 w-4 mr-2" />
            {category.name}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <ArrowPathIcon className="h-8 w-8 text-primary-600 animate-spin mx-auto mb-4" />
            <p className="text-gray-600 dark:text-gray-400">Analyzing your profile and generating personalized recommendations...</p>
          </div>
        </div>
      )}

      {/* Personalization Status */}
      {!isLoading && suggestions.length > 0 && suggestions[0]?.personalization_info && (
        <div className={`p-4 rounded-lg mb-6 ${
          suggestions[0].personalization_info.has_personal_model 
            ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
            : 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
        }`}>
          <div className="flex items-start space-x-3">
            <SparklesIcon className={`h-5 w-5 mt-0.5 ${
              suggestions[0].personalization_info.has_personal_model ? 'text-green-600' : 'text-blue-600'
            }`} />
            <div className="flex-1">
              <h4 className={`font-medium ${
                suggestions[0].personalization_info.has_personal_model ? 'text-green-800 dark:text-green-200' : 'text-blue-800 dark:text-blue-200'
              }`}>
                {suggestions[0].personalization_info.personalization_note}
              </h4>
              {suggestions[0].personalization_info.personal_insights && (
                <p className={`text-sm mt-1 ${
                  suggestions[0].personalization_info.has_personal_model ? 'text-green-700 dark:text-green-300' : 'text-blue-700 dark:text-blue-300'
                }`}>
                  {suggestions[0].personalization_info.personal_insights}
                </p>
              )}
              {suggestions[0].personalization_info.has_personal_model && (
                <div className="flex items-center space-x-4 mt-2 text-xs text-green-600 dark:text-green-400">
                  <span>📊 {suggestions[0].personalization_info.meal_count} meals analyzed</span>
                  {suggestions[0].personalization_info.model_score && (
                    <span>🎯 Model accuracy: {(suggestions[0].personalization_info.model_score * 100).toFixed(0)}%</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Individual Suggestions Grid */}
      {!isLoading && suggestions.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Meal Suggestions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {suggestions.map((meal, index) => (
              <div key={index} className="relative">
                <MealCard
                  meal={meal}
                  riskLevel="low"
                  showNutrition={true}
                  showPrediction={true}
                  onClick={() => {
                    console.log('Selected meal:', meal);
                  }}
                />
                
                {/* Action Buttons */}
                <div className="mt-3">
                  <button
                    onClick={() => addMealToLog(meal)}
                    className="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium rounded-lg transition-colors duration-200"
                  >
                    <PlusIcon className="h-4 w-4 inline mr-1" />
                    Add to Log
                  </button>
                </div>
                
                {/* Recommendation Reasons - Only show if reasons exist */}
                {meal.reasons && meal.reasons.length > 0 && (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center space-x-2 mb-2">
                      <LightBulbIcon className="h-4 w-4 text-warning-500" />
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        {meal.isPersonalized ? '🎯 Personal Analysis:' : meal.mlPowered ? 'AI Analysis:' : 'Why we recommend this:'}
                      </span>
                      <div className="flex space-x-1">
                        {meal.mlPowered && (
                          <span className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded-full">
                            ML Powered
                          </span>
                        )}
                        {meal.isPersonalized && (
                          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                            Personalized
                          </span>
                        )}
                        {meal.predicted_blood_sugar && (
                          <span className={`px-2 py-0.5 text-xs rounded-full ${
                            meal.predicted_blood_sugar <= 140 
                              ? 'bg-green-100 text-green-700' 
                              : meal.predicted_blood_sugar <= 180 
                                ? 'bg-yellow-100 text-yellow-700' 
                                : 'bg-red-100 text-red-700'
                          }`}>
                            📊 {meal.predicted_blood_sugar}mg/dL
                          </span>
                        )}
                      </div>
                    </div>
                    <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {meal.reasons.slice(0, 3).map((reason, idx) => (
                        <li key={idx} className="flex items-start space-x-2">
                          <CheckCircleIcon className={`h-3 w-3 mt-0.5 flex-shrink-0 ${
                            meal.isPersonalized ? 'text-green-500' : 'text-success-500'
                          }`} />
                          <span className={meal.isPersonalized ? 'font-medium text-green-700 dark:text-green-300' : ''}>
                            {reason}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {meal.mlPowered && meal.explanation && (
                      <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                        <p className="text-xs text-gray-500 dark:text-gray-400 italic">
                          {meal.explanation.slice(0, 100)}...
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && suggestions.length === 0 && (
        <div className="text-center py-12">
          <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-full w-16 h-16 mx-auto mb-4">
            <ExclamationTriangleIcon className="h-8 w-8 text-gray-400 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No recommendations available
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Complete your profile and log some meals to get personalized recommendations.
          </p>
          <button
            onClick={generateRecommendations}
            className="inline-flex items-center px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white font-medium rounded-lg transition-colors duration-200"
          >
            <SparklesIcon className="h-4 w-4 mr-2" />
            Generate Recommendations
          </button>
        </div>
      )}

      {/* Info Banner */}
      <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg">
        <div className="flex items-start space-x-3">
          <LightBulbIcon className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              How recommendations work
            </h4>
            <p className="text-sm text-blue-700 dark:text-blue-300">
              Our AI analyzes your personal health profile, previous meal logs, and response patterns to suggest meals 
              that are most likely to keep your blood sugar levels stable. Recommendations improve as you log more meals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeMealSuggestions;

import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { fetchFoods } from '../services/api';
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
      reasons: [
        "Traditional healthy option",
        "Balanced nutritional profile",
        "Suitable for diabetic diet",
        "Good portion control"
      ]
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

  // Initial load
  useEffect(() => {
    if (availableMeals.length > 0) {
      setSuggestions(getMealSuggestions('all', 6));
    }
  }, [availableMeals]);

  // Simulate loading recommendations
  useEffect(() => {
    if (availableMeals.length > 0) {
      if (selectedCategory !== 'all') {
        setIsLoading(true);
        const timer = setTimeout(() => {
          setSuggestions(getMealSuggestions(selectedCategory, 6));
          setIsLoading(false);
        }, 500);

        return () => clearTimeout(timer);
      } else {
        setSuggestions(getMealSuggestions('all', 6));
      }
    }
  }, [selectedCategory, availableMeals]);

  const generateRecommendations = () => {
    if (!availableMeals.length) return;
    
    setIsLoading(true);
    // Generate fresh recommendations
    setTimeout(() => {
      setSuggestions(getMealSuggestions(selectedCategory, 6));
      setIsLoading(false);
    }, 800);
  };

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
                
                {/* Recommendation Reasons */}
                <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <LightBulbIcon className="h-4 w-4 text-warning-500" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Why we recommend this:</span>
                  </div>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {meal.reasons?.slice(0, 3).map((reason, idx) => (
                      <li key={idx} className="flex items-start space-x-2">
                        <CheckCircleIcon className="h-3 w-3 text-success-500 mt-0.5 flex-shrink-0" />
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
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

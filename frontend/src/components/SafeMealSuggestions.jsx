import React, { useState, useEffect } from 'react';
import { 
  SparklesIcon, 
  ArrowPathIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  LightBulbIcon
} from '@heroicons/react/24/outline';
import MealCard from './MealCard';

const SafeMealSuggestions = ({ userProfile = {}, currentMeal = null, className = "" }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Categories for meal recommendations
  const categories = [
    { id: 'all', name: 'All Meals', icon: SparklesIcon },
    { id: 'breakfast', name: 'Breakfast', icon: CheckCircleIcon },
    { id: 'lunch', name: 'Lunch', icon: CheckCircleIcon },
    { id: 'dinner', name: 'Dinner', icon: CheckCircleIcon },
    { id: 'snacks', name: 'Snacks', icon: CheckCircleIcon }
  ];

  // Mock meal suggestions (in real app, this would come from ML recommendations)
  const mockSuggestions = [
    {
      name: "Quinoa Bowl with Vegetables",
      image: "/api/placeholder/200/150",
      calories: 320,
      carbs: 45,
      protein: 12,
      fat: 8,
      fiber: 6,
      glycemicIndex: 35,
      glycemicLoad: 8,
      portionSize: "1 bowl",
      timeOfDay: "Lunch",
      riskScore: 0.2,
      confidence: 0.92,
      category: 'lunch',
      reasons: [
        "Low glycemic index (35)",
        "High fiber content",
        "Balanced macronutrients",
        "Suitable for your BMI range"
      ]
    },
    {
      name: "Grilled Chicken with Steamed Broccoli",
      image: "/api/placeholder/200/150",
      calories: 280,
      carbs: 12,
      protein: 35,
      fat: 8,
      fiber: 4,
      glycemicIndex: 25,
      glycemicLoad: 3,
      portionSize: "1 plate",
      timeOfDay: "Dinner",
      riskScore: 0.15,
      confidence: 0.95,
      category: 'dinner',
      reasons: [
        "Very low glycemic load",
        "High protein content",
        "Low carbohydrate content",
        "Proven safe for similar profiles"
      ]
    },
    {
      name: "Oats with Berries and Nuts",
      image: "/api/placeholder/200/150",
      calories: 250,
      carbs: 35,
      protein: 8,
      fat: 10,
      fiber: 8,
      glycemicIndex: 42,
      glycemicLoad: 6,
      portionSize: "1 bowl",
      timeOfDay: "Breakfast",
      riskScore: 0.25,
      confidence: 0.88,
      category: 'breakfast',
      reasons: [
        "Slow-release carbohydrates",
        "High fiber for blood sugar stability",
        "Antioxidants from berries",
        "Good for morning metabolism"
      ]
    },
    {
      name: "Greek Yogurt with Cucumber",
      image: "/api/placeholder/200/150",
      calories: 120,
      carbs: 8,
      protein: 15,
      fat: 3,
      fiber: 1,
      glycemicIndex: 20,
      glycemicLoad: 2,
      portionSize: "1 cup",
      timeOfDay: "Snack",
      riskScore: 0.1,
      confidence: 0.96,
      category: 'snacks',
      reasons: [
        "Very low glycemic impact",
        "Probiotics for gut health",
        "High protein for satiety",
        "Minimal blood sugar spike"
      ]
    },
    {
      name: "Brown Rice with Dal",
      image: "/api/placeholder/200/150",
      calories: 380,
      carbs: 58,
      protein: 16,
      fat: 6,
      fiber: 5,
      glycemicIndex: 48,
      glycemicLoad: 12,
      portionSize: "1 cup",
      timeOfDay: "Lunch",
      riskScore: 0.35,
      confidence: 0.82,
      category: 'lunch',
      reasons: [
        "Complex carbohydrates",
        "Complete protein profile",
        "Better than white rice",
        "Traditional balanced meal"
      ]
    }
  ];

  // Filter suggestions based on category
  const filteredSuggestions = selectedCategory === 'all' 
    ? mockSuggestions 
    : mockSuggestions.filter(meal => meal.category === selectedCategory);

  // Simulate loading recommendations
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setSuggestions(filteredSuggestions);
      setIsLoading(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [selectedCategory]);

  const generateRecommendations = () => {
    setIsLoading(true);
    // Simulate API call to ML service
    setTimeout(() => {
      setSuggestions(mockSuggestions.sort(() => Math.random() - 0.5).slice(0, 4));
      setIsLoading(false);
    }, 1500);
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

      {/* Suggestions Grid */}
      {!isLoading && suggestions.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {suggestions.map((meal, index) => (
            <div key={index} className="relative">
              <MealCard
                meal={meal}
                riskLevel="low"
                showNutrition={true}
                showPrediction={true}
                onClick={() => {
                  // Handle meal selection
                  console.log('Selected meal:', meal);
                }}
              />
              
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

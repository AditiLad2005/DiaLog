import React from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  ClockIcon,
  ScaleIcon,
  // ...existing code...
  BeakerIcon 
} from '@heroicons/react/24/outline';

const MealCard = ({ 
  meal = {}, 
  riskLevel = 'low', // 'low', 'medium', 'high'
  onClick = () => {},
  className = "",
  showNutrition = true,
  showPrediction = false
}) => {
  // Default meal data structure aligned with ML pipeline
  const {
    name = "Sample Meal",
    image = "/api/placeholder/200/150",
    // Nutrition from Dataset A (Food Master)
    calories = 0,
    carbs = 0,
    protein = 0,
    fat = 0,
    fiber = 0,
    glycemicIndex = 50,
    glycemicLoad = 10,
    portionSize = "1 cup",
    timeOfDay = "Breakfast",
    // ML prediction data
    riskScore = 0.3,
    confidence = 0.85,
    // User log data
    fastingSugar = null,
    postMealSugar = null,
  // ...existing code...
  } = meal;

  // Risk level styling
  const getRiskStyling = (risk) => {
    switch (risk) {
      case 'high':
        return {
          border: 'border-danger-200 bg-danger-50 dark:border-danger-700 dark:bg-danger-900/20',
          badge: 'bg-danger-500 text-white',
          icon: ExclamationTriangleIcon,
          label: 'High Risk'
        };
      case 'medium':
        return {
          border: 'border-warning-200 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20',
          badge: 'bg-warning-500 text-white',
          icon: ExclamationTriangleIcon,
          label: 'Medium Risk'
        };
      default:
        return {
          border: 'border-success-200 bg-success-50 dark:border-success-700 dark:bg-success-900/20',
          badge: 'bg-success-500 text-white',
          icon: CheckCircleIcon,
          label: 'Safe'
        };
    }
  };

  const riskStyling = getRiskStyling(riskLevel);
  const RiskIcon = riskStyling.icon;

  // Glycemic Index category
  const getGICategory = (gi) => {
    if (gi <= 55) return { label: 'Low', color: 'text-success-700 bg-success-100 dark:text-success-400 dark:bg-success-900/30' };
    if (gi <= 69) return { label: 'Medium', color: 'text-warning-700 bg-warning-100 dark:text-warning-400 dark:bg-warning-900/30' };
    return { label: 'High', color: 'text-danger-700 bg-danger-100 dark:text-danger-400 dark:bg-danger-900/30' };
  };

  const giCategory = getGICategory(glycemicIndex);

  return (
    <div 
      className={`
        relative bg-white dark:bg-gray-800 rounded-xl shadow-soft hover:shadow-medium 
        transition-all duration-300 cursor-pointer overflow-hidden
        border-2 ${riskStyling.border}
        ${className}
      `}
      onClick={onClick}
    >
      {/* Risk indicator - only show for medium and high risk */}
      {riskLevel !== 'low' && (
        <div className="absolute top-3 right-3 z-10">
          <div className={`flex items-center space-x-1 ${riskStyling.badge} px-2 py-1 rounded-full text-xs font-medium`}>
            <RiskIcon className="h-3 w-3" />
            <span>{riskStyling.label}</span>
          </div>
        </div>
      )}

      {/* Meal details */}
      <div className="p-4 space-y-3">
        {/* Meal name */}
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white leading-tight break-words">{name}</h3>

        {/* Time and portion */}
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-300">
          <div className="flex items-center space-x-1">
            <ClockIcon className="h-4 w-4" />
            <span>{timeOfDay}</span>
          </div>
          <div className="flex items-center space-x-1">
            <ScaleIcon className="h-4 w-4" />
            <span>{portionSize}</span>
          </div>
        </div>

        {/* Nutritional info (from Dataset A) */}
        {showNutrition && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Calories:</span>
                <span className="font-medium text-gray-900 dark:text-white">{calories}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Carbs:</span>
                <span className="font-medium text-gray-900 dark:text-white">{carbs}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fiber:</span>
                <span className="font-medium text-gray-900 dark:text-white">{fiber}g</span>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Protein:</span>
                <span className="font-medium text-gray-900 dark:text-white">{protein}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Fat:</span>
                <span className="font-medium text-gray-900 dark:text-white">{fat}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">GL:</span>
                <span className="font-medium text-gray-900 dark:text-white">{glycemicLoad}</span>
              </div>
            </div>
          </div>
        )}

        {/* Glycemic index category */}
        <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Glycemic Index: {glycemicIndex}</span>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${giCategory.color}`}>
              {giCategory.label} GI
            </span>
          </div>
        </div>

        {/* Blood sugar data (if available from user logs) */}
        {(fastingSugar || postMealSugar) && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-1 mb-2">
              <BeakerIcon className="h-4 w-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Blood Sugar</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {fastingSugar && (
                <div className="text-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Fasting</div>
                  <div className="font-bold text-gray-900 dark:text-white">{fastingSugar}</div>
                </div>
              )}
              {postMealSugar && (
                <div className="text-center p-2 bg-gray-100 dark:bg-gray-700 rounded">
                  <div className="text-gray-600 dark:text-gray-400">Post-Meal</div>
                  <div className="font-bold text-gray-900 dark:text-white">{postMealSugar}</div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ML Risk Score (if prediction mode) */}
        {showPrediction && riskScore !== undefined && (
          <div className="pt-2 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Risk Score:</span>
              <div className="flex items-center space-x-2">
                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${
                      riskScore > 0.7 ? 'bg-danger-500' : 
                      riskScore > 0.4 ? 'bg-warning-500' : 'bg-success-500'
                    }`}
                    style={{ width: `${riskScore * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium text-gray-900 dark:text-white">
                  {Math.round(riskScore * 100)}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MealCard;

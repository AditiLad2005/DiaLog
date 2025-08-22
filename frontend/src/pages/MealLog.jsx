import React, { useState } from 'react';
import { 
  BeakerIcon, 
  ClockIcon, 
  ScaleIcon,
  CakeIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  UserIcon,
  HeartIcon,
  CloudIcon
} from '@heroicons/react/24/outline';

const MealLog = () => {
  const [formData, setFormData] = useState({
    // Blood sugar readings
    fastingSugar: '',
    postMealSugar: '',
    
    // Meal information (Dataset A lookup)
    mealTaken: '',
    portionAmount: '',
    portionUnit: 'cup',
    timeOfDay: '',
    
    // Additional notes
    notes: '',
    
    // Optional: custom meal if not in Dataset A
    customMeal: {
      name: '',
      estimatedCarbs: '',
      estimatedCalories: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [showCustomMeal, setShowCustomMeal] = useState(false);

  // Enhanced meal options (Dataset A foods)
  const mealOptions = [
    // Traditional Indian Foods
    'Basmati Rice with Dal',
    'Brown Rice with Dal',
    'Quinoa with Dal',
    'Chapati (Wheat)',
    'Chapati (Multigrain)',
    'Jowar Roti',
    'Bajra Roti',
    
    // South Indian
    'Idli with Sambar',
    'Dosa (Plain)',
    'Dosa (Ragi)',
    'Uttapam',
    'Upma',
    'Poha',
    
    // Breakfast Options
    'Oats (Plain)',
    'Oats with Fruits',
    'Daliya (Broken Wheat)',
    'Besan Chilla',
    
    // Protein Sources
    'Chicken Curry',
    'Fish Curry',
    'Paneer Curry',
    'Egg Curry',
    'Rajma',
    'Chole',
    
    // Vegetables
    'Mixed Vegetables',
    'Palak Sabzi',
    'Bhindi Sabzi',
    'Aloo Gobi',
    
    // Snacks
    'Fruit Salad',
    'Yogurt (Plain)',
    'Nuts (Mixed)',
    'Sprouts Salad',
    
    // Custom option
    'Other (Custom)'
  ];

  const portionUnits = [
    { value: 'cup', label: 'Cup' },
    { value: 'bowl', label: 'Bowl' },
    { value: 'plate', label: 'Plate' },
    { value: 'katori', label: 'Katori' },
    { value: 'spoon', label: 'Tablespoon' },
    { value: 'piece', label: 'Piece' },
    { value: 'slice', label: 'Slice' },
    { value: 'glass', label: 'Glass' }
  ];

  const timeOptions = [
    'Early Morning (5-7 AM)',
    'Breakfast (7-9 AM)',
    'Mid-Morning (9-11 AM)',
    'Lunch (11 AM-2 PM)',
    'Afternoon (2-4 PM)',
    'Evening (4-6 PM)',
    'Dinner (6-9 PM)',
    'Late Night (9-11 PM)'
  ];

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    if (name.startsWith('customMeal.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        customMeal: {
          ...prev.customMeal,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }
  };

  // Simplified prediction logic focused on blood sugar levels
  const getPrediction = (data) => {
    const fasting = parseFloat(data.fastingSugar);
    const postMeal = parseFloat(data.postMealSugar);
    
    // Base risk assessment based on blood sugar only
    let riskScore = 0;
    if (fasting > 126 || postMeal > 200) riskScore = 0.8;
    else if (fasting > 100 || postMeal > 140) riskScore = 0.4;
    else riskScore = 0.1;
    
    // Determine risk level
    let risk, message, color;
    if (riskScore > 0.6) {
      risk = 'high';
      message = 'High blood sugar levels detected. Consider consulting your healthcare provider and reviewing meal choices.';
      color = 'text-danger-700 bg-danger-50 border-danger-200 dark:text-danger-300 dark:bg-danger-900/20 dark:border-danger-700';
    } else if (riskScore > 0.3) {
      risk = 'medium';
      message = 'Elevated blood sugar levels. Monitor closely and consider meal modifications.';
      color = 'text-warning-700 bg-warning-50 border-warning-200 dark:text-warning-300 dark:bg-warning-900/20 dark:border-warning-700';
    } else {
      risk = 'low';
      message = 'Blood sugar levels are within target range. Great job maintaining good diabetes management!';
      color = 'text-success-700 bg-success-50 border-success-200 dark:text-success-300 dark:bg-success-900/20 dark:border-success-700';
    }

    return {
      risk,
      message,
      color,
      riskScore: Math.min(riskScore, 1),
      recommendations: generateRecommendations(data, risk)
    };
  };

  const generateRecommendations = (data, risk) => {
    const recommendations = [];
    
    if (risk === 'high') {
      recommendations.push('Check blood sugar more frequently today');
      recommendations.push('Consider a light walk after meals');
      recommendations.push('Stay well hydrated');
    } else if (risk === 'medium') {
      recommendations.push('Monitor portion sizes for next meal');
      recommendations.push('Include fiber-rich foods');
      recommendations.push('Consider adding more vegetables');
    } else {
      recommendations.push('Continue with current meal patterns');
      recommendations.push('Maintain regular physical activity');
    }
    
    return recommendations;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate ML model prediction API call
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const predictionResult = getPrediction(formData);
    setPrediction(predictionResult);
    
    console.log('Meal log data for ML pipeline:', {
      ...formData,
      timestamp: new Date().toISOString(),
      prediction: predictionResult
    });
    
    setIsLoading(false);
  };

  const handleMealChange = (e) => {
    const value = e.target.value;
    setShowCustomMeal(value === 'Other (Custom)');
    handleInputChange(e);
  };

  const isFormValid = formData.fastingSugar && formData.postMealSugar && 
                     (formData.mealTaken || (showCustomMeal && formData.customMeal.name)) && 
                     formData.portionAmount && formData.timeOfDay;

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 dark:text-primary-400 mb-4">
            Log Your Meal Data
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            Track your blood sugar levels and meal details for AI-powered health insights
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-8 transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Blood Sugar Levels */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-600 pb-2 flex items-center">
                <BeakerIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
                Blood Sugar Readings
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fastingSugar" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Fasting Sugar Level (mg/dL)
                  </label>
                  <input
                    type="number"
                    id="fastingSugar"
                    name="fastingSugar"
                    value={formData.fastingSugar}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="e.g., 95"
                    min="50"
                    max="600"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Target: 80-130 mg/dL</p>
                </div>

                <div>
                  <label htmlFor="postMealSugar" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Post-Meal Sugar Level (mg/dL)
                  </label>
                  <input
                    type="number"
                    id="postMealSugar"
                    name="postMealSugar"
                    value={formData.postMealSugar}
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    placeholder="e.g., 140"
                    min="50"
                    max="600"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Target: Less than 180 mg/dL</p>
                </div>
              </div>
            </div>

            {/* Meal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white border-b border-gray-200 dark:border-gray-600 pb-2 flex items-center">
                <CakeIcon className="h-6 w-6 mr-2 text-primary-600" />
                Meal Information
              </h2>

              {/* Meal Selection */}
              <div>
                <label htmlFor="mealTaken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Meal Taken
                </label>
                <select
                  id="mealTaken"
                  name="mealTaken"
                  value={formData.mealTaken}
                  onChange={handleMealChange}
                  className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                  required
                >
                  <option value="">Select a meal from our database</option>
                  {mealOptions.map((meal) => (
                    <option key={meal} value={meal}>
                      {meal}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Meal Fields */}
              {showCustomMeal && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <div>
                    <label htmlFor="customMeal.name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Custom Meal Name
                    </label>
                    <input
                      type="text"
                      name="customMeal.name"
                      value={formData.customMeal.name}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                      placeholder="e.g., Homemade Pasta"
                      required={showCustomMeal}
                    />
                  </div>
                  <div>
                    <label htmlFor="customMeal.estimatedCarbs" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Est. Carbs (g)
                    </label>
                    <input
                      type="number"
                      name="customMeal.estimatedCarbs"
                      value={formData.customMeal.estimatedCarbs}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                      placeholder="e.g., 45"
                    />
                  </div>
                  <div>
                    <label htmlFor="customMeal.estimatedCalories" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Est. Calories
                    </label>
                    <input
                      type="number"
                      name="customMeal.estimatedCalories"
                      value={formData.customMeal.estimatedCalories}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-800 dark:text-white"
                      placeholder="e.g., 350"
                    />
                  </div>
                </div>
              )}

              {/* Portion and Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="portionAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Portion Size
                  </label>
                  <div className="flex space-x-3">
                    <div className="flex-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ScaleIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        id="portionAmount"
                        name="portionAmount"
                        value={formData.portionAmount}
                        onChange={handleInputChange}
                        className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                        placeholder="Amount"
                        step="0.1"
                        min="0.1"
                        required
                      />
                    </div>
                    <select
                      name="portionUnit"
                      value={formData.portionUnit}
                      onChange={handleInputChange}
                      className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                    >
                      {portionUnits.map((unit) => (
                        <option key={unit.value} value={unit.value}>
                          {unit.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="timeOfDay" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Time of Day
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ClockIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                      id="timeOfDay"
                      name="timeOfDay"
                      value={formData.timeOfDay}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                      required
                    >
                      <option value="">Select time of day</option>
                      {timeOptions.map((time) => (
                        <option key={time} value={time}>
                          {time}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional Notes (Optional)
              </label>
              <textarea
                id="notes"
                name="notes"
                value={formData.notes}
                onChange={handleInputChange}
                rows={3}
                className="block w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                placeholder="Any additional information about your meal, how you felt, or other relevant details..."
              />
            </div>

            {/* Prediction Result */}
            {prediction && (
              <div className={`border rounded-xl p-6 ${prediction.color}`}>
                <div className="flex items-start space-x-3">
                  {prediction.risk === 'high' && <ExclamationTriangleIcon className="h-6 w-6 mt-1 flex-shrink-0" />}
                  {prediction.risk === 'medium' && <ExclamationTriangleIcon className="h-6 w-6 mt-1 flex-shrink-0" />}
                  {prediction.risk === 'low' && <CheckIcon className="h-6 w-6 mt-1 flex-shrink-0" />}
                  <div className="flex-1">
                    <h3 className="font-semibold mb-2 flex items-center">
                      AI Health Assessment
                      <span className="ml-2 text-xs px-2 py-1 bg-black/10 rounded-full">
                        Risk Score: {Math.round(prediction.riskScore * 100)}%
                      </span>
                    </h3>
                    <p className="text-sm mb-4">{prediction.message}</p>
                    
                    {prediction.recommendations && prediction.recommendations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Recommendations:</h4>
                        <ul className="text-sm space-y-1">
                          {prediction.recommendations.map((rec, idx) => (
                            <li key={idx} className="flex items-start space-x-2">
                              <CheckIcon className="h-3 w-3 mt-1 flex-shrink-0" />
                              <span>{rec}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`
                  w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl 
                  transition-all duration-200 transform
                  ${isFormValid && !isLoading
                    ? 'bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-1 shadow-medium hover:shadow-strong'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-6 w-6 mr-3 animate-spin" />
                    Analyzing with AI...
                  </>
                ) : (
                  <>
                    <CloudIcon className="h-6 w-6 mr-3" />
                    Submit to AI Analysis
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MealLog;

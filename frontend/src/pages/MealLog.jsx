import React, { useState, useEffect } from 'react';
import { 
  BeakerIcon, 
  CloudIcon,
  CakeIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '../contexts/AuthContext';
import { fetchFoods } from '../services/api';

const MealLog = () => {
  const { user, loading: authLoading } = useAuth();
  const [userProfile, setUserProfile] = useState(null);
  const [mealOptions, setMealOptions] = useState([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  
  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      if (authLoading || !user) return;
      if (user) {
        const profile = await (await import('../services/firebase')).fetchUserProfile(user.uid);
        if (profile) setUserProfile(profile);
      }
    };
    fetchProfile();
  }, [user, authLoading]);

  // Check for pending meals from recommendations
  useEffect(() => {
    const pendingMeals = JSON.parse(localStorage.getItem('pendingMealsForLog') || '[]');
    if (pendingMeals.length > 0) {
      // Auto-fill form with the first pending meal
      const meal = pendingMeals[0];
      setFormData(prev => ({
        ...prev,
        meals_taken: [
          {
            meal: meal.name,
            quantity: 1,
            unit: 'cup',
            showDropdown: false
          }
        ]
      }));
      
      // Remove the used meal from pending list
      const remainingMeals = pendingMeals.slice(1);
      localStorage.setItem('pendingMealsForLog', JSON.stringify(remainingMeals));
    }
  }, []);

  // Fetch foods from backend
  useEffect(() => {
    const loadFoods = async () => {
      setIsLoadingMeals(true);
      try {
        const data = await fetchFoods();
        setMealOptions(data.foods || []);
      } catch (err) {
        setMealOptions([]);
      } finally {
        setIsLoadingMeals(false);
      }
    };
    loadFoods();
  }, []);

  const [formData, setFormData] = useState({
    preMealSugar: '',
    postMealSugar: '',
    timeOfDay: 'Breakfast (7-9 AM)', // Move time of day to be global for the entire meal log
    notes: '',
    meals_taken: [
      {
        meal: '',
        quantity: 1, // Default to 1 instead of empty string
        unit: 'cup',
        showDropdown: false,
      }
    ]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // ...existing code...

  const portionUnits = [
    { value: 'cup', label: 'Cup' },{ value: 'bowl', label: 'Bowl' },
    { value: 'plate', label: 'Plate' },{ value: 'katori', label: 'Katori' },
    { value: 'spoon', label: 'Tablespoon' },{ value: 'piece', label: 'Piece' },
    { value: 'slice', label: 'Slice' },{ value: 'glass', label: 'Glass' }
  ];

  const timeOptions = [
    'Early Morning (5-7 AM)','Breakfast (7-9 AM)','Mid-Morning (9-11 AM)',
    'Lunch (11 AM-2 PM)','Afternoon (2-4 PM)','Evening (4-6 PM)',
    'Dinner (6-9 PM)','Late Night (9-11 PM)'
  ];


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleMealChange = (idx, field, value) => {
    setFormData(prev => {
      const updatedMeals = prev.meals_taken.map((meal, i) =>
        i === idx ? { ...meal, [field]: value } : meal
      );
      return { ...prev, meals_taken: updatedMeals };
    });
  };

  const handleMealFocus = idx => {
    setFormData(prev => {
      const updatedMeals = prev.meals_taken.map((meal, i) =>
        i === idx ? { ...meal, showDropdown: true } : { ...meal, showDropdown: false }
      );
      return { ...prev, meals_taken: updatedMeals };
    });
  };

  const handleMealBlur = idx => {
    setTimeout(() => {
      setFormData(prev => {
        const updatedMeals = prev.meals_taken.map((meal, i) =>
          i === idx ? { ...meal, showDropdown: false } : meal
        );
        return { ...prev, meals_taken: updatedMeals };
      });
    }, 150);
  };

  const addMeal = () => {
    setFormData(prev => ({
      ...prev,
      meals_taken: [
        ...prev.meals_taken,
        { 
          meal: '', 
          quantity: 1, // Default to 1 instead of empty string
          unit: 'cup', 
          showDropdown: false
        }
      ]
    }));
  };

  const removeMeal = (idx) => {
    setFormData(prev => ({
      ...prev,
      meals_taken: prev.meals_taken.filter((_, i) => i !== idx)
    }));
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      // Validate form data before submission
      if (!isFormValid()) {
        throw new Error('Please fill in all required fields with valid values');
      }
      
      // Use user profile if available
      const profile = userProfile || {};
      
      // Get current user ID from Firebase Auth
      const userId = user?.uid || 'anonymous';
      
      // Validate and parse numeric inputs
      const preMealSugar = parseFloat(formData.preMealSugar);
      const postMealSugar = parseFloat(formData.postMealSugar);
      
      if (isNaN(preMealSugar) || isNaN(postMealSugar)) {
        throw new Error('Sugar levels must be valid numbers');
      }
      
      // Filter and validate meals
      const validMeals = formData.meals_taken.filter(meal => 
        meal.meal && meal.meal.trim() !== '' && 
        meal.quantity && parseFloat(meal.quantity) > 0
      );
      
      if (validMeals.length === 0) {
        throw new Error('At least one meal must be properly filled');
      }
      
      // Prepare aggregated meal payload for backend
      const aggregatedPayload = {
        userId: userId,
        age: parseInt(profile.age) || 35,
        gender: profile.gender || 'Male',
        weight_kg: parseFloat(profile.weight) || 70,
        height_cm: parseFloat(profile.height) || 170,
        sugar_level_fasting: preMealSugar,
        sugar_level_post: postMealSugar,
        meals: validMeals.map(meal => ({
          meal_name: meal.meal.trim(),
          quantity: parseFloat(meal.quantity),
          unit: meal.unit || 'piece',
          time_of_day: formData.timeOfDay || 'Breakfast (7-9 AM)' // Use the global time of day
        })),
        notes: formData.notes || ''
      };

      console.log('Sending aggregated meal payload:', aggregatedPayload);

      // Call backend for aggregated prediction and logging
      const result = await (await import('../services/api')).logMealToFirestore(aggregatedPayload);
      
      if (result.success) {
        setPrediction(result.prediction);
        
        // Enhanced prediction display with aggregated nutrition info
        const enhancedPrediction = {
          ...result.prediction,
          aggregated_nutrition: result.aggregated_nutrition,
          meal_combination: result.aggregated_nutrition?.meal_names?.join(', ') || 'Multiple meals',
          total_calories: result.aggregated_nutrition?.calories || 0,
          total_glycemic_load: result.aggregated_nutrition?.glycemic_load || 0
        };
        
        setPrediction(enhancedPrediction);
        
        // Reset form after successful submission
        setFormData({
          preMealSugar: '',
          postMealSugar: '',
          timeOfDay: 'Breakfast (7-9 AM)',
          meals_taken: [{ meal: '', quantity: 1, unit: 'cup', showDropdown: false }],
          notes: ''
        });
        
      } else {
        throw new Error(result.message || 'Failed to log meal and get prediction');
      }

    } catch (err) {
      console.error('Prediction or log error:', err);
      setPrediction({
        error: true,
        message: err.message || 'Error analyzing meal. Please try again.',
        recommendations: [
          { name: 'Check your internet connection', reason: '' },
          { name: 'Verify all meal names are correct', reason: '' },
          { name: 'Ensure sugar levels are within valid ranges (50-400 mg/dL fasting, 50-600 mg/dL post-meal)', reason: '' }
        ]
      });
    } finally {
      setIsLoading(false);
    }
  };

  // ...existing code...

  // Add isFormValid for form validation with proper checks
  const isFormValid = () => {
    // Check required fields
    if (!formData.preMealSugar || !formData.postMealSugar || !formData.timeOfDay) return false;
    
    // Validate sugar level ranges
    const preMealSugar = parseFloat(formData.preMealSugar);
    const postMealSugar = parseFloat(formData.postMealSugar);
    
    if (isNaN(preMealSugar) || preMealSugar < 50 || preMealSugar > 400) return false;
    if (isNaN(postMealSugar) || postMealSugar < 50 || postMealSugar > 600) return false;
    
    // Check if at least one meal is properly filled
    const validMeals = formData.meals_taken.filter(meal => 
      meal.meal && meal.meal.trim() !== '' && 
      meal.quantity && parseFloat(meal.quantity) > 0 &&
      meal.unit
    );
    
    return validMeals.length > 0;
  };

  // Show loading while authentication is being determined
  if (authLoading) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-neutral-600 dark:text-neutral-300">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show login message if not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary-700 dark:text-primary-400 mb-4">
              Please Log In
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">
              You need to be logged in to log your meals.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 dark:text-primary-400 mb-4">
            Log Your Meal Data
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            Track your blood sugar levels and meal details for personalized health insights
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-8 transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Blood Sugar Inputs */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-600 pb-2 flex items-center">
                <BeakerIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
                Blood Sugar Readings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="preMealSugar" className="block text-sm font-medium dark:text-white">Pre-Meal Sugar (mg/dL)</label>
                  <input type="number" id="preMealSugar" name="preMealSugar"
                    value={formData.preMealSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" required placeholder="Pre-Meal Sugar (mg/dL)" />
                </div>
                <div>
                  <label htmlFor="postMealSugar" className="block text-sm font-medium dark:text-white">Post-Meal Sugar (mg/dL)</label>
                  <input type="number" id="postMealSugar" name="postMealSugar"
                    value={formData.postMealSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" required placeholder="Post-Meal Sugar (mg/dL)" />
                </div>
              </div>
            </div>

            {/* Time of Day - Single selection for the entire meal log */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-600 pb-2 flex items-center">
                <CakeIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
                Time of Day
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="timeOfDay" className="block text-sm font-medium dark:text-white">When are you eating this meal?</label>
                  <select 
                    id="timeOfDay" 
                    name="timeOfDay"
                    value={formData.timeOfDay} 
                    onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" 
                    required
                  >
                    {timeOptions.map(time => (
                      <option key={time} value={time} className="dark:text-white">
                        {time}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Meal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <CakeIcon className="h-6 w-6 mr-2 text-primary-600" /> <span className="dark:text-white">Meal Information</span>
              </h2>
              {formData.meals_taken.map((meal, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium dark:text-white">Meal</label>
                    <div className="relative">
                      <input
                        type="text"
                        value={meal.meal}
                        onChange={e => handleMealChange(idx, 'meal', e.target.value)}
                        onFocus={() => handleMealFocus(idx)}
                        onBlur={() => handleMealBlur(idx)}
                        className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2"
                        placeholder={isLoadingMeals ? 'Loading meals...' : 'Type to search meal'}
                        autoComplete="off"
                        required
                      />
                      {meal.showDropdown && meal.meal && mealOptions.length > 0 && (
                        <ul className="absolute z-10 w-full bg-white dark:bg-gray-900 border rounded-xl mt-1 max-h-40 overflow-y-auto shadow-lg">
                          {mealOptions.filter(opt => opt.toLowerCase().includes(meal.meal.toLowerCase())).slice(0, 8).map(opt => (
                            <li
                              key={opt}
                              className="px-4 py-2 cursor-pointer text-white bg-white hover:bg-primary-100 dark:bg-gray-900 dark:hover:bg-primary-900/20"
                              style={{ color: '#fff' }}
                              onMouseDown={() => handleMealChange(idx, 'meal', opt)}
                            >
                              {opt}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium dark:text-white">Quantity</label>
                    <input type="number" value={meal.quantity} min="1" onChange={e => handleMealChange(idx, 'quantity', e.target.value)}
                      className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" placeholder="Amount" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium dark:text-white">Unit</label>
                    <select value={meal.unit} onChange={e => handleMealChange(idx, 'unit', e.target.value)}
                      className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2">
                      {portionUnits.map(unit => <option key={unit.value} value={unit.value} className="dark:text-white">{unit.label}</option>)}
                    </select>
                  </div>
                  {formData.meals_taken.length > 1 && (
                    <div className="sm:col-span-3 flex justify-end">
                      <button type="button" onClick={() => removeMeal(idx)} className="text-danger-600 dark:text-danger-400 text-sm px-3 py-1 rounded-lg hover:bg-danger-50 dark:hover:bg-danger-900/20">Remove</button>
                    </div>
                  )}
                </div>
              ))}
              <button type="button" onClick={addMeal} className="mt-2 px-4 py-2 rounded-xl bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-semibold flex items-center">
                <span className="mr-2">➕</span> Add More Food
              </button>
            </div>

            {/* Notes */}
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange}
              rows={3} className="w-full border px-4 py-3 rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" placeholder="Additional notes..." />

            {/* Prediction */}
            {prediction && (
              <div className={`border rounded-xl p-6 ${
                prediction.error ? 'bg-red-500' :
                (prediction.risk_assessment?.risk_level === 'high' || prediction.risk_level === 'high') ? 'bg-red-500' :
                (prediction.risk_assessment?.risk_level === 'moderate' || 
                 prediction.risk_level === 'moderate') ? 'bg-yellow-500' :
                'bg-green-500'
              }`}>
                <h3 className="font-semibold mb-2 text-white">
                  {prediction.error ? 'Analysis Error' : 'AI Health Assessment - Aggregated Meal Analysis'}
                </h3>
                
                {prediction.error ? (
                  <p className="text-sm mb-4 text-white">Error analyzing meal. Please try again.</p>
                ) : (
                  <>
                    <p className="text-sm mb-4 text-white">{prediction.message}</p>
                    
                    {/* Aggregated Nutrition Summary */}
                    {prediction.aggregated_nutrition && (
                      <div className="bg-white/20 rounded-lg p-4 mb-4">
                        <h4 className="font-medium text-white mb-2">Meal Combination Summary:</h4>
                        <div className="grid grid-cols-2 gap-2 text-sm text-white">
                          <div>Total Calories: {prediction.total_calories?.toFixed(0) || 'N/A'} kcal</div>
                          <div>Total Carbs: {prediction.aggregated_nutrition.carbs_g?.toFixed(1) || 'N/A'} g</div>
                          <div>Glycemic Load: {prediction.total_glycemic_load?.toFixed(1) || 'N/A'}</div>
                          <div>Protein: {prediction.aggregated_nutrition.protein_g?.toFixed(1) || 'N/A'} g</div>
                        </div>
                        {prediction.meal_combination && (
                          <p className="text-xs text-white/80 mt-2">Foods analyzed: {prediction.meal_combination}</p>
                        )}
                      </div>
                    )}
                  </>
                )}

                <div className="mb-4">
                  <h4 className="font-medium text-white mb-2">Recommendations for this meal combination:</h4>
                  <ul className="text-sm list-disc pl-5 text-white">
                    {prediction.recommendations?.map((rec, idx) => (
                      <li key={idx}>
                        {typeof rec === 'object' && rec.name ? (
                          <>
                            <strong>{rec.name}: </strong>
                            {rec.reason || 'No additional details'}
                          </>
                        ) : (
                          typeof rec === 'string' ? rec : 'Invalid recommendation format'
                        )}
                      </li>
                    )) || [
                      <li key="default1">Check your internet connection</li>,
                      <li key="default2">Verify all meal names are correct</li>
                    ]}
                  </ul>
                </div>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={!isFormValid() || isLoading}
              className={`w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl mt-6 transition-all duration-200 ${
                isFormValid() && !isLoading
                  ? 'bg-primary-600 hover:bg-primary-700 text-white'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}>
              {isLoading ? (<><ArrowPathIcon className="h-6 w-6 mr-3 animate-spin" /> Analyzing...</>)
                : prediction === 'success' ? (<><CheckIcon className="h-6 w-6 mr-3" /> Analysis saved successfully</>)
                : (<><CloudIcon className="h-6 w-6 mr-3" /> Submit for Analysis</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MealLog;

import React, { useState, useEffect } from 'react';
import { 
  BeakerIcon, 
  CloudIcon,
  CakeIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { saveMealLog } from "../services/firebase";
import { auth } from "../services/firebase";
import { fetchFoods } from '../services/api';

const MealLog = () => {
  const [userProfile, setUserProfile] = useState(null);
  const [mealOptions, setMealOptions] = useState([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  // Fetch user profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        const profile = await (await import('../services/firebase')).fetchUserProfile(user.uid);
        if (profile) setUserProfile(profile);
      }
    };
    fetchProfile();
  }, []);

  // Check for pending meals from recommendations
  useEffect(() => {
    const pendingMeals = JSON.parse(localStorage.getItem('pendingMealsForLog') || '[]');
    if (pendingMeals.length > 0) {
      // Auto-fill form with pending meals
      const mealsToAdd = pendingMeals.map(meal => ({
        meal: meal.name,
        quantity: 1,
        unit: 'cup',
        showDropdown: false
      }));
      
      setFormData(prev => ({
        ...prev,
        meals_taken: mealsToAdd.length > 0 ? mealsToAdd : prev.meals_taken
      }));
      
      // Clear pending meals
      localStorage.removeItem('pendingMealsForLog');
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
    fastingSugar: '',
    postMealSugar: '',
    notes: '',
    timeOfMeal: '', // Single time selection for all meals
    meals_taken: [
      {
        meal: '',
        quantity: '',
        unit: 'cup',
        showDropdown: false,
      }
    ]
  });
  
  const [validationErrors, setValidationErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // Validate individual meal
  const validateMeal = (meal, index) => {
    const errors = {};
    
    if (!meal.meal.trim()) {
      errors.meal = 'Meal name is required';
    }
    
    const quantity = meal.quantity;
    if (!quantity) {
      errors.quantity = 'Quantity is required';
    } else {
      const numQuantity = parseFloat(quantity);
      // Check if it's a positive whole number
      if (numQuantity <= 0) {
        errors.quantity = 'Quantity must be greater than 0';
      } else if (!Number.isInteger(numQuantity)) {
        errors.quantity = 'Please enter a whole number (e.g., 1, 2, 3)';
      }
    }
    
    if (!meal.unit) {
      errors.unit = 'Measurement unit is required';
    }
    
    return errors;
  };

  // Validate all meals
  const validateAllMeals = () => {
    const allErrors = {};
    let isValid = true;

    formData.meals_taken.forEach((meal, index) => {
      const mealErrors = validateMeal(meal, index);
      if (Object.keys(mealErrors).length > 0) {
        allErrors[`meal_${index}`] = mealErrors;
        isValid = false;
      }
    });

    setValidationErrors(allErrors);
    return isValid;
  };

  // Save log to Firestore
  const saveLog = async (inputData, result) => {
    try {
      const user = auth.currentUser;
      
      // Format meals_taken to include time of day for each meal
      const formattedMeals = inputData.meals_taken.map(meal => ({
        ...meal,
        time_of_day: inputData.timeOfMeal // Use the single selected time for all meals
      }));
      
      await saveMealLog({
        userId: user?.uid || "guest",
        time_of_meal: inputData.timeOfMeal, // Add overall time of meal
        sugar_level_fasting: inputData.fastingSugar,
        sugar_level_post: inputData.postMealSugar,
        meals_taken: formattedMeals,
        notes: inputData.notes,
        ...result,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Error saving log: ", error);
    }
  }

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

    // Real-time validation for the changed field
    if (field === 'meal' || field === 'quantity' || field === 'unit') {
      const updatedMeal = { ...formData.meals_taken[idx], [field]: value };
      const mealErrors = validateMeal(updatedMeal, idx);
      
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        if (Object.keys(mealErrors).length > 0) {
          newErrors[`meal_${idx}`] = mealErrors;
        } else {
          delete newErrors[`meal_${idx}`];
        }
        return newErrors;
      });
    }
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
        { meal: '', quantity: '', unit: 'cup', showDropdown: false }
      ]
    }));
  };

  const removeMeal = (idx) => {
    if (formData.meals_taken.length > 1) {
      setFormData(prev => ({
        ...prev,
        meals_taken: prev.meals_taken.filter((_, i) => i !== idx)
      }));
      
      // Remove validation errors for this meal
      setValidationErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`meal_${idx}`];
        
        // Reindex remaining meal errors
        const reindexedErrors = {};
        Object.keys(newErrors).forEach(key => {
          if (key.startsWith('meal_')) {
            const oldIndex = parseInt(key.split('_')[1]);
            if (oldIndex > idx) {
              reindexedErrors[`meal_${oldIndex - 1}`] = newErrors[key];
            } else if (oldIndex < idx) {
              reindexedErrors[key] = newErrors[key];
            }
          } else {
            reindexedErrors[key] = newErrors[key];
          }
        });
        
        return reindexedErrors;
      });
    }
  };



  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate all meals before submission
    if (!validateAllMeals()) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Use user profile if available
      const profile = userProfile || {};
      
      // Prepare payload with multiple meals grouped under single time
      const payload = {
        age: parseInt(profile.age) || 35,
        gender: profile.gender || 'Male',
        weight_kg: parseFloat(profile.weight) || 70,
        height_cm: parseFloat(profile.height) || 170,
        fasting_sugar: parseFloat(formData.fastingSugar),
        post_meal_sugar: parseFloat(formData.postMealSugar),
        time_of_day: formData.timeOfMeal,
        meals: formData.meals_taken.map(meal => ({
          meal_taken: meal.meal,
          portion_size: parseFloat(meal.quantity),
          portion_unit: meal.unit
        }))
      };
      
      // Call backend for prediction (will need to update API to handle multiple meals)
      const predictionResult = await (await import('../services/api')).predictMultipleMeals(payload);
  setPrediction(predictionResult);
  
  // Extract risk level for dashboard sync (handle both single and multiple meal responses)
  let riskLevel = '';
  if (predictionResult.overall_risk_level) {
    riskLevel = predictionResult.overall_risk_level; // Multiple meals response
  } else if (predictionResult.risk_level) {
    riskLevel = predictionResult.risk_level; // Single meal response
  } else if (predictionResult.risk) {
    riskLevel = predictionResult.risk;
  } else if (predictionResult.recommendations && predictionResult.recommendations[0]?.risk_level) {
    riskLevel = predictionResult.recommendations[0].risk_level;
  }
  
  // Ensure prediction has risk field for dashboard compatibility
  const enhancedPrediction = {
    ...predictionResult,
    risk: riskLevel,
    risk_level: riskLevel // Ensure both fields exist
  };
  
  // Save log to Firestore with enhanced prediction
  await saveLog(formData, { prediction: enhancedPrediction, riskLevel });
    } catch (err) {
      console.error('Prediction or log error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ...existing code...

  // Add isFormValid for form validation
  const isFormValid = formData.fastingSugar && 
                     formData.postMealSugar && 
                     formData.timeOfMeal &&
                     formData.meals_taken.every(m => m.meal && m.quantity && m.unit) &&
                     formData.meals_taken.every(m => parseFloat(m.quantity) > 0) &&
                     Object.keys(validationErrors).length === 0;

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
                  <label htmlFor="fastingSugar" className="block text-sm font-medium dark:text-white">Pre-meal Sugar (mg/dL)</label>
                  <input type="number" id="fastingSugar" name="fastingSugar"
                    value={formData.fastingSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" required placeholder="Pre-meal Sugar (mg/dL)" />
                </div>
                <div>
                  <label htmlFor="postMealSugar" className="block text-sm font-medium dark:text-white">Post-Meal Sugar (mg/dL)</label>
                  <input type="number" id="postMealSugar" name="postMealSugar"
                    value={formData.postMealSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" required placeholder="Post-Meal Sugar (mg/dL)" />
                </div>
              </div>
            </div>

            {/* Meal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <CakeIcon className="h-6 w-6 mr-2 text-primary-600" /> <span className="dark:text-white">Meal Information</span>
              </h2>

              {/* Time of Meal Selector - Moved to top */}
              <div className="mb-6">
                <label htmlFor="timeOfMeal" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                  Time of Meal *
                </label>
                <select
                  id="timeOfMeal"
                  name="timeOfMeal"
                  value={formData.timeOfMeal}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select time of day</option>
                  {timeOptions.map(time => (
                    <option key={time} value={time} className="dark:text-white">{time}</option>
                  ))}
                </select>
              </div>

              {/* Multiple Meal Entries */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-neutral-800 dark:text-neutral-200">
                    Add meals for this time slot:
                  </h3>
                  {formData.timeOfMeal && (
                    <span className="text-sm text-primary-600 dark:text-primary-400 font-medium">
                      {formData.timeOfMeal}
                    </span>
                  )}
                </div>
                {formData.meals_taken.map((meal, idx) => (
                  <div key={idx} className="border border-neutral-200 dark:border-neutral-600 rounded-xl p-4 space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      {/* Meal Name */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Meal Name *
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            value={meal.meal}
                            onChange={e => handleMealChange(idx, 'meal', e.target.value)}
                            onFocus={() => handleMealFocus(idx)}
                            onBlur={() => handleMealBlur(idx)}
                            className={`w-full px-4 py-3 rounded-xl border ${
                              validationErrors[`meal_${idx}`]?.meal 
                                ? 'border-danger-500 focus:ring-danger-500' 
                                : 'border-neutral-300 dark:border-neutral-600 focus:ring-primary-500'
                            } bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent transition-all duration-200`}
                            placeholder={isLoadingMeals ? 'Loading meals...' : 'Type to search meal'}
                            autoComplete="off"
                            required
                          />
                          {meal.showDropdown && meal.meal && mealOptions.length > 0 && (
                            <ul className="absolute z-10 w-full bg-white dark:bg-gray-800 border border-neutral-200 dark:border-neutral-600 rounded-xl mt-1 max-h-40 overflow-y-auto shadow-lg">
                              {mealOptions.filter(opt => opt.toLowerCase().includes(meal.meal.toLowerCase())).slice(0, 8).map(opt => (
                                <li
                                  key={opt}
                                  className="px-4 py-2 cursor-pointer text-neutral-900 dark:text-white hover:bg-primary-100 dark:hover:bg-primary-900/20"
                                  onMouseDown={() => handleMealChange(idx, 'meal', opt)}
                                >
                                  {opt}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                        {validationErrors[`meal_${idx}`]?.meal && (
                          <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                            {validationErrors[`meal_${idx}`].meal}
                          </p>
                        )}
                      </div>

                      {/* Quantity with increment only */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Quantity *
                        </label>
                        <div className="flex">
                          <input
                            type="number"
                            value={meal.quantity}
                            min="1"
                            step="1"
                            onChange={e => handleMealChange(idx, 'quantity', e.target.value)}
                            className={`flex-1 px-4 py-3 rounded-l-xl border ${
                              validationErrors[`meal_${idx}`]?.quantity 
                                ? 'border-danger-500 focus:ring-danger-500' 
                                : 'border-neutral-300 dark:border-neutral-600 focus:ring-primary-500'
                            } bg-white dark:bg-gray-700 text-neutral-900 dark:text-white text-center focus:ring-2 focus:border-transparent transition-all duration-200`}
                            placeholder="1"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const currentQty = parseInt(meal.quantity) || 0;
                              handleMealChange(idx, 'quantity', (currentQty + 1).toString());
                            }}
                            className="px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-r-xl transition-colors duration-200 flex items-center justify-center"
                            title="Add 1"
                          >
                            <span className="font-bold text-lg">+</span>
                          </button>
                        </div>
                        {validationErrors[`meal_${idx}`]?.quantity && (
                          <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                            {validationErrors[`meal_${idx}`].quantity}
                          </p>
                        )}
                      </div>

                      {/* Unit */}
                      <div>
                        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                          Unit *
                        </label>
                        <select 
                          value={meal.unit} 
                          onChange={e => handleMealChange(idx, 'unit', e.target.value)}
                          className={`w-full px-4 py-3 rounded-xl border ${
                            validationErrors[`meal_${idx}`]?.unit 
                              ? 'border-danger-500 focus:ring-danger-500' 
                              : 'border-neutral-300 dark:border-neutral-600 focus:ring-primary-500'
                          } bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:border-transparent transition-all duration-200`}
                        >
                          {portionUnits.map(unit => (
                            <option key={unit.value} value={unit.value} className="dark:text-white">
                              {unit.label}
                            </option>
                          ))}
                        </select>
                        {validationErrors[`meal_${idx}`]?.unit && (
                          <p className="mt-1 text-sm text-danger-600 dark:text-danger-400">
                            {validationErrors[`meal_${idx}`].unit}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Remove button */}
                    {formData.meals_taken.length > 1 && (
                      <div className="flex justify-end">
                        <button 
                          type="button" 
                          onClick={() => removeMeal(idx)} 
                          className="text-danger-600 dark:text-danger-400 hover:text-danger-700 dark:hover:text-danger-300 font-medium flex items-center"
                        >
                          Remove this meal
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                
                {/* Add Another Meal Button */}
                <div className="flex justify-center">
                  <button 
                    type="button" 
                    onClick={addMeal} 
                    className="px-6 py-3 rounded-xl bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/40 font-semibold flex items-center transition-all duration-200"
                  >
                    <span className="mr-2">➕</span> Add Another Meal
                  </button>
                </div>
              </div>
            </div>

            {/* Notes */}
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange}
              rows={3} className="w-full border px-4 py-3 rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" placeholder="Additional notes..." />

            {/* Prediction */}
            {prediction && (
              <div className="space-y-4">
                {/* Overall Assessment */}
                <div className={`border rounded-xl p-6 ${
                  prediction.overall_risk_level === 'high' || prediction.risk_level === 'high' 
                    ? 'bg-danger-50 border-danger-200 dark:bg-danger-900/20 dark:border-danger-800'
                    : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate' 
                    ? 'bg-warning-50 border-warning-200 dark:bg-warning-900/20 dark:border-warning-800'
                    : 'bg-success-50 border-success-200 dark:bg-success-900/20 dark:border-success-800'
                }`}>
                  <h3 className={`font-semibold mb-2 ${
                    prediction.overall_risk_level === 'high' || prediction.risk_level === 'high'
                      ? 'text-danger-800 dark:text-danger-200'
                      : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate'
                      ? 'text-warning-800 dark:text-warning-200'
                      : 'text-success-800 dark:text-success-200'
                  }`}>
                    Health Assessment
                  </h3>
                  <p className={`text-sm mb-4 ${
                    prediction.overall_risk_level === 'high' || prediction.risk_level === 'high'
                      ? 'text-danger-700 dark:text-danger-300'
                      : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate'
                      ? 'text-warning-700 dark:text-warning-300'
                      : 'text-success-700 dark:text-success-300'
                  }`}>
                    {prediction.message}
                  </p>
                  
                  {/* Meal Combination Summary (for multiple meals) */}
                  {prediction.predictions && prediction.predictions.length > 1 && (
                    <div className="mb-4">
                      <h4 className={`text-sm font-medium mb-2 ${
                        prediction.overall_risk_level === 'high' || prediction.risk_level === 'high'
                          ? 'text-danger-800 dark:text-danger-200'
                          : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate'
                          ? 'text-warning-800 dark:text-warning-200'
                          : 'text-success-800 dark:text-success-200'
                      }`}>
                        Meals in this combination:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {prediction.predictions.map((pred, idx) => (
                          <span key={idx} className={`text-xs px-3 py-1 rounded-full font-medium ${
                            prediction.overall_risk_level === 'high' || prediction.risk_level === 'high'
                              ? 'bg-danger-100 dark:bg-danger-900/30 text-danger-800 dark:text-danger-200'
                              : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate'
                              ? 'bg-warning-100 dark:bg-warning-900/30 text-warning-800 dark:text-warning-200'
                              : 'bg-success-100 dark:bg-success-900/30 text-success-800 dark:text-success-200'
                          }`}>
                            {pred.meal}
                          </span>
                        ))}
                      </div>
                      <p className={`text-xs mt-2 ${
                        prediction.overall_risk_level === 'high' || prediction.risk_level === 'high'
                          ? 'text-danger-700 dark:text-danger-300'
                          : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate'
                          ? 'text-warning-700 dark:text-warning-300'
                          : 'text-success-700 dark:text-success-300'
                      }`}>
                        Overall risk level: <strong>{prediction.overall_risk_level || prediction.risk_level}</strong>
                      </p>
                    </div>
                  )}
                  
                  {/* Recommendations */}
                  {prediction.recommendations && prediction.recommendations.length > 0 && (
                    <ul className={`text-sm list-disc pl-5 ${
                      prediction.overall_risk_level === 'high' || prediction.risk_level === 'high'
                        ? 'text-danger-700 dark:text-danger-300'
                        : prediction.overall_risk_level === 'moderate' || prediction.risk_level === 'moderate'
                        ? 'text-warning-700 dark:text-warning-300'
                        : 'text-success-700 dark:text-success-300'
                    }`}>
                      {prediction.recommendations.map((rec, idx) => (
                        <li key={idx}>
                          {rec.name ? <strong>{rec.name}: </strong> : null}
                          {rec.reason || rec}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={!isFormValid || isLoading}
              className="w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-primary-600 text-white mt-6">
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

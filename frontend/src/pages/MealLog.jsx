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
      // Auto-fill form with the first pending meal
      const meal = pendingMeals[0];
      setFormData(prev => ({
        ...prev,
        meals_taken: [
          {
            meal: meal.name,
            quantity: 1,
            unit: 'cup',
            time_of_day: '',
            ml_prediction: null,
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
    fastingSugar: '',
    postMealSugar: '',
    notes: '',
    meals_taken: [
      {
        meal: '',
        quantity: '',
        unit: 'cup',
        time_of_day: '',
        showDropdown: false,
      }
    ]
  });
  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);

  // Save log to Firestore
  const saveLog = async (inputData, result) => {
    try {
      const user = auth.currentUser;
      await saveMealLog({
        userId: user?.uid || "guest",
        sugar_level_fasting: inputData.fastingSugar,
        sugar_level_post: inputData.postMealSugar,
        meals_taken: inputData.meals_taken,
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
        { meal: '', quantity: '', unit: 'cup', time_of_day: '' }
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
      // Prepare payload for backend
      const meal = formData.meals_taken[0];
      // Use user profile if available
      const profile = userProfile || {};
      const payload = {
        age: parseInt(profile.age) || 35,
        gender: profile.gender || 'Male',
        weight_kg: parseFloat(profile.weight) || 70,
        height_cm: parseFloat(profile.height) || 170,
        fasting_sugar: parseFloat(formData.fastingSugar),
        post_meal_sugar: parseFloat(formData.postMealSugar),
        meal_taken: meal.meal,
        time_of_day: meal.time_of_day,
        portion_size: parseFloat(meal.quantity),
        portion_unit: meal.unit
      };
  // Call backend for prediction
  const predictionResult = await (await import('../services/api')).predictDiabetesFriendly(payload);
  setPrediction(predictionResult);
  // Extract risk level for dashboard sync (backend returns risk_level)
  let riskLevel = '';
  if (predictionResult.risk_level) riskLevel = predictionResult.risk_level;
  else if (predictionResult.risk) riskLevel = predictionResult.risk;
  else if (predictionResult.recommendations && predictionResult.recommendations[0]?.risk_level) riskLevel = predictionResult.recommendations[0].risk_level;
  
  // Ensure prediction has risk field for dashboard compatibility
  const enhancedPrediction = {
    ...predictionResult,
    risk: riskLevel
  };
  
  // Save log to Firestore with riskLevel at top level and prediction.risk
  await saveLog(formData, { prediction: enhancedPrediction, riskLevel });
    } catch (err) {
      console.error('Prediction or log error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // ...existing code...

  // Add isFormValid for form validation
  const isFormValid = formData.fastingSugar && formData.postMealSugar && formData.meals_taken.every(m => m.meal && m.quantity && m.unit && m.time_of_day);

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
                  <label htmlFor="fastingSugar" className="block text-sm font-medium dark:text-white">Fasting Sugar (mg/dL)</label>
                  <input type="number" id="fastingSugar" name="fastingSugar"
                    value={formData.fastingSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" required placeholder="Fasting Sugar (mg/dL)" />
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
              {formData.meals_taken.map((meal, idx) => (
                <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
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
                  <div>
                    <label className="block text-sm font-medium dark:text-white">Time of Day</label>
                    <select value={meal.time_of_day} onChange={e => handleMealChange(idx, 'time_of_day', e.target.value)}
                      className="block w-full px-4 py-3 border rounded-xl dark:bg-gray-900 dark:text-white placeholder:text-gray-400 placeholder:dark:text-gray-500 mt-2" required>
                      <option value="" className="dark:text-white">Select time of day</option>
                      {timeOptions.map(time => <option key={time} value={time} className="dark:text-white">{time}</option>)}
                    </select>
                  </div>
                  {formData.meals_taken.length > 1 && (
                    <button type="button" onClick={() => removeMeal(idx)} className="text-danger-600 dark:text-danger-400 text-xs mt-2">Remove</button>
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
              <div className={`border rounded-xl p-6 ${prediction.color}`}>
                <h3 className="font-semibold mb-2 text-white">Health Assessment</h3>
                <p className="text-sm mb-4 text-white">{prediction.message}</p>
                <ul className="text-sm list-disc pl-5 text-white">
                  {prediction.recommendations.map((rec, idx) => (
                    <li key={idx}>
                      {rec.name ? <strong>{rec.name}: </strong> : null}
                      {rec.reason || rec}
                    </li>
                  ))}
                </ul>
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

import React, { useState } from 'react';
import { 
  BeakerIcon, 
  ClockIcon, 
  ScaleIcon,
  CakeIcon,
  ArrowPathIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  CloudIcon
} from '@heroicons/react/24/outline';
import { addDoc, collection } from "firebase/firestore";
import { db, auth } from "../services/firebase";

const MealLog = () => {
  const [formData, setFormData] = useState({
    fastingSugar: '',
    postMealSugar: '',
    mealTaken: '',
    portionAmount: '',
    portionUnit: 'cup',
    timeOfDay: '',
    notes: '',
    customMeal: {
      name: '',
      estimatedCarbs: '',
      estimatedCalories: ''
    }
  });

  const [isLoading, setIsLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [showCustomMeal, setShowCustomMeal] = useState(false);

  // Save log to Firestore
  const saveLog = async (inputData, result) => {
    try {
      const user = auth.currentUser;
      await addDoc(collection(db, "logs"), {
        userId: user?.uid || "guest",
        ...inputData,
        ...result,
        createdAt: new Date()
      });
    } catch (error) {
      console.error("Error saving log: ", error);
    }
  };

  // Meal options
  const mealOptions = [
    'Basmati Rice with Dal','Brown Rice with Dal','Quinoa with Dal',
    'Chapati (Wheat)','Chapati (Multigrain)','Jowar Roti','Bajra Roti',
    'Idli with Sambar','Dosa (Plain)','Dosa (Ragi)','Uttapam','Upma','Poha',
    'Oats (Plain)','Oats with Fruits','Daliya (Broken Wheat)','Besan Chilla',
    'Chicken Curry','Fish Curry','Paneer Curry','Egg Curry','Rajma','Chole',
    'Mixed Vegetables','Palak Sabzi','Bhindi Sabzi','Aloo Gobi',
    'Fruit Salad','Yogurt (Plain)','Nuts (Mixed)','Sprouts Salad',
    'Other (Custom)'
  ];

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
    const { name, value, type, checked } = e.target;
    if (name.startsWith('customMeal.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        customMeal: { ...prev.customMeal, [field]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  const getPrediction = (data) => {
    const fasting = parseFloat(data.fastingSugar);
    const postMeal = parseFloat(data.postMealSugar);
    
    let riskScore = 0;
    if (fasting > 126 || postMeal > 200) riskScore = 0.8;
    else if (fasting > 100 || postMeal > 140) riskScore = 0.4;
    else riskScore = 0.1;
    
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
    const recs = [];
    if (risk === 'high') {
      recs.push('Check blood sugar more frequently today','Consider a light walk after meals','Stay well hydrated');
    } else if (risk === 'medium') {
      recs.push('Monitor portion sizes for next meal','Include fiber-rich foods','Consider adding more vegetables');
    } else {
      recs.push('Continue with current meal patterns','Maintain regular physical activity');
    }
    return recs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const predictionResult = getPrediction(formData);
    setPrediction(predictionResult);

    console.log('Meal log data for ML pipeline:', {
      ...formData,
      timestamp: new Date().toISOString(),
      prediction: predictionResult
    });

    // Save log to Firebase
    await saveLog(formData, predictionResult);

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
            
            {/* Blood Sugar Inputs */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-600 pb-2 flex items-center">
                <BeakerIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
                Blood Sugar Readings
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="fastingSugar" className="block text-sm font-medium">Fasting Sugar (mg/dL)</label>
                  <input type="number" id="fastingSugar" name="fastingSugar"
                    value={formData.fastingSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl" required />
                </div>
                <div>
                  <label htmlFor="postMealSugar" className="block text-sm font-medium">Post-Meal Sugar (mg/dL)</label>
                  <input type="number" id="postMealSugar" name="postMealSugar"
                    value={formData.postMealSugar} onChange={handleInputChange}
                    className="block w-full px-4 py-3 border rounded-xl" required />
                </div>
              </div>
            </div>

            {/* Meal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold flex items-center">
                <CakeIcon className="h-6 w-6 mr-2 text-primary-600" /> Meal Information
              </h2>
              <div>
                <label htmlFor="mealTaken" className="block text-sm font-medium">Meal Taken</label>
                <select id="mealTaken" name="mealTaken" value={formData.mealTaken}
                  onChange={handleMealChange} className="block w-full px-4 py-3 border rounded-xl" required>
                  <option value="">Select a meal</option>
                  {mealOptions.map(meal => <option key={meal} value={meal}>{meal}</option>)}
                </select>
              </div>
              {showCustomMeal && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-xl">
                  <input type="text" name="customMeal.name" placeholder="Custom Meal Name"
                    value={formData.customMeal.name} onChange={handleInputChange}
                    className="border px-3 py-2 rounded-lg" required />
                  <input type="number" name="customMeal.estimatedCarbs" placeholder="Carbs (g)"
                    value={formData.customMeal.estimatedCarbs} onChange={handleInputChange}
                    className="border px-3 py-2 rounded-lg" />
                  <input type="number" name="customMeal.estimatedCalories" placeholder="Calories"
                    value={formData.customMeal.estimatedCalories} onChange={handleInputChange}
                    className="border px-3 py-2 rounded-lg" />
                </div>
              )}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="flex space-x-3">
                  <input type="number" id="portionAmount" name="portionAmount"
                    value={formData.portionAmount} onChange={handleInputChange}
                    className="flex-1 border px-4 py-3 rounded-xl" placeholder="Amount" required />
                  <select name="portionUnit" value={formData.portionUnit}
                    onChange={handleInputChange} className="px-4 py-3 border rounded-xl">
                    {portionUnits.map(unit => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
                  </select>
                </div>
                <select id="timeOfDay" name="timeOfDay" value={formData.timeOfDay}
                  onChange={handleInputChange} className="px-4 py-3 border rounded-xl" required>
                  <option value="">Select time of day</option>
                  {timeOptions.map(time => <option key={time} value={time}>{time}</option>)}
                </select>
              </div>
            </div>

            {/* Notes */}
            <textarea id="notes" name="notes" value={formData.notes} onChange={handleInputChange}
              rows={3} className="w-full border px-4 py-3 rounded-xl" placeholder="Additional notes..." />

            {/* Prediction */}
            {prediction && (
              <div className={`border rounded-xl p-6 ${prediction.color}`}>
                <h3 className="font-semibold mb-2">AI Health Assessment</h3>
                <p className="text-sm mb-4">{prediction.message}</p>
                <ul className="text-sm list-disc pl-5">
                  {prediction.recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
                </ul>
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={!isFormValid || isLoading}
              className="w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl bg-primary-600 text-white">
              {isLoading ? (<><ArrowPathIcon className="h-6 w-6 mr-3 animate-spin" /> Analyzing...</>)
                        : (<><CloudIcon className="h-6 w-6 mr-3" /> Submit to AI Analysis</>)}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MealLog;

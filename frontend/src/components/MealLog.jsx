import React, { useState, useEffect } from 'react';
import { saveMealLog } from '../services/firebase';   // Firestore save
import { predictMealSafety } from '../services/api';  // FastAPI prediction
import SafeMealSuggestions from './SafeMealSuggestions';  // Suggestions UI

const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const UNITS = ['spoons', 'bowls', 'cups'];

export default function MealCard() {
    const [formData, setFormData] = useState({
        sugarFasting: '',
        sugarPostLunch: '',
        previousMeal: '',
        quantity: '',
        unit: 'bowls',
        mealTime: 'Breakfast'
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [meals, setMeals] = useState([]);

    useEffect(() => {
        // Fetch meals list from backend
        fetch('http://localhost:8000/foods')
            .then(res => res.json())
            .then(data => setMeals(data.foods))
            .catch(() => setError('⚠️ Failed to load meal options'));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Call FastAPI prediction
            const result = await predictMealSafety({
                sugar_fasting: parseFloat(formData.sugarFasting),
                sugar_post_lunch: parseFloat(formData.sugarPostLunch),
                previous_meal: formData.previousMeal,
                quantity: parseFloat(formData.quantity),
                unit: formData.unit,
                meal_time: formData.mealTime
            });

            // Save log to Firebase
            await saveMealLog({
                ...formData,
                timestamp: new Date().toISOString(),
                prediction: result
            });

            setPrediction(result);
        } catch (err) {
            setError(`Error: ${err.message || err.toString()}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-4">
            <h2 className="text-2xl font-bold mb-6">🍽️ Log Your Meal</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Sugar Levels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Fasting Sugar (mg/dL)
                        </label>
                        <input
                            type="number"
                            value={formData.sugarFasting}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, sugarFasting: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Post Lunch Sugar (mg/dL)
                        </label>
                        <input
                            type="number"
                            value={formData.sugarPostLunch}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, sugarPostLunch: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                </div>

                {/* Meal Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Previous Meal Taken
                    </label>
                    <select
                        value={formData.previousMeal}
                        onChange={(e) => setFormData(prev => ({
                            ...prev, previousMeal: e.target.value
                        }))}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                    >
                        <option value="">Select a meal</option>
                        {meals.map(meal => (
                            <option key={meal} value={meal}>{meal}</option>
                        ))}
                    </select>
                </div>

                {/* Quantity, Unit, Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Quantity
                        </label>
                        <input
                            type="number"
                            value={formData.quantity}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, quantity: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                            min="0.1"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Unit
                        </label>
                        <select
                            value={formData.unit}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, unit: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        >
                            {UNITS.map(unit => (
                                <option key={unit} value={unit}>{unit}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Time of Day
                        </label>
                        <select
                            value={formData.mealTime}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, mealTime: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        >
                            {MEAL_TIMES.map(time => (
                                <option key={time} value={time}>{time}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Submit */}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-blue-500 text-white p-3 rounded-md hover:bg-blue-600 disabled:bg-gray-400"
                >
                    {loading ? (
                        <div className="flex items-center justify-center">
                            <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                            Analyzing...
                        </div>
                    ) : 'Log Meal'}
                </button>
            </form>

            {/* Error */}
            {error && (
                <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-md">
                    {error}
                </div>
            )}

            {/* Prediction Results */}
            {prediction && <SafeMealSuggestions prediction={prediction} />}
        </div>
    );
}

import React, { useState, useEffect } from 'react';
import { saveMealLog } from '../services/firebase';   // Firestore save
import { predictMealSafety, fetchFoods } from '../services/api';  // FastAPI prediction
import SafeMealSuggestions from './SafeMealSuggestions';  // Suggestions UI

const MEAL_TIMES = ['Breakfast', 'Lunch', 'Dinner', 'Snack'];
const UNITS = ['cup', 'bowl', 'spoon', 'g'];
const GENDERS = ['Male', 'Female', 'Other'];

export default function MealLog() {
    const [formData, setFormData] = useState({
        age: '',
        gender: 'Male',
        weight_kg: '',
        height_cm: '',
        fasting_sugar: '',
        post_meal_sugar: '',
        meal_taken: '',
        portion_size: '',
        portion_unit: 'bowl',
        time_of_day: 'Breakfast'
    });
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [prediction, setPrediction] = useState(null);
    const [meals, setMeals] = useState([]);

    useEffect(() => {
        // Fetch meals list from backend using API service
        const loadMeals = async () => {
            try {
                const data = await fetchFoods();
                setMeals(data.foods);
            } catch (err) {
                setError('⚠️ Failed to load meal options');
            }
        };
        
        loadMeals();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Calculate BMI
            const bmi = parseFloat(formData.weight_kg) / Math.pow(parseFloat(formData.height_cm)/100, 2);
            
            // Call FastAPI prediction
            const result = await predictMealSafety({
                age: parseInt(formData.age),
                gender: formData.gender,
                weight_kg: parseFloat(formData.weight_kg),
                height_cm: parseFloat(formData.height_cm),
                fasting_sugar: parseFloat(formData.fasting_sugar),
                post_meal_sugar: parseFloat(formData.post_meal_sugar),
                meal_taken: formData.meal_taken,
                portion_size: parseFloat(formData.portion_size),
                portion_unit: formData.portion_unit,
                time_of_day: formData.time_of_day
            });

            // Save log to Firebase
            await saveMealLog({
                ...formData,
                bmi: bmi.toFixed(1),
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
                {/* User Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Age (years)
                        </label>
                        <input
                            type="number"
                            value={formData.age}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, age: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                            min="1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Gender
                        </label>
                        <select
                            value={formData.gender}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, gender: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        >
                            {GENDERS.map(gender => (
                                <option key={gender} value={gender}>{gender}</option>
                            ))}
                        </select>
                    </div>
                </div>
                
                {/* Weight & Height */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Weight (kg)
                        </label>
                        <input
                            type="number"
                            value={formData.weight_kg}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, weight_kg: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                            min="1"
                            step="0.1"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Height (cm)
                        </label>
                        <input
                            type="number"
                            value={formData.height_cm}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, height_cm: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                            min="1"
                        />
                    </div>
                </div>

                {/* Sugar Levels */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Pre-meal Sugar (mg/dL)
                        </label>
                        <input
                            type="number"
                            value={formData.fasting_sugar}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, fasting_sugar: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Post Meal Sugar (mg/dL)
                        </label>
                        <input
                            type="number"
                            value={formData.post_meal_sugar}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, post_meal_sugar: e.target.value
                            }))}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                            required
                        />
                    </div>
                </div>

                {/* BMI Display */}
                {formData.weight_kg && formData.height_cm && (
                    <div className="bg-blue-50 p-3 rounded-md text-blue-800">
                        <p className="text-sm font-medium">
                            BMI: {(formData.weight_kg / Math.pow(formData.height_cm/100, 2)).toFixed(1)}
                        </p>
                    </div>
                )}

                {/* Meal Selection */}
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Meal Taken
                    </label>
                    <select
                        value={formData.meal_taken}
                        onChange={(e) => setFormData(prev => ({
                            ...prev, meal_taken: e.target.value
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

                {/* Portion Size, Unit, Time */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">
                            Portion Size
                        </label>
                        <input
                            type="number"
                            value={formData.portion_size}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, portion_size: e.target.value
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
                            value={formData.portion_unit}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, portion_unit: e.target.value
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
                            value={formData.time_of_day}
                            onChange={(e) => setFormData(prev => ({
                                ...prev, time_of_day: e.target.value
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

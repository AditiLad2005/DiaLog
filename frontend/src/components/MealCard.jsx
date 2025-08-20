import React, { useState, useEffect, useRef } from "react";
import { predictDiabetesFriendly, fetchFoods } from "../services/api";
import { FiUser, FiActivity, FiClock, FiTrendingUp, FiSearch, FiAlertTriangle, FiCheck, FiLoader, FiX } from "react-icons/fi";

const GENDERS = ["Male", "Female", "Other"];
const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const PORTION_UNITS = ["cup", "bowl", "spoon", "g", "serving"];

export default function MealCard() {
  const [formData, setFormData] = useState({
    age: "",
    gender: "Male",
    weight_kg: "",
    height_cm: "",
    fasting_sugar: "",
    post_meal_sugar: "",
    meal_taken: "",
    portion_size: "1",
    portion_unit: "serving",
    time_of_day: "Lunch",
  });

  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState(null);
  const [loadingFoods, setLoadingFoods] = useState(true);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Auto-calculate BMI
  const bmi = formData.weight_kg && formData.height_cm 
    ? (formData.weight_kg / ((formData.height_cm / 100) ** 2)).toFixed(1)
    : null;

  // Fetch foods on component mount
  useEffect(() => {
    setLoadingFoods(true);
    fetch('http://localhost:8000/foods')
      .then(res => res.json())
      .then(data => {
        setFoods(data.foods || []);
        setLoadingFoods(false);
      })
      .catch(err => {
        console.error("Failed to load foods:", err);
        setError("Failed to load food options. Please try again.");
        setLoadingFoods(false);
        // Fallback foods
        setFoods([
          "Rice", "Dal", "Chicken", "Apple", "Chapati", 
          "Paneer", "Eggs", "Fish", "Vegetables"
        ]);
      });
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filter foods based on search
  const filteredFoods = searchTerm 
    ? foods.filter(food => 
        food.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : foods;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);

    // Validation
    if (!formData.meal_taken) {
      setError("Please select a meal from the dropdown.");
      setLoading(false);
      return;
    }

    try {
      const result = await predictDiabetesFriendly({
        age: parseInt(formData.age),
        gender: formData.gender,
        weight_kg: parseFloat(formData.weight_kg),
        height_cm: parseFloat(formData.height_cm),
        fasting_sugar: parseFloat(formData.fasting_sugar),
        post_meal_sugar: parseFloat(formData.post_meal_sugar),
        meal_taken: formData.meal_taken,
        portion_size: parseFloat(formData.portion_size),
        portion_unit: formData.portion_unit,
        time_of_day: formData.time_of_day,
      });

      setPrediction(result);
    } catch (err) {
      console.error("Prediction error:", err);
      setError(`Analysis failed: ${err?.detail || err?.message || "Please try again."}`);
    } finally {
      setLoading(false);
    }
  };

  const selectFood = (food) => {
    setFormData((p) => ({ ...p, meal_taken: food }));
    setSearchTerm(food);
    setShowDropdown(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-2xl shadow-lg">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-blue-800 mb-2">
          Diabetes Meal Safety Analyzer
        </h2>
        <p className="text-gray-600">
          Get personalized meal safety predictions based on your health profile
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Personal Information Section */}
        <div className="bg-blue-50 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <FiUser className="text-blue-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Personal Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Age (years)
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData(prev => ({ ...prev, age: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="18"
                max="100"
                placeholder="25"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Gender
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {GENDERS.map(gender => (
                  <option key={gender} value={gender}>{gender}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                value={formData.weight_kg}
                onChange={(e) => setFormData(prev => ({ ...prev, weight_kg: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="30"
                max="200"
                step="0.1"
                placeholder="70.0"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Height (cm)
              </label>
              <input
                type="number"
                value={formData.height_cm}
                onChange={(e) => setFormData(prev => ({ ...prev, height_cm: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="100"
                max="250"
                step="0.1"
                placeholder="175.0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                BMI (Auto-calculated)
              </label>
              <input
                type="text"
                value={bmi ? `${bmi} ${bmi < 18.5 ? '(Underweight)' : bmi < 25 ? '(Normal)' : bmi < 30 ? '(Overweight)' : '(Obese)'}` : ''}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-gray-600"
                readOnly
                placeholder="BMI will appear here"
              />
            </div>
          </div>
        </div>

        {/* Blood Sugar Levels */}
        <div className="bg-red-50 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <FiTrendingUp className="text-red-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Blood Sugar Levels</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fasting Sugar (mg/dL)
              </label>
              <input
                type="number"
                value={formData.fasting_sugar}
                onChange={(e) => setFormData(prev => ({ ...prev, fasting_sugar: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="50"
                max="400"
                step="0.1"
                placeholder="100"
              />
              <p className="text-xs text-gray-500 mt-1">Normal: 70-100 mg/dL</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Post Meal Sugar (mg/dL)
              </label>
              <input
                type="number"
                value={formData.post_meal_sugar}
                onChange={(e) => setFormData(prev => ({ ...prev, post_meal_sugar: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="70"
                max="500"
                step="0.1"
                placeholder="140"
              />
              <p className="text-xs text-gray-500 mt-1">Normal: &lt;140 mg/dL (2hrs after meal)</p>
            </div>
          </div>
        </div>

        {/* Meal Information */}
        <div className="bg-green-50 rounded-xl p-6">
          <div className="flex items-center mb-4">
            <FiActivity className="text-green-600 mr-2" size={20} />
            <h3 className="text-lg font-semibold text-gray-800">Meal Information</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div ref={dropdownRef}>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search & Select Meal
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowDropdown(true)}
                placeholder="Type to search meals..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              {showDropdown && (
                <div className="relative z-10">
                  <div className="absolute w-full max-h-60 overflow-y-auto bg-white border border-gray-300 rounded-lg shadow-lg">
                    {loadingFoods ? (
                      <div className="p-3 text-gray-500 text-center">
                        <div className="animate-spin inline-block h-4 w-4 border-2 border-blue-500 border-t-transparent rounded-full mr-2"></div>
                        Loading meals...
                      </div>
                    ) : filteredFoods.length > 0 ? (
                      filteredFoods.map(food => (
                        <div
                          key={food}
                          onClick={() => selectFood(food)}
                          className="p-2 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          {food}
                        </div>
                      ))
                    ) : (
                      <div className="p-3 text-gray-500 text-center">No meals found</div>
                    )}
                  </div>
                </div>
              )}
              <select
                value={formData.meal_taken}
                onChange={(e) => setFormData(prev => ({ ...prev, meal_taken: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                <option value="">Select a meal</option>
                {loadingFoods ? (
                  <option disabled>Loading meals...</option>
                ) : filteredFoods.length > 0 ? (
                  filteredFoods.map(food => (
                    <option key={food} value={food}>{food}</option>
                  ))
                ) : (
                  <option disabled>No meals found</option>
                )}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Time of Day
              </label>
              <select
                value={formData.time_of_day}
                onChange={(e) => setFormData(prev => ({ ...prev, time_of_day: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {MEAL_TIMES.map(time => (
                  <option key={time} value={time}>{time}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Portion Size
              </label>
              <input
                type="number"
                value={formData.portion_size}
                onChange={(e) => setFormData(prev => ({ ...prev, portion_size: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                min="0.1"
                step="0.1"
                placeholder="1"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit
              </label>
              <select
                value={formData.portion_unit}
                onChange={(e) => setFormData(prev => ({ ...prev, portion_unit: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              >
                {PORTION_UNITS.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Analyzing Your Meal Safety...
            </div>
          ) : (
            <>
              <FiClock className="inline mr-2" />
              Analyze Meal Safety
            </>
          )}
        </button>
      </form>

      {/* Error Display */}
      {error && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <div className="flex items-center">
            <FiActivity className="mr-2 text-red-500" />
            <span className="font-medium">Error:</span>
            <span className="ml-2">{error}</span>
          </div>
        </div>
      )}

      {/* Results Display */}
      {prediction && (
        <div className="mt-8 space-y-6">
          {/* Main Result */}
          <div className={`p-6 rounded-xl border-2 ${
            prediction.is_safe 
              ? 'bg-green-50 border-green-200' 
              : 'bg-yellow-50 border-yellow-200'
          }`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-gray-800">
                Safety Analysis Result
              </h3>
              <div className={`px-4 py-2 rounded-full font-semibold ${
                prediction.is_safe 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-yellow-100 text-yellow-800'
              }`}>
                {prediction.is_safe ? '✅ Safe' : '⚠️ Caution'}
              </div>
            </div>
            
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-500">Confidence</p>
                <p className="text-lg font-bold text-blue-600">
                  {(prediction.confidence * 100).toFixed(1)}%
                </p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-500">Risk Level</p>
                <p className="text-lg font-bold text-blue-600">
                  {prediction.risk_level}
                </p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-sm text-gray-500">Your BMI</p>
                <p className="text-lg font-bold text-blue-600">
                  {prediction.bmi}
                </p>
              </div>
            </div>
            
            <p className="text-gray-700">{prediction.message}</p>
          </div>

          {/* Nutritional Information */}
          {prediction.nutritional_info && (
            <div className="bg-blue-50 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Nutritional Information (Your Portion)
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">Calories</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(prediction.nutritional_info.calories)}
                  </p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">Carbs</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(prediction.nutritional_info.carbs_g)}g
                  </p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">Protein</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(prediction.nutritional_info.protein_g)}g
                  </p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">Fat</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(prediction.nutritional_info.fat_g)}g
                  </p>
                </div>
                <div className="text-center p-3 bg-white rounded-lg">
                  <p className="text-sm text-gray-500">Fiber</p>
                  <p className="text-lg font-bold text-blue-600">
                    {Math.round(prediction.nutritional_info.fiber_g)}g
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Recommendations */}
          {prediction.recommendations && prediction.recommendations.length > 0 && (
            <div className="bg-gray-50 p-6 rounded-xl">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">
                Recommendations
              </h4>
              <div className="space-y-3">
                {prediction.recommendations.map((rec, index) => (
                  <div key={index} className="flex items-start p-3 bg-white rounded-lg border-l-4 border-blue-500">
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{rec.name}</p>
                      <p className="text-sm text-gray-600">{rec.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

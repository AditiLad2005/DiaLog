import React, { useState, useEffect } from "react";
import {
  predictDiabetesFriendly,
  saveMealLog,
  fetchFoods,
} from "../services/api";

const MEAL_TIMES = ["Breakfast", "Lunch", "Dinner", "Snack"];
const UNITS = ["spoons", "bowls", "cups"];

export default function MealCard() {
  const [formData, setFormData] = useState({
    sugarFasting: "",
    sugarPostLunch: "",
    previousMeal: "",
    quantity: "",
    unit: "bowls",
    mealTime: "Breakfast",
  });

  const [foods, setFoods] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [prediction, setPrediction] = useState(null);

  // 🔹 Fetch foods from backend
  useEffect(() => {
    fetchFoods()
      .then((data) => setFoods(data.foods || []))
      .catch(() => setError("Failed to load foods"));
  }, []);

  // 🔹 Filter foods based on search
  const filteredFoods = foods.filter((food) =>
    food.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await predictDiabetesFriendly({
        sugar_fasting: parseFloat(formData.sugarFasting),
        sugar_post_lunch: parseFloat(formData.sugarPostLunch),
        previous_meal: formData.previousMeal,
        quantity: parseFloat(formData.quantity),
        unit: formData.unit,
        meal_time: formData.mealTime,
      });

      // 🔹 Save meal log (history)
      await saveMealLog({
        ...formData,
        timestamp: new Date().toISOString(),
        prediction_result: result,
      });

      setPrediction(result);
    } catch (err) {
      setError(err.toString());
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Meal Safety Check</h2>

      {/* ---------------- FORM ---------------- */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Sugar Levels */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Fasting Sugar Level (mg/dL)
            </label>
            <input
              type="number"
              value={formData.sugarFasting}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, sugarFasting: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Post Lunch Sugar Level (mg/dL)
            </label>
            <input
              type="number"
              value={formData.sugarPostLunch}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  sugarPostLunch: e.target.value,
                }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            />
          </div>
        </div>

        {/* Previous Meal Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Previous Meal Taken
          </label>
          <div className="mt-1">
            <input
              type="text"
              placeholder="Search meals..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="block w-full rounded-md border-gray-300 shadow-sm mb-2"
            />
            <select
              value={formData.previousMeal}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  previousMeal: e.target.value,
                }))
              }
              className="block w-full rounded-md border-gray-300 shadow-sm"
              required
            >
              <option value="">Select a meal</option>
              {filteredFoods.map((food) => (
                <option key={food} value={food}>
                  {food}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity + Unit */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Quantity
            </label>
            <input
              type="number"
              value={formData.quantity}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, quantity: e.target.value }))
              }
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
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, unit: e.target.value }))
              }
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
              required
            >
              {UNITS.map((unit) => (
                <option key={unit} value={unit}>
                  {unit}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Meal Time */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Time of Day
          </label>
          <select
            value={formData.mealTime}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, mealTime: e.target.value }))
            }
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
            required
          >
            {MEAL_TIMES.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {loading ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              Analyzing...
            </div>
          ) : (
            "Check Meal Safety"
          )}
        </button>
      </form>

      {/* ---------------- ERROR ---------------- */}
      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded">{error}</div>
      )}

      {/* ---------------- PREDICTION ---------------- */}
      {prediction && (
        <div className="mt-4">
          <div
            className={`p-4 rounded-lg ${
              prediction.is_safe
                ? "bg-green-50 border-green-200"
                : "bg-yellow-50 border-yellow-200"
            } border`}
          >
            <h3 className="font-bold text-lg mb-2">Prediction Results</h3>
            <div className="flex items-center mb-2">
              <span
                className={`text-lg font-semibold ${
                  prediction.is_safe ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {prediction.is_safe ? "✅ Safe" : "⚠️ Risky"}
              </span>
              <span className="ml-2 text-gray-600">
                (Confidence: {(prediction.confidence * 100).toFixed(1)}%)
              </span>
            </div>

            {/* Recommended Meals */}
            <div className="mt-4">
              <h4 className="font-semibold mb-2">Recommended Alternatives:</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {prediction.recommendations.map((meal, index) => (
                  <div
                    key={index}
                    className="p-3 bg-white rounded shadow-sm"
                  >
                    <h5 className="font-medium">{meal.name}</h5>
                    <p className="text-sm text-gray-600">
                      Carbs: {meal.carbs}g | GI: {meal.glycemic_index}
                    </p>
                    <p className="text-sm text-gray-600">
                      Recommended portion: {meal.portion}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

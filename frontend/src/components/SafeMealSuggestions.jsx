import React from 'react';

export default function SafeMealSuggestions({ prediction, loading }) {
    if (loading) {
        return (
            <div className="animate-pulse p-4">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
        );
    }

    if (!prediction) return null;

    // Sample meal plan based on prediction recommendations
    const mealPlanByTime = {
        Breakfast: [],
        Lunch: [],
        Dinner: [],
        Snack: []
    };
    
    // Distribute recommendations into meal times
    if (prediction.recommendations && prediction.recommendations.length > 0) {
        prediction.recommendations.forEach((rec, idx) => {
            if (rec.name && rec.name !== "Reduce portion size" && rec.name !== "Pair with protein/fiber") {
                const category = ['Breakfast', 'Lunch', 'Dinner', 'Snack'][idx % 4];
                if (mealPlanByTime[category].length < 3) { // Limit to 3 per category
                    mealPlanByTime[category].push({
                        name: rec.name,
                        reason: rec.reason,
                        portion: "1 serving",
                        carbs: "20g",
                        gi: "Low"
                    });
                }
            }
        });
    }
    
    // Ensure at least one item per category
    Object.keys(mealPlanByTime).forEach(category => {
        if (mealPlanByTime[category].length === 0) {
            mealPlanByTime[category].push({
                name: "Recommended " + category.toLowerCase() + " option",
                portion: "1 serving", 
                carbs: "15g",
                gi: "Low"
            });
        }
    });

    return (
        <div className="mt-8">
            {/* Prediction Card */}
            <div className={`p-6 rounded-lg mb-6 ${
                prediction.is_safe ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
            } border shadow-md`}>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-2xl font-bold">
                        {prediction.is_safe ? '✅ Safe' : '⚠️ Risky'}
                    </h3>
                    <div className="text-lg font-medium">
                        {(prediction.confidence * 100).toFixed(0)}% confidence
                    </div>
                </div>
                <p className="text-gray-700">
                    {prediction.message}
                </p>
                
                {prediction.bmi && (
                    <div className="mt-3 text-sm text-gray-600">
                        BMI: {prediction.bmi} • Risk Level: {prediction.risk_level}
                    </div>
                )}
            </div>

            {/* Personalized Meal Plan Grid */}
            <h3 className="text-xl font-bold mb-4">Personalized Meal Plan</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                {Object.entries(mealPlanByTime).map(([timeOfDay, meals]) => (
                    <div key={timeOfDay} className="bg-white p-4 rounded-lg shadow-sm">
                        <h4 className="font-semibold text-lg border-b pb-2 mb-3">{timeOfDay}</h4>
                        <div className="space-y-3">
                            {meals.map((meal, idx) => (
                                <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                                    <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0 overflow-hidden">
                                        <img 
                                            src={`/assets/meals/${meal.name.toLowerCase().replace(/\s+/g, '-')}.jpg`} 
                                            alt={meal.name}
                                            onError={(e) => {e.target.src = '/assets/meals/default.jpg'}}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="font-medium">{meal.name}</p>
                                        <div className="flex text-xs text-gray-600 space-x-2">
                                            <span>{meal.portion}</span>
                                            <span>•</span>
                                            <span>Carbs: {meal.carbs}</span>
                                            <span>•</span>
                                            <span>GI: {meal.gi}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* Avoid Section */}
            <div className="bg-red-50 p-4 rounded-lg shadow-sm border border-red-100">
                <h4 className="font-bold mb-3 text-red-800">Foods to Avoid</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {!prediction.is_safe ? (
                        <div className="bg-white p-2 rounded border border-red-100 text-gray-700">
                            {prediction.meal_taken || 'Current selection'} - {prediction.portion_analysis?.status || 'High risk'}
                        </div>
                    ) : (
                        <div className="text-gray-500 italic">No specific foods to avoid with your current parameters.</div>
                    )}
                </div>
            </div>

            {/* Nutritional Info */}
            <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
                <h4 className="font-bold mb-2">Nutritional Analysis:</h4>
                <div className="grid grid-cols-2 gap-4">
                    {prediction.nutritional_info && Object.entries(prediction.nutritional_info).map(([key, value]) => (
                        <div key={key} className="flex justify-between">
                            <span className="text-gray-600">{key.replace(/_/g, ' ')}:</span>
                            <span className="font-medium">{typeof value === 'number' ? value.toFixed(1) : value}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

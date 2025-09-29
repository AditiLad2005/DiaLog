const API_BASE_URL = "http://localhost:8000";

/**
 * Fetch all available foods from the database
 * @returns {Promise<{foods: string[], count: number}>}
 */
export async function fetchFoods() {
  try {
    const response = await fetch(`${API_BASE_URL}/foods`);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to fetch foods: ${errorText}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Error fetching foods:", error);
    throw error;
  }
}

/**
 * Get details about a specific food
 * @param {string} foodName - The name of the food
 * @returns {Promise<Object>} - Food details
 */
export async function getFoodDetails(foodName) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/food/${encodeURIComponent(foodName)}`
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.detail || "Failed to get food details");
    }

    const data = await response.json();
    // Normalize: flatten common fields to top-level for older components
    const flattened = {
      name: data.name,
      ...data,
      calories: data.calories ?? data?.nutritional_info?.calories_kcal,
      carbs: data.carbs ?? data?.nutritional_info?.carbs_g,
      protein: data.protein ?? data?.nutritional_info?.protein_g,
      fat: data.fat ?? data?.nutritional_info?.fat_g,
      fiber: data.fiber ?? data?.nutritional_info?.fiber_g,
      glycemicIndex: data.glycemicIndex ?? data?.nutritional_info?.glycemic_index,
      glycemic_load: data.glycemic_load ?? data?.nutritional_info?.glycemic_load
    };
    return flattened;
  } catch (error) {
    console.error(`Error fetching details for ${foodName}:`, error);
    throw error;
  }
}

/**
 * Predict if a meal is diabetes-friendly
 * @param {Object} mealData - User and meal data
 * @returns {Promise<Object>} - Prediction results
 */
export async function predictDiabetesFriendly(mealData) {
  try {
    const response = await fetch(`${API_BASE_URL}/predict`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mealData),
    });

    if (!response.ok) {
      let detail = 'Unknown error';
      try {
        const errorData = await response.json();
        detail = typeof errorData?.detail === 'string' ? errorData.detail : JSON.stringify(errorData?.detail ?? errorData);
      } catch (e) {
        const text = await response.text();
        detail = text || 'Unknown error';
      }
      throw new Error(`Prediction error: ${detail}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Prediction request failed:", error);
    throw error;
  }
}

/**
 * Convert backend food details into display rows of [label, value]
 */
export function buildNutritionRows(foodDetails) {
  if (!foodDetails) return [];
  const n = foodDetails.nutritional_info || {};
  const rows = [
    ['Calories (kcal)', n.calories_kcal],
    ['Carbs (g)', n.carbs_g],
    ['Protein (g)', n.protein_g],
    ['Fat (g)', n.fat_g],
    ['Fiber (g)', n.fiber_g],
    ['Sugar (g)', n.sugar_g],
    ['Glycemic Index', n.glycemic_index],
    ['Glycemic Load', n.glycemic_load],
    ['Sodium (mg)', n.sodium_mg],
    ['Serving Size (g)', n.serving_size_g],
    ['Default Portion', n.default_portion],
  ];
  return rows.filter(([_, v]) => v !== undefined && v !== null && v !== '');
}

/**
 * Get personalized meal recommendations using ML model
 * @param {Object} userProfile - User profile data
 * @returns {Promise<Object>} - ML-powered recommendations
 */
export async function getPersonalizedRecommendations(userProfile) {
  try {
    const response = await fetch(`${API_BASE_URL}/recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userProfile),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Recommendation error: ${errorData.detail || "Unknown error"}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Recommendation request failed:", error);
    throw error;
  }
}

/**
 * Get truly personalized meal recommendations using individual user ML models
 * @param {Object} userProfile - User profile data with user_id
 * @returns {Promise<Object>} - Personalized ML recommendations based on user logs
 */
export async function getTrulyPersonalizedRecommendations(userProfile) {
  try {
    const response = await fetch(`${API_BASE_URL}/truly-personalized-recommendations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(userProfile),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Personalized recommendation error: ${errorData.detail || "Unknown error"}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Personalized recommendation request failed:", error);
    // Fallback to general recommendations
    return await getPersonalizedRecommendations(userProfile);
  }
}

/**
 * Check if the API is healthy and models are loaded
 * @returns {Promise<Object>} - Health status
 */
export async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);

    if (!response.ok) {
      throw new Error("API health check failed");
    }

    return await response.json();
  } catch (error) {
    console.error("Health check failed:", error);
    throw error;
  }
}

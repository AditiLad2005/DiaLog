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

    return await response.json();
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
      const errorData = await response.json();
      throw new Error(`Prediction error: ${errorData.detail || "Unknown error"}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Prediction request failed:", error);
    throw error;
  }
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
 * Log aggregated meal data to Firestore and get prediction
 * @param {Object} mealLogData - Aggregated meal log data
 * @returns {Promise<Object>} - Log result with prediction and nutrition data
 */
export async function logMealToFirestore(mealLogData) {
  try {
    const response = await fetch(`${API_BASE_URL}/log-meal-firestore`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mealLogData),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Meal logging error: ${errorData.detail || "Unknown error"}`);
    }

    return await response.json();
  } catch (error) {
    console.error("Meal logging request failed:", error);
    throw error;
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

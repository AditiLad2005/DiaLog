import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

export const predictDiabetesFriendly = async (foodData) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/predict`, foodData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const checkApiHealth = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/health`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

export const saveMealLog = async (mealLog) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/log_meal`, mealLog);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

// ✅ New function for fetching foods
export const fetchFoods = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/foods`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error.message;
    }
};

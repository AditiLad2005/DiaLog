import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChartBarIcon, 
  PlusIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CursorArrowRaysIcon
} from '@heroicons/react/24/outline';
import SafeMealSuggestions from '../components/SafeMealSuggestions';
import BloodSugarLineChart from '../components/LineChart';
import MealRiskDonutChart from '../components/DonutChart';
import HealthPlanModal from '../components/HealthPlanModal';

import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db, auth, fetchUserLogs, fetchUserProfile } from "../services/firebase";

const Dashboard = () => {
  const [bloodSugarData, setBloodSugarData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  const [userProfile, setUserProfile] = useState({});
  
  // Health Plan Modal state
  const [isHealthPlanOpen, setIsHealthPlanOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('low');

  // Load ML data + logs on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Wait for auth state to be determined
        const user = auth.currentUser;
        console.log('Current user:', user); // Debug log
        
        if (!user) {
          // Try to wait for auth state
          const unsubscribe = auth.onAuthStateChanged((authUser) => {
            if (authUser) {
              console.log('Auth user found:', authUser.uid); // Debug log
              loadUserData(authUser.uid);
            } else {
              setError('Please log in to view your dashboard.');
              setLoading(false);
            }
            unsubscribe(); // Cleanup
          });
          return;
        }
        
        await loadUserData(user.uid);
      } catch (err) {
        setError('Error loading dashboard data. Please try again.');
        console.error('Error loading dashboard data:', err);
        setLoading(false);
      }
    };

    const loadUserData = async (userId) => {
      try {
        // Double-check authentication before fetching
        const currentUser = auth.currentUser;
        console.log('loadUserData - Current user:', currentUser); // Debug log
        console.log('loadUserData - User ID:', userId); // Debug log
        
        if (!currentUser) {
          setError('User not authenticated');
          setLoading(false);
          return;
        }
        
        // Fetch logs from Firestore using the improved service function
        let logs = [];
        try {
          logs = await fetchUserLogs(userId, 50);
          console.log('Fetched logs:', logs); // Debug log
        } catch (err) {
          console.error('Firestore fetch error:', err);
          console.error('Error code:', err.code); // Debug log
          console.error('Error message:', err.message); // Debug log
          setError(`Error fetching logs from Firestore: ${err.message}`);
          logs = [];
        }
        setRecentLogs(logs);

        // Fetch user profile for recommendations
        let profile = {};
        try {
          profile = await fetchUserProfile(userId);
          console.log('Fetched user profile:', profile); // Debug log
          setUserProfile({ ...(profile || {}), user_id: userId });
        } catch (err) {
          console.error('Profile fetch error:', err);
          setUserProfile({ user_id: userId });
        }

        // Aggregate stats from logs
        let fastingSum = 0, postMealSum = 0, riskyMeals = 0;
        logs.forEach(log => {
          const fasting = parseFloat(log.sugar_level_fasting || log.fastingSugar || 0);
          const postMeal = parseFloat(log.sugar_level_post || log.postMealSugar || 0);
          fastingSum += isNaN(fasting) ? 0 : fasting;
          postMealSum += isNaN(postMeal) ? 0 : postMeal;
          // Risky meal detection - check multiple sources
          const logRisk = log.riskLevel || log.prediction?.risk_level || log.prediction?.risk || '';
          if ((postMeal > 180) || (logRisk && logRisk.toLowerCase() === 'high')) riskyMeals++;
        });
        const avgFasting = logs.length ? (fastingSum / logs.length) : 0;
        const avgPostMeal = logs.length ? (postMealSum / logs.length) : 0;

        setBloodSugarData({
          data: logs.slice(0, 7).map(log => ({
            date: log.createdAt ? (log.createdAt instanceof Date ? log.createdAt.toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()) : new Date().toLocaleDateString(),
            time: Array.isArray(log.meals_taken) && log.meals_taken.length > 0 ? log.meals_taken[0].time_of_day : (log.time_of_day || 'Unknown'),
            fasting: parseFloat(log.sugar_level_fasting || log.fastingSugar || 0),
            postMeal: parseFloat(log.sugar_level_post || log.postMealSugar || 0),
            prediction: log.prediction?.risk_level || log.prediction?.risk || log.riskLevel || 'unknown',
          })),
          summary: {
            avgFasting,
            avgPostMeal,
            improvement: '',
            riskTrend: '',
          }
        });

        // Helper to get risk from log - check all possible sources
        const getRisk = l => {
          if (l.riskLevel && l.riskLevel.trim()) return l.riskLevel.toLowerCase();
          if (l.prediction?.risk_level) return l.prediction.risk_level.toLowerCase();
          if (l.prediction?.risk) return l.prediction.risk.toLowerCase();
          if (l.prediction?.recommendations && l.prediction.recommendations[0]?.risk_level) return l.prediction.recommendations[0].risk_level.toLowerCase();
          // Fallback: check sugar levels
          const postMeal = parseFloat(l.sugar_level_post || l.postMealSugar || 0);
          if (postMeal > 180) return 'high';
          if (postMeal > 140) return 'medium';
          return 'low';
        };
        
        // Create meal-based data for donut chart
        const mealDataArray = logs.slice(0, 8).map((log, index) => {
          const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
            ? log.meals_taken[0].meal 
            : (log.meal_name || log.meal || `Meal ${index + 1}`);
          const risk = getRisk(log);
          const postMeal = parseFloat(log.sugar_level_post || log.postMealSugar || 0);
          return {
            name: mealName,
            value: 1, // Each meal is 1 unit
            risk: risk,
            postMeal: postMeal,
            color: risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#10b981'
          };
        });

        console.log('Meal Data Array:', mealDataArray); // Debug log
        
        // Risk summary data (for fallback)
        const riskDataArray = [
          { name: 'Low Risk', value: logs.filter(l => getRisk(l) === 'low').length, count: logs.filter(l => getRisk(l) === 'low').length, color: '#10b981' },
          { name: 'Medium Risk', value: logs.filter(l => getRisk(l) === 'medium').length, count: logs.filter(l => getRisk(l) === 'medium').length, color: '#f59e0b' },
          { name: 'High Risk', value: logs.filter(l => getRisk(l) === 'high').length, count: logs.filter(l => getRisk(l) === 'high').length, color: '#ef4444' }
        ];
        
        setRiskData({
          data: riskDataArray,
          mealData: mealDataArray, // Add meal-specific data
          totalMeals: logs.length,
          riskScore: logs.length ? (riskyMeals / logs.length) : 0,
          insights: [],
        });

        // ML Insights (placeholder, could be enhanced)
        setInsights({
          insights: [
            {
              type: 'pattern',
              title: 'Evening Meals Impact',
              description: 'Your blood sugar tends to be higher after dinner meals.',
              confidence: 0.89,
              suggestion: 'Consider smaller portions or earlier dinner times.'
            },
            {
              type: 'improvement',
              title: 'Weekend Progress',
              description: 'Your weekend meal management has improved.',
              confidence: 0.76,
              suggestion: 'Keep up the great work with portion control!'
            },
            {
              type: 'alert',
              title: 'Carbohydrate Sensitivity',
              description: 'Rice-based meals show higher post-meal spikes.',
              confidence: 0.82,
              suggestion: 'Try pairing rice with more protein and fiber.'
            }
          ],
          overallScore: logs.length ? (10 - (riskyMeals * 10 / logs.length)) : 10,
          weeklyTrend: '',
          nextModelUpdate: '',
        });
        
        setLoading(false);
      } catch (err) {
        console.error('Error in loadUserData:', err);
        setError(`Error processing user data: ${err.message}`);
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const stats = {
    averageFasting: bloodSugarData?.summary?.avgFasting?.toFixed(1) || 0,
    averagePostMeal: bloodSugarData?.summary?.avgPostMeal?.toFixed(1) || 0,
    totalLogs: recentLogs.length,
    riskyMeals: riskData?.data?.find(item => item.name === 'High Risk')?.count || 0
  };

  // Handle meal click to show health plan
  const handleMealClick = (log) => {
    const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
      ? log.meals_taken[0].meal 
      : (log.meal_name || log.meal || 'Unknown Meal');
    
    // Get risk level from various sources or determine from food content
    let risk = log.riskLevel || log.prediction?.risk_level || log.prediction?.risk || 
      (log.prediction?.recommendations && log.prediction.recommendations[0]?.risk_level);
    
    // If no risk level found, determine from food content and blood sugar
    if (!risk) {
      const foodLower = mealName.toLowerCase();
      const postMealSugar = log.sugar_level_post || log.postMealSugar || 0;
      
      // High risk indicators
      if (foodLower.includes('sweet') || foodLower.includes('dessert') || foodLower.includes('cake') ||
          foodLower.includes('sugar') || foodLower.includes('ice cream') || foodLower.includes('chocolate') ||
          postMealSugar > 200) {
        risk = 'high';
      }
      // Medium risk indicators
      else if (foodLower.includes('rice') || foodLower.includes('bread') || foodLower.includes('pasta') ||
               foodLower.includes('fried') || foodLower.includes('potato') || foodLower.includes('noodles') ||
               (postMealSugar > 140 && postMealSugar <= 200)) {
        risk = 'medium';
      }
      // Low risk
      else {
        risk = 'low';
      }
    }
    
    setSelectedMeal({
      mealName: mealName,
      timestamp: log.createdAt ? (log.createdAt instanceof Date ? log.createdAt.toLocaleDateString() : new Date(log.createdAt).toLocaleDateString()) : new Date().toLocaleDateString(),
      fastingSugar: log.sugar_level_fasting || log.fastingSugar || '',
      postMealSugar: log.sugar_level_post || log.postMealSugar || '',
      timeOfDay: Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
        ? log.meals_taken[0].time_of_day 
        : (log.time_of_day || '')
    });
    
    setSelectedRiskLevel(risk);
    setIsHealthPlanOpen(true);
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
      {error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 text-red-700 rounded-xl border border-red-300 text-center">
          {error}
        </div>
      )}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {(!recentLogs || recentLogs.length === 0) && !error && (
          <div className="text-center py-12 text-white text-lg">No meal logs found. Log a meal to see your dashboard analytics.</div>
        )}
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 dark:text-primary-400 mb-2">
              Your Health Dashboard
            </h1>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">
              Track your progress and manage your diabetes effectively
            </p>
          </div>
          <Link
            to="/meal-log"
            className="mt-4 sm:mt-0 inline-flex items-center px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-300 shadow-medium hover:shadow-strong transform hover:-translate-y-1"
          >
            <PlusIcon className="h-5 w-5 mr-2" />
            Log New Meal
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-3 bg-primary-100 dark:bg-primary-900/30 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Avg Fasting</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.averageFasting}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">mg/dL</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-3 bg-success-100 dark:bg-success-900/30 rounded-xl">
                <ChartBarIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Avg Post-Meal</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.averagePostMeal}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">mg/dL</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-3 bg-secondary-100 dark:bg-secondary-900/30 rounded-xl">
                <CalendarDaysIcon className="h-6 w-6 text-secondary-600 dark:text-secondary-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Total Logs</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.totalLogs}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">entries</p>
              </div>
            </div>
          </div>

          <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center">
              <div className="p-3 bg-danger-100 dark:bg-danger-900/30 rounded-xl">
                <ExclamationTriangleIcon className="h-6 w-6 text-danger-600 dark:text-danger-400" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Risky Meals</p>
                <p className="text-2xl font-bold text-neutral-900 dark:text-white">{stats.riskyMeals}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500">this week</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Logs and Recommendations Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Logs */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 transition-colors duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Meal Logs</h2>
              <Link
                to="/meal-log"
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 font-medium"
              >
                View All
              </Link>
            </div>

            <div className="space-y-4">
              {recentLogs.length === 0 ? (
                <div className="p-4 rounded-lg border-2 border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-900 text-center text-neutral-500 dark:text-neutral-400">
                  No meal logs found. Log a meal to see your recent entries here.
                </div>
              ) : (
                <>
                  {(showAllLogs ? recentLogs : recentLogs.slice(0, 5)).map((log) => {
                    // Extract meal info (support array or single)
                    const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 ? log.meals_taken[0].meal : (log.meal || '');
                    const fasting = log.sugar_level_fasting || log.fastingSugar || '';
                    const postMeal = log.sugar_level_post || log.postMealSugar || '';
                    const createdAt = log.createdAt?.toDate?.() ? log.createdAt.toDate().toLocaleDateString() : '';
                    const time = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 ? log.meals_taken[0].time_of_day : (log.time_of_day || '');
                    
                    // Get risk level with smart fallback
                    let risk = log.riskLevel || log.prediction?.risk_level || log.prediction?.risk || 
                      (log.prediction?.recommendations && log.prediction.recommendations[0]?.risk_level);
                    
                    // If no risk level found, determine from food content and blood sugar
                    if (!risk) {
                      const foodLower = mealName.toLowerCase();
                      const postMealSugar = log.sugar_level_post || log.postMealSugar || 0;
                      
                      // High risk indicators
                      if (foodLower.includes('sweet') || foodLower.includes('dessert') || foodLower.includes('cake') ||
                          foodLower.includes('sugar') || foodLower.includes('ice cream') || foodLower.includes('chocolate') ||
                          postMealSugar > 200) {
                        risk = 'high';
                      }
                      // Medium risk indicators
                      else if (foodLower.includes('rice') || foodLower.includes('bread') || foodLower.includes('pasta') ||
                               foodLower.includes('fried') || foodLower.includes('potato') || foodLower.includes('noodles') ||
                               (postMealSugar > 140 && postMealSugar <= 200)) {
                        risk = 'medium';
                      }
                      // Low risk
                      else {
                        risk = 'low';
                      }
                    }
                    return (
                      <div
                        key={log.id}
                        onClick={() => handleMealClick(log)}
                        className={`
                          relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer
                          hover:shadow-lg hover:scale-[1.02] transform group
                          ${risk === 'high' 
                            ? 'border-danger-600 bg-danger-700 text-white hover:bg-danger-600' 
                            : risk === 'medium'
                            ? 'border-warning-200 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20 hover:bg-warning-100 dark:hover:bg-warning-900/30'
                            : 'border-success-200 bg-success-50 dark:border-success-700 dark:bg-success-900/20 hover:bg-success-100 dark:hover:bg-success-900/30'
                          }
                        `}
                      >
                        {/* Hover indicator */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <div className="flex items-center space-x-1 px-2 py-1 bg-white dark:bg-gray-800 rounded-full shadow-md">
                            <CursorArrowRaysIcon className="h-3 w-3 text-primary-600 dark:text-primary-400" />
                            <span className="text-xs text-primary-600 dark:text-primary-400 font-medium">View Health Plan</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {risk !== 'high' && (
                              <div className={`
                                p-2 rounded-full
                                ${risk === 'medium' ? 'bg-warning-200 dark:bg-warning-800' : 'bg-success-200 dark:bg-success-800'}
                              `}>
                                {risk === 'medium' ? (
                                  <ExclamationTriangleIcon className="h-5 w-5 text-warning-600 dark:text-warning-400" />
                                ) : (
                                  <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                                )}
                              </div>
                            )}
                            <div>
                              <h3 className={`font-semibold ${risk === 'high' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{mealName || '-'}</h3>
                              <p className={`text-sm ${risk === 'high' ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>{createdAt} {time ? `• ${time}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex space-x-4 text-sm">
                              <div>
                                <p className={`text-gray-600 dark:text-gray-400 ${risk === 'high' ? 'text-white' : ''}`}>Fasting</p>
                                <p className={`font-semibold ${risk === 'high' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{fasting ? `${fasting} mg/dL` : '-'}</p>
                              </div>
                              <div>
                                <p className={`text-gray-600 dark:text-gray-400 ${risk === 'high' ? 'text-white' : ''}`}>Post-Meal</p>
                                <p className={`font-semibold ${risk === 'high' ? 'text-white' : 'text-gray-900 dark:text-white'}`}>{postMeal ? `${postMeal} mg/dL` : '-'}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  
                  {/* Show/Hide button for additional logs */}
                  {recentLogs.length > 5 && (
                    <button
                      onClick={() => setShowAllLogs(!showAllLogs)}
                      className="w-full mt-4 px-4 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 bg-primary-50 dark:bg-primary-900/20 hover:bg-primary-100 dark:hover:bg-primary-900/30 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2"
                    >
                      <span>
                        {showAllLogs ? 'Show Less' : `Show ${recentLogs.length - 5} More`}
                      </span>
                      {showAllLogs ? (
                        <ChevronUpIcon className="h-4 w-4" />
                      ) : (
                        <ChevronDownIcon className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-soft p-6 transition-colors duration-200">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">Quick Actions</h2>
            
            <div className="space-y-4">
              <Link
                to="/meal-log"
                className="block p-4 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-700 rounded-lg hover:bg-primary-100 dark:hover:bg-primary-900/30 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <PlusIcon className="h-6 w-6 text-primary-600 dark:text-primary-400" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Log New Meal</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Record your meal and get health insights</p>
                  </div>
                </div>
              </Link>

              <Link
                to="/profile"
                className="block p-4 bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200"
              >
                <div className="flex items-center space-x-3">
                  <ChartBarIcon className="h-6 w-6 text-gray-600 dark:text-gray-400" />
                  <div>
                    <h3 className="font-medium text-gray-900 dark:text-white">Update Profile</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Keep your health information current</p>
                  </div>
                </div>
              </Link>

              <button 
                className="w-full p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700 rounded-lg hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors duration-200"
                onClick={() => {
                  const element = document.getElementById('meal-recommendations');
                  if (element) {
                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }
                }}
              >
                <div className="flex items-center space-x-3">
                  <SparklesIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">Get Meal Recommendations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Personalized food suggestions</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* Charts Section - ML Data Visualization */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-semibold text-neutral-900 dark:text-white">
              Health Analytics
            </h2>
            {loading && (
              <div className="flex items-center text-primary-600 dark:text-primary-400">
                <ArrowPathIcon className="h-4 w-4 mr-2 animate-spin" />
                <span className="text-sm">Loading ML data...</span>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* Blood Sugar Trends Line Chart */}
            <BloodSugarLineChart 
              data={bloodSugarData?.data} 
              title="7-Day Blood Sugar Trends"
            />
            
            {/* Meal Risk Distribution Donut Chart */}
            <MealRiskDonutChart 
              data={riskData?.mealData} 
              title="Recent Meals Analysis"
              showMealNames={true}
            />
          </div>

          {/* ML Insights */}
          {insights && (
            <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
                Health Insights from Model Training
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {insights.insights.map((insight, index) => (
                  <div key={index} className="p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                    <div className="flex items-start space-x-3">
                      <div className={`
                        p-2 rounded-lg flex-shrink-0
                        ${insight.type === 'alert' ? 'bg-warning-100 dark:bg-warning-900/30' :
                          insight.type === 'improvement' ? 'bg-success-100 dark:bg-success-900/30' :
                          'bg-primary-100 dark:bg-primary-900/30'}
                      `}>
                        {insight.type === 'alert' ? (
                          <ExclamationTriangleIcon className="h-4 w-4 text-warning-600 dark:text-warning-400" />
                        ) : insight.type === 'improvement' ? (
                          <CheckCircleIcon className="h-4 w-4 text-success-600 dark:text-success-400" />
                        ) : (
                          <ChartBarIcon className="h-4 w-4 text-primary-600 dark:text-primary-400" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-neutral-900 dark:text-white text-sm mb-1">
                          {insight.title}
                        </h4>
                        <p className="text-xs text-neutral-600 dark:text-neutral-400 mb-2">
                          {insight.description}
                        </p>
                        <p className="text-xs text-primary-600 dark:text-primary-400 font-medium">
                          {insight.suggestion}
                        </p>
                        <div className="mt-2">
                          <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400">
                            {Math.round(insight.confidence * 100)}% confidence
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-4 p-3 bg-neutral-50 dark:bg-neutral-700 rounded-lg">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-neutral-600 dark:text-neutral-400">Overall Health Score:</span>
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    {insights.overallScore}/10
                  </span>
                </div>
                <div className="mt-2 w-full bg-neutral-200 dark:bg-neutral-600 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${(insights.overallScore / 10) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Smart Meal Recommendations */}
        <div id="meal-recommendations" className="mt-8">
          <SafeMealSuggestions userProfile={userProfile} className="mb-8" />
        </div>

        {/* Coming Soon Section */}
        <div className="bg-primary-600 rounded-xl p-6 text-white text-center">
          <h3 className="text-xl font-semibold mb-2">More Features Coming Soon!</h3>
          <p className="text-primary-100">
            Advanced analytics, detailed health reports, integration with wearable devices, and personalized meal planning are on the way.
          </p>
        </div>
      </div>

      {/* Health Plan Modal */}
      <HealthPlanModal
        meal={selectedMeal}
        riskLevel={selectedRiskLevel}
        isOpen={isHealthPlanOpen}
        onClose={() => setIsHealthPlanOpen(false)}
      />
    </div>
  );
};

export default Dashboard;

import React, { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../contexts/AuthContext';

import { collection, getDocs } from "firebase/firestore";
import { db } from "../services/firebase";

const Dashboard = () => {
  const { user, loading: authLoading } = useAuth();
  const [bloodSugarData, setBloodSugarData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);
  const [error, setError] = useState(null);
  const [showAllLogs, setShowAllLogs] = useState(false);
  
  // Health Plan Modal state
  const [isHealthPlanOpen, setIsHealthPlanOpen] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState(null);
  const [selectedRiskLevel, setSelectedRiskLevel] = useState('low');

  // CONSISTENT COLOR SCHEME - Used by both meal cards and donut chart
  const getRiskColors = (risk) => {
    const riskLower = risk?.toLowerCase() || 'unknown';
    switch (riskLower) {
      case 'high':
        return {
          main: '#ef4444',          // danger-500
          background: '#ef4444',    // danger-500 (same for consistency)
          border: '#dc2626',        // danger-600
          text: 'white',
          icon: 'white'
        };
      case 'moderate':              // STANDARDIZED: use "moderate" not "medium"
        return {
          main: '#f59e0b',          // warning-500
          background: '#f59e0b',    // warning-500 (same for consistency)
          border: '#d97706',        // warning-600
          text: 'white',
          icon: 'white'
        };
      case 'low':
      default:
        return {
          main: '#10b981',          // success-500
          background: '#10b981',    // success-500 (same for consistency)
          border: '#059669',        // success-600
          text: 'white',
          icon: 'white'
        };
    }
  };

  // SINGLE SOURCE OF TRUTH: Use AI risk level stored in Firebase
  const assessRisk = (log) => {
    const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
      ? log.meals_taken[0].meal 
      : (log.meal || 'Unknown');
    
    console.log('=== ASSESSING RISK FOR:', mealName, '===');
    console.log('Full log object:', log);
    
    // Special debug for specific meals
    if (mealName.toLowerCase().includes('chicken sandwich') || mealName.toLowerCase().includes('butter chicken')) {
      console.log('🔍 DEBUGGING MEAL:', mealName);
      console.log('- Full log data:', JSON.stringify(log, null, 2));
      console.log('- ai_risk_level field:', log.ai_risk_level);
      console.log('- prediction structure:', JSON.stringify(log.prediction, null, 2));
    }
    
    // PRIORITY 1: Use stored AI risk level from Firebase (single source of truth)
    if (log.ai_risk_level) {
      const storedRisk = log.ai_risk_level.toLowerCase();
      console.log('✅ Using stored AI risk level from Firebase:', storedRisk);
      
      // Parse the stored format: "low risk" -> "low", "moderate risk" -> "moderate", etc.
      if (storedRisk.includes('high')) return 'high';
      if (storedRisk.includes('moderate')) return 'moderate';
      if (storedRisk.includes('low')) return 'low';
    }
    
    // FALLBACK: Try to extract from prediction object (for backward compatibility)
    if (log.prediction?.risk_assessment?.risk_level) {
      const aiRisk = log.prediction.risk_assessment.risk_level.toLowerCase();
      console.log('📋 Using prediction.risk_assessment.risk_level:', aiRisk);
      return aiRisk;
    }
    
    // FALLBACK: Blood sugar levels (for very old data)
    const postMeal = parseFloat(log.sugar_level_post || log.postMealSugar || 0);
    if (postMeal > 200) {
      console.log('🩸 Blood sugar > 200 - HIGH RISK');
      return 'high';
    } else if (postMeal >= 140) {
      console.log('🩸 Blood sugar 140-200 - MODERATE RISK');
      return 'moderate';
    }
    
    // Default: Low risk
    console.log('⚪ Defaulting to LOW RISK');
    return 'low';
  };

  // Fetch logs from Firebase
  const fetchLogs = useCallback(async () => {
    console.log('fetchLogs called, user:', user?.uid);
    console.log('User auth state:', {
      isSignedIn: !!user,
      uid: user?.uid,
      email: user?.email
    });
    
    if (!user) {
      console.log('No authenticated user found');
      return [];
    }
    
    try {
      console.log('Attempting to fetch from meal_logs collection for user:', user.uid);
      
      // Fetch meal logs from user's collection instead of global meal_logs
      try {
        console.log('Fetching meal logs from user collection...');
        const userMealLogsCollection = collection(db, `users/${user.uid}/meal_logs`);
        
        const userSnapshot = await getDocs(userMealLogsCollection);
        console.log(`Found ${userSnapshot.docs.length} meal logs for user`);
        
        if (userSnapshot.docs.length > 0) {
          const logs = userSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          // Sort by timestamp
          logs.sort((a, b) => {
            const timeA = a.timestamp?.toDate?.() || new Date(a.createdAt || 0);
            const timeB = b.timestamp?.toDate?.() || new Date(b.createdAt || 0);
            return timeB - timeA;
          });
          return logs;
        }
        
        return [];
        
      } catch (userError) {
        console.error('Error accessing user meal logs:', userError);
        throw userError;
      }
      
    } catch (error) {
      console.error('Error fetching user meal logs:', error);
      throw error; // Re-throw to be caught by the calling function
    }
  }, [user]); // Dependencies for useCallback

  // Load dashboard data when user is authenticated
  useEffect(() => {
    const loadDashboardData = async () => {
      if (authLoading) {
        console.log('Still waiting for auth state...');
        return;
      }
      
      if (!user) {
        console.log('No user authenticated');
        setError('Please log in to view your dashboard.');
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        setError(null);
        
        // Fetch logs from Firestore
        let logs = [];
        try {
          console.log('Starting to fetch logs for authenticated user...');
          logs = await fetchLogs();
          console.log('Successfully fetched logs:', logs.length);
        } catch (err) {
          console.error('Error in fetchLogs:', err);
          setError(`Error fetching logs from Firestore: ${err.message}`);
          logs = [];
        }
        setRecentLogs(logs);
        setRecentLogs(logs);

        // Aggregate stats from logs - DAILY AVERAGES ONLY
        const today = new Date().toLocaleDateString(); // Get today's date string
        const todayLogs = logs.filter(log => {
          let logDate = '';
          if (log.createdAt?.toDate) {
            logDate = log.createdAt.toDate().toLocaleDateString();
          } else if (log.timestamp?.toDate) {
            logDate = log.timestamp.toDate().toLocaleDateString();
          } else if (log.createdAt) {
            logDate = new Date(log.createdAt).toLocaleDateString();
          }
          return logDate === today;
        });

        let fastingSum = 0, postMealSum = 0, riskyMeals = 0;
        let fastingCount = 0, postMealCount = 0;
        
        todayLogs.forEach(log => {
          const fasting = parseFloat(log.sugar_level_fasting);
          const postMeal = parseFloat(log.sugar_level_post);
          
          if (!isNaN(fasting) && fasting > 0) {
            fastingSum += fasting;
            fastingCount++;
          }
          if (!isNaN(postMeal) && postMeal > 0) {
            postMealSum += postMeal;
            postMealCount++;
          }
          
          // Risky meal detection - use the centralized assessRisk function
          const mealRisk = assessRisk(log);
          if (mealRisk === 'high') riskyMeals++;
        });
        
        const avgFasting = fastingCount > 0 ? (fastingSum / fastingCount) : 0;
        const avgPostMeal = postMealCount > 0 ? (postMealSum / postMealCount) : 0;

        setBloodSugarData({
          data: (() => {
            // Group logs by date and handle multiple meals per day
            const groupedByDate = {};
            logs.slice(0, 14).forEach((log, index) => {
              let dateKey;
              let timeLabel;
              
              if (log.createdAt?.toDate) {
                const date = log.createdAt.toDate();
                dateKey = date.toLocaleDateString();
                timeLabel = date.toLocaleDateString();
              } else if (log.timestamp?.toDate) {
                const date = log.timestamp.toDate();
                dateKey = date.toLocaleDateString();
                timeLabel = date.toLocaleDateString();
              } else if (log.createdAt) {
                const date = new Date(log.createdAt);
                dateKey = date.toLocaleDateString();
                timeLabel = date.toLocaleDateString();
              } else {
                dateKey = `Day ${index + 1}`;
                timeLabel = `Day ${index + 1}`;
              }
              
              const fasting = parseFloat(log.sugar_level_fasting || log.fastingSugar || 0);
              const postMeal = parseFloat(log.sugar_level_post || log.postMealSugar || 0);
              
              if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = {
                  date: dateKey,
                  time: timeLabel,
                  fasting: [],
                  postMeal: [],
                  predictions: []
                };
              }
              
              if (!isNaN(fasting) && fasting > 0) groupedByDate[dateKey].fasting.push(fasting);
              if (!isNaN(postMeal) && postMeal > 0) groupedByDate[dateKey].postMeal.push(postMeal);
              groupedByDate[dateKey].predictions.push(log.prediction?.risk || log.riskLevel || 'unknown');
            });
            
            // Convert grouped data to chart format with averages for multiple meals per day
            return Object.values(groupedByDate).map(dayData => ({
              date: dayData.date,
              time: dayData.time,
              fasting: dayData.fasting.length > 0 ? 
                Math.round(dayData.fasting.reduce((a, b) => a + b, 0) / dayData.fasting.length) : 0,
              postMeal: dayData.postMeal.length > 0 ? 
                Math.round(dayData.postMeal.reduce((a, b) => a + b, 0) / dayData.postMeal.length) : 0,
              mealCount: Math.max(dayData.fasting.length, dayData.postMeal.length),
              prediction: dayData.predictions[0] || 'unknown'
            })).sort((a, b) => new Date(a.date) - new Date(b.date));
          })(),
          summary: {
            avgFasting,
            avgPostMeal,
            improvement: '',
            riskTrend: '',
          }
        });

        // Helper to get risk from log - use the centralized function
        const getRisk = assessRisk;
        
        // Create meal-based data for donut chart
        const mealDataArray = logs.slice(0, 8).map((log, index) => {
          const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
            ? log.meals_taken[0].meal 
            : (log.meal || `Meal ${index + 1}`);
          const risk = getRisk(log);
          const postMeal = parseFloat(log.sugar_level_post || log.postMealSugar || 0);
          return {
            name: mealName,
            value: 1, // Each meal is 1 unit
            risk: risk,
            postMeal: postMeal,
            color: risk === 'high' ? '#ef4444' : risk === 'moderate' ? '#f59e0b' : '#10b981'
          };
        });

        console.log('Meal Data Array:', mealDataArray); // Debug log
        
        // Risk summary data with meal details - STANDARDIZED LABELS
        const lowRiskLogs = logs.filter(l => getRisk(l) === 'low');
        const moderateRiskLogs = logs.filter(l => getRisk(l) === 'moderate');
        const highRiskLogs = logs.filter(l => getRisk(l) === 'high');
        
        const riskDataArray = [
          { 
            name: 'Low Risk', 
            value: lowRiskLogs.length, 
            count: lowRiskLogs.length, 
            color: '#10b981',
            meals: lowRiskLogs.map(log => {
              if (Array.isArray(log.meals_taken) && log.meals_taken.length > 0) {
                return log.meals_taken[0].meal;
              } else if (Array.isArray(log.meal_names) && log.meal_names.length > 0) {
                return log.meal_names.join(', ');
              }
              return log.meal || 'Unknown Meal';
            })
          },
          { 
            name: 'Moderate Risk', 
            value: moderateRiskLogs.length, 
            count: moderateRiskLogs.length, 
            color: '#f59e0b',
            meals: moderateRiskLogs.map(log => {
              if (Array.isArray(log.meals_taken) && log.meals_taken.length > 0) {
                return log.meals_taken[0].meal;
              } else if (Array.isArray(log.meal_names) && log.meal_names.length > 0) {
                return log.meal_names.join(', ');
              }
              return log.meal || 'Unknown Meal';
            })
          },
          { 
            name: 'High Risk', 
            value: highRiskLogs.length, 
            count: highRiskLogs.length, 
            color: '#ef4444',
            meals: highRiskLogs.map(log => {
              if (Array.isArray(log.meals_taken) && log.meals_taken.length > 0) {
                return log.meals_taken[0].meal;
              } else if (Array.isArray(log.meal_names) && log.meal_names.length > 0) {
                return log.meal_names.join(', ');
              }
              return log.meal || 'Unknown Meal';
            })
          }
        ].filter(item => item.value > 0); // Only include categories with data
        
        // If no data, provide meaningful default
        const finalRiskData = riskDataArray.length > 0 ? riskDataArray : [
          { name: 'No Data Available', value: 1, count: 0, color: '#6b7280' }
        ];
        
        
        setRiskData({
          data: finalRiskData, // Use filtered risk data
          mealData: finalRiskData, // Use filtered risk data for donut chart
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
      } catch (err) {
        setError('Error loading dashboard data. Please try again.');
        console.error('Error loading dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    
    loadDashboardData();
  }, [user, authLoading, fetchLogs]); // Depend on user, authLoading, and fetchLogs

  const stats = {
    averageFasting: bloodSugarData?.summary?.avgFasting?.toFixed(1) || 0,
    averagePostMeal: bloodSugarData?.summary?.avgPostMeal?.toFixed(1) || 0,
    totalLogs: (() => {
      // Count today's logs only
      const today = new Date().toLocaleDateString();
      return recentLogs.filter(log => {
        let logDate = '';
        if (log.createdAt?.toDate) {
          logDate = log.createdAt.toDate().toLocaleDateString();
        } else if (log.timestamp?.toDate) {
          logDate = log.timestamp.toDate().toLocaleDateString();
        } else if (log.createdAt) {
          logDate = new Date(log.createdAt).toLocaleDateString();
        }
        return logDate === today;
      }).length;
    })(),
    riskyMeals: riskData?.data?.find(item => item.name === 'High Risk')?.count || 0
  };

  // Handle meal click to show health plan
  const handleMealClick = (log) => {
    const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
      ? log.meals_taken[0].meal 
      : (log.meal || 'Unknown Meal');
    
    // Get risk level using centralized assessment function
    const risk = assessRisk(log);
    
    setSelectedMeal({
      mealName: mealName,
      timestamp: log.createdAt?.toDate?.() ? log.createdAt.toDate().toLocaleDateString() : '',
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
      {/* Show loading screen during authentication */}
      {authLoading && (
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-lg text-neutral-600 dark:text-neutral-300">Loading...</p>
          </div>
        </div>
      )}
      
      {/* Show error only after auth is loaded */}
      {!authLoading && error && (
        <div className="max-w-2xl mx-auto mb-6 p-4 bg-red-100 text-red-700 rounded-xl border border-red-300 text-center">
          {error}
        </div>
      )}
      
      {/* Main dashboard content */}
      {!authLoading && (
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
                <p className="text-sm text-neutral-600 dark:text-neutral-400">Avg Pre-Meal</p>
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
                    // Extract meal info - check meal_names array first (new structure)
                    let mealName = 'Unknown Meal';
                    if (Array.isArray(log.meal_names) && log.meal_names.length > 0) {
                      mealName = log.meal_names.join(', ');
                    } else if (Array.isArray(log.meals_taken) && log.meals_taken.length > 0) {
                      mealName = log.meals_taken[0].meal || mealName;
                    } else if (log.meal) {
                      mealName = log.meal;
                    }
                    const fasting = log.sugar_level_fasting || log.fastingSugar || '';
                    const postMeal = log.sugar_level_post || log.postMealSugar || '';
                    // Handle timestamp field from new Firebase structure
                    let createdAt = '';
                    if (log.timestamp?.toDate) {
                      createdAt = log.timestamp.toDate().toLocaleDateString();
                    } else if (log.createdAt?.toDate) {
                      createdAt = log.createdAt.toDate().toLocaleDateString();
                    } else if (log.createdAt) {
                      createdAt = new Date(log.createdAt).toLocaleDateString();
                    }
                    // Extract time from meals array (new structure) or fallback to old structure
                    let time = '';
                    if (Array.isArray(log.meals) && log.meals.length > 0) {
                      time = log.meals[0].time_of_day || '';
                    } else if (Array.isArray(log.meals_taken) && log.meals_taken.length > 0) {
                      time = log.meals_taken[0].time_of_day || '';
                    } else {
                      time = log.time_of_day || '';
                    }
                    
                    // Get risk level using centralized assessment function
                    const risk = assessRisk(log);
                    const riskColors = getRiskColors(risk);
                    
                    return (
                      <div
                        key={log.id}
                        onClick={() => handleMealClick(log)}
                        className="relative p-4 rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-lg hover:scale-[1.02] transform group"
                        style={{
                          backgroundColor: riskColors.background,
                          borderColor: riskColors.border,
                          color: riskColors.text
                        }}
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
                            <div className="flex items-center space-x-2">
                              {risk === 'moderate' ? (
                                <ExclamationTriangleIcon className="h-5 w-5" style={{ color: riskColors.icon }} />
                              ) : risk === 'low' ? (
                                <CheckCircleIcon className="h-5 w-5" style={{ color: riskColors.icon }} />
                              ) : null}
                            </div>
                            <div>
                              <h3 className="font-semibold" style={{ color: riskColors.text }}>{mealName || '-'}</h3>
                              <p className="text-sm opacity-90" style={{ color: riskColors.text }}>{createdAt} {time ? `• ${time}` : ''}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="flex space-x-4 text-sm">
                              <div>
                                <p className="opacity-75" style={{ color: riskColors.text }}>Fasting</p>
                                <p className="font-semibold" style={{ color: riskColors.text }}>{fasting ? `${fasting} mg/dL` : '-'}</p>
                              </div>
                              <div>
                                <p className="opacity-75" style={{ color: riskColors.text }}>Post-Meal</p>
                                <p className="font-semibold" style={{ color: riskColors.text }}>{postMeal ? `${postMeal} mg/dL` : '-'}</p>
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
              title="Risk Distribution Analysis"
              showMealNames={false}
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
        <div id="meal-recommendations">
          <SafeMealSuggestions className="mb-8" />
        </div>

        {/* Coming Soon Section */}
        <div className="bg-primary-600 rounded-xl p-6 text-white text-center">
          <h3 className="text-xl font-semibold mb-2">More Features Coming Soon!</h3>
          <p className="text-primary-100">
            Advanced analytics, detailed health reports, integration with wearable devices, and personalized meal planning are on the way.
          </p>
        </div>

        {/* Health Plan Modal */}
        <HealthPlanModal
          meal={selectedMeal}
          riskLevel={selectedRiskLevel}
          isOpen={isHealthPlanOpen}
          onClose={() => setIsHealthPlanOpen(false)}
        />
      </div>
      )}
    </div>
  );
};

export default Dashboard;

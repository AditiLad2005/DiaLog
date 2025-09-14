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

  // Centralized risk assessment function - used by both meal cards and donut chart
  const assessRisk = (log) => {
    const mealName = Array.isArray(log.meals_taken) && log.meals_taken.length > 0 
      ? log.meals_taken[0].meal 
      : (log.meal || 'Unknown');
    
    console.log('=== ASSESSING RISK FOR:', mealName, '===');
    console.log('Full log object:', log);
    console.log('Prediction object:', log.prediction);
    
    // CRITICAL SAFETY CHECKS FIRST - Override everything for extreme values
    const postMeal = parseFloat(log.sugar_level_post || log.postMealSugar || 0);
    
    // Check for extreme nutritional values that are always high risk
    // Check multiple possible locations for nutritional data
    const totalCalories = log.prediction?.aggregated_nutrition?.calories || 
                         log.prediction?.total_calories || 
                         log.prediction?.calories ||
                         log.aggregated_nutrition?.calories ||
                         log.total_calories ||
                         log.calories || 0;
                         
    const totalCarbs = log.prediction?.aggregated_nutrition?.carbs || 
                      log.prediction?.total_carbs || 
                      log.prediction?.carbs ||
                      log.aggregated_nutrition?.carbs ||
                      log.total_carbs ||
                      log.carbs || 0;
                      
    const glycemicLoad = log.prediction?.aggregated_nutrition?.glycemic_load || 
                        log.prediction?.total_glycemic_load || 
                        log.prediction?.glycemic_load ||
                        log.aggregated_nutrition?.glycemic_load ||
                        log.total_glycemic_load ||
                        log.glycemic_load || 0;
    
    console.log('Raw prediction object structure:');
    console.log('log.prediction:', log.prediction);
    console.log('Checking all possible data sources...');
    
    console.log('Nutritional values:', { totalCalories, totalCarbs, glycemicLoad, postMeal });
    
    // Also check if nutritional values are mentioned in AI text
    let textBasedCalories = 0, textBasedCarbs = 0, textBasedGlycemic = 0;
    if (log.prediction?.recommendations) {
      const recText = JSON.stringify(log.prediction.recommendations);
      console.log('AI recommendation text:', recText);
      
      // Look for calorie mentions like "6753 kcal" or "6753 calories"
      const calorieMatch = recText.match(/(\d+)\s*(kcal|calories)/i);
      if (calorieMatch) {
        textBasedCalories = parseInt(calorieMatch[1]);
        console.log('Found calories in AI text:', textBasedCalories);
      }
      
      // Look for carb mentions like "585.6 g" or "585.6g" 
      const carbMatch = recText.match(/carbs?:\s*(\d+(?:\.\d+)?)\s*g/i);
      if (carbMatch) {
        textBasedCarbs = parseFloat(carbMatch[1]);
        console.log('Found carbs in AI text:', textBasedCarbs);
      }
      
      // Look for glycemic load mentions like "286.9"
      const glycemicMatch = recText.match(/glycemic\s+load:?\s*(\d+(?:\.\d+)?)/i);
      if (glycemicMatch) {
        textBasedGlycemic = parseFloat(glycemicMatch[1]);
        console.log('Found glycemic load in AI text:', textBasedGlycemic);
      }
      
      // CRITICAL: Check if AI explicitly says "High risk meal"
      if (recText.toLowerCase().includes('high risk meal') || 
          recText.toLowerCase().includes('high-risk meal') ||
          recText.toLowerCase().includes('unsafe meal') ||
          recText.toLowerCase().includes('dangerous meal')) {
        console.log('🚨 AI EXPLICITLY STATES HIGH RISK - OVERRIDING ALL OTHER LOGIC');
        return 'high';
      }
    }
    
    // Check aggregated_nutrition field specifically
    if (log.prediction?.aggregated_nutrition) {
      const aggNutr = log.prediction.aggregated_nutrition;
      console.log('Found aggregated_nutrition:', aggNutr);
      if (aggNutr.calories) textBasedCalories = Math.max(textBasedCalories, aggNutr.calories);
      if (aggNutr.carbs) textBasedCarbs = Math.max(textBasedCarbs, aggNutr.carbs);
      if (aggNutr.glycemic_load) textBasedGlycemic = Math.max(textBasedGlycemic, aggNutr.glycemic_load);
    }
    
    // Use the highest values found from either structured data or text
    const finalCalories = Math.max(totalCalories, textBasedCalories);
    const finalCarbs = Math.max(totalCarbs, textBasedCarbs);
    const finalGlycemic = Math.max(glycemicLoad, textBasedGlycemic);
    
    console.log('Final nutritional values:', { finalCalories, finalCarbs, finalGlycemic, glycemicLoad, postMeal });
    
    // SAFETY OVERRIDE: Extreme values are ALWAYS high risk (with lower thresholds for safety)
    if (finalCalories > 1500 || finalCarbs > 100 || finalGlycemic > 30 || glycemicLoad > 30 || postMeal > 200) {
      console.log('🚨 SAFETY OVERRIDE: Extreme nutritional values detected - HIGH RISK');
      console.log('Triggered by:', {
        calories: finalCalories > 1500 ? `${finalCalories} > 1500` : null,
        carbs: finalCarbs > 100 ? `${finalCarbs}g > 100g` : null,
        glycemicLoadText: finalGlycemic > 30 ? `${finalGlycemic} > 30` : null,
        glycemicLoadStruct: glycemicLoad > 30 ? `${glycemicLoad} > 30` : null,
        bloodSugar: postMeal > 200 ? `${postMeal} > 200` : null
      });
      return 'high';
    }
    
    // Priority 1: Check AI risk assessment in all possible formats
    let aiRisk = '';
    if (log.riskLevel && log.riskLevel.trim()) {
      aiRisk = log.riskLevel.toLowerCase();
      console.log('Found direct riskLevel:', aiRisk);
    }
    else if (log.prediction?.risk_assessment?.risk_level) {
      aiRisk = log.prediction.risk_assessment.risk_level.toLowerCase();
      console.log('Found prediction.risk_assessment.risk_level:', aiRisk);
    }
    else if (log.prediction?.risk_level) {
      aiRisk = log.prediction.risk_level.toLowerCase();
      console.log('Found prediction.risk_level:', aiRisk);
    }
    else if (log.prediction?.risk) {
      aiRisk = log.prediction.risk.toLowerCase();
      console.log('Found prediction.risk:', aiRisk);
    }
    else if (log.prediction?.recommendations && log.prediction.recommendations[0]?.risk_level) {
      aiRisk = log.prediction.recommendations[0].risk_level.toLowerCase();
      console.log('Found prediction.recommendations[0].risk_level:', aiRisk);
    }
    
    // Check if AI analysis mentions high risk in text
    if (log.prediction?.recommendations) {
      const recText = JSON.stringify(log.prediction.recommendations).toLowerCase();
      if (recText.includes('high risk') || recText.includes('unsafe') || recText.includes('dangerous')) {
        console.log('🚨 AI text analysis indicates HIGH RISK');
        aiRisk = 'high';
      }
    }
    
    // Normalize AI risk levels
    if (aiRisk === 'low-medium') aiRisk = 'medium';
    
    if (aiRisk) {
      console.log('✅ Using AI risk assessment:', aiRisk);
      return aiRisk;
    }
    
    // Priority 2: Blood sugar levels
    if (postMeal > 200) {
      console.log('Blood sugar > 200 - HIGH RISK');
      return 'high';
    } else if (postMeal >= 140) {
      console.log('Blood sugar 140-200 - MEDIUM RISK');
      return 'medium';
    }
    
    // Priority 3: Keyword fallback ONLY if no prediction at all
    if (!log.prediction) {
      const foodLower = mealName.toLowerCase();
      console.log('No AI prediction found, using keyword fallback for:', mealName);
      
      // High risk food keywords
      if (foodLower.includes('sweet') || foodLower.includes('dessert') || 
          foodLower.includes('cake') || foodLower.includes('sugar') || 
          foodLower.includes('ice cream') || foodLower.includes('chocolate') ||
          foodLower.includes('milkshake') || foodLower.includes('cream') ||
          foodLower.includes('pancake') || foodLower.includes('candy') ||
          foodLower.includes('halwa') || foodLower.includes('laddu') ||
          foodLower.includes('jalebi') || foodLower.includes('gulab jamun')) {
        console.log('Keyword assessment: HIGH RISK');
        return 'high';
      }
      // Medium risk food keywords
      else if (foodLower.includes('rice') || foodLower.includes('bread') || 
               foodLower.includes('pasta') || foodLower.includes('fried') || 
               foodLower.includes('potato') || foodLower.includes('noodles') ||
               foodLower.includes('mango')) {
        console.log('Keyword assessment: MEDIUM RISK');
        return 'medium';
      }
    }
    
    // Default: Low risk (but log this decision)
    console.log('Defaulting to LOW RISK');
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
            color: risk === 'high' ? '#ef4444' : risk === 'medium' ? '#f59e0b' : '#10b981'
          };
        });

        console.log('Meal Data Array:', mealDataArray); // Debug log
        
        // Risk summary data with meal details
        const lowRiskLogs = logs.filter(l => getRisk(l) === 'low');
        const mediumRiskLogs = logs.filter(l => getRisk(l) === 'medium');
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
            name: 'Medium Risk', 
            value: mediumRiskLogs.length, 
            count: mediumRiskLogs.length, 
            color: '#f59e0b',
            meals: mediumRiskLogs.map(log => {
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

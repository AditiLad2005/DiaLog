import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ChartBarIcon, 
  PlusIcon,
  CalendarDaysIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  SparklesIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import SafeMealSuggestions from '../components/SafeMealSuggestions';
import BloodSugarLineChart from '../components/LineChart';
import MealRiskDonutChart from '../components/DonutChart';
import MLDataService from '../services/mlData';

import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db, auth } from "../services/firebase";

const Dashboard = () => {
  const [bloodSugarData, setBloodSugarData] = useState(null);
  const [riskData, setRiskData] = useState(null);
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  const [recentLogs, setRecentLogs] = useState([]);

  // Fetch logs from Firebase
  const fetchLogs = async () => {
    const user = auth.currentUser;
    if (!user) return [];
    const q = query(
      collection(db, "logs"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const snap = await getDocs(q);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  // Load ML data + logs on component mount
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        setLoading(true);
        const [trendsResult, riskResult, insightsResult, logs] = await Promise.all([
          MLDataService.getBloodSugarTrends('7days'),
          MLDataService.getMealRiskDistribution(),
          MLDataService.getWeeklyInsights(),
          fetchLogs()
        ]);
        
        setBloodSugarData(trendsResult);
        setRiskData(riskResult);
        setInsights(insightsResult);
        setRecentLogs(logs);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const stats = {
    averageFasting: bloodSugarData?.summary?.avgFasting || 101,
    averagePostMeal: bloodSugarData?.summary?.avgPostMeal || 143,
    totalLogs: recentLogs.length,
    riskyMeals: riskData?.data?.find(item => item.name === 'High Risk')?.count || 0
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              {recentLogs.map((log) => (
                <div
                  key={log.id}
                  className={`
                    p-4 rounded-lg border-2 transition-colors duration-200
                    ${log.riskLevel === 'high' 
                      ? 'border-danger-200 bg-danger-50 dark:border-danger-700 dark:bg-danger-900/20' 
                      : log.riskLevel === 'medium'
                      ? 'border-warning-200 bg-warning-50 dark:border-warning-700 dark:bg-warning-900/20'
                      : 'border-success-200 bg-success-50 dark:border-success-700 dark:bg-success-900/20'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className={`
                        p-2 rounded-full
                        ${log.riskLevel === 'high' ? 'bg-danger-200 dark:bg-danger-800' : 
                          log.riskLevel === 'medium' ? 'bg-warning-200 dark:bg-warning-800' :
                          'bg-success-200 dark:bg-success-800'}
                      `}>
                        {log.riskLevel !== 'low' ? (
                          <ExclamationTriangleIcon className={`h-5 w-5 ${
                            log.riskLevel === 'high' ? 'text-danger-600 dark:text-danger-400' : 'text-warning-600 dark:text-warning-400'
                          }`} />
                        ) : (
                          <CheckCircleIcon className="h-5 w-5 text-success-600 dark:text-success-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-white">{log.meal}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{log.date} • {log.time}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex space-x-4 text-sm">
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Fasting</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{log.fastingSugar} mg/dL</p>
                        </div>
                        <div>
                          <p className="text-gray-600 dark:text-gray-400">Post-Meal</p>
                          <p className="font-semibold text-gray-900 dark:text-white">{log.postMealSugar} mg/dL</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                    <p className="text-sm text-gray-600 dark:text-gray-400">Record your meal and get AI insights</p>
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

              <button className="w-full p-4 bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-700 rounded-lg hover:bg-success-100 dark:hover:bg-success-900/30 transition-colors duration-200">
                <div className="flex items-center space-x-3">
                  <SparklesIcon className="h-6 w-6 text-success-600 dark:text-success-400" />
                  <div className="text-left">
                    <h3 className="font-medium text-gray-900 dark:text-white">Get Meal Recommendations</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">AI-powered food suggestions</p>
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
              data={riskData?.data} 
              title="Meal Risk Analysis"
            />
          </div>

          {/* ML Insights */}
          {insights && (
            <div className="mt-6 bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft border border-neutral-100 dark:border-neutral-700">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-primary-600 dark:text-primary-400" />
                AI Insights from Model Training
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

        {/* AI Meal Recommendations */}
        <SafeMealSuggestions className="mb-8" />

        {/* Coming Soon Section */}
        <div className="bg-primary-600 rounded-xl p-6 text-white text-center">
          <h3 className="text-xl font-semibold mb-2">More Features Coming Soon!</h3>
          <p className="text-primary-100">
            Advanced analytics, detailed health reports, integration with wearable devices, and personalized meal planning are on the way.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

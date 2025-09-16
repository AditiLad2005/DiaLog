import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const BloodSugarLineChart = ({ data, title = "Blood Sugar Trends" }) => {
  // Sample data if none provided
  const defaultData = [
    { date: '2025-08-15', fasting: 95, postMeal: 135, time: 'Day 1' },
    { date: '2025-08-16', fasting: 88, postMeal: 142, time: 'Day 2' },
    { date: '2025-08-17', fasting: 92, postMeal: 138, time: 'Day 3' },
    { date: '2025-08-18', fasting: 98, postMeal: 145, time: 'Day 4' },
    { date: '2025-08-19', fasting: 85, postMeal: 132, time: 'Day 5' },
    { date: '2025-08-20', fasting: 110, postMeal: 165, time: 'Day 6' },
    { date: '2025-08-21', fasting: 95, postMeal: 135, time: 'Day 7' },
  ];

  const chartData = data || defaultData;

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
          <p className="text-gray-900 dark:text-white font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }} className="text-sm">
              {entry.name}: {entry.value} mg/dL
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-neutral-100 dark:border-neutral-700">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
            <XAxis 
              dataKey="time" 
              className="text-xs text-gray-600 dark:text-gray-400"
            />
            <YAxis 
              className="text-xs text-gray-600 dark:text-gray-400"
              domain={[70, 200]}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="fasting" 
              stroke="#10b981" 
              strokeWidth={3}
              dot={{ fill: '#10b981', strokeWidth: 2, r: 5 }}
              name="Fasting Blood Sugar"
              activeDot={{ r: 7, stroke: '#10b981', strokeWidth: 2 }}
            />
            <Line 
              type="monotone" 
              dataKey="postMeal" 
              stroke="#f59e0b" 
              strokeWidth={3}
              dot={{ fill: '#f59e0b', strokeWidth: 2, r: 5 }}
              name="Post-Meal Blood Sugar"
              activeDot={{ r: 7, stroke: '#f59e0b', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Reference ranges */}
      <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
        <div className="flex justify-between">
          <span>Target Ranges:</span>
        </div>
        <div className="flex justify-between mt-1">
          <span>• Fasting: 80-130 mg/dL</span>
          <span>• Post-meal: &lt;180 mg/dL</span>
        </div>
      </div>
    </div>
  );
};

export default BloodSugarLineChart;

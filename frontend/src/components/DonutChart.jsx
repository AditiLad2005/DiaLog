import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MealRiskDonutChart = ({ data, title = "Meal Risk Distribution" }) => {
  // Sample data if none provided
  const defaultData = [
    { name: 'Low Risk', value: 65, count: 13 },
    { name: 'Medium Risk', value: 25, count: 5 },
    { name: 'High Risk', value: 10, count: 2 }
  ];

  const chartData = data || defaultData;

  // Colors for different risk levels
  const COLORS = {
    'Low Risk': '#10b981',      // green
    'Medium Risk': '#f59e0b',   // amber
    'High Risk': '#ef4444'      // red
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
          <p className="text-gray-900 dark:text-white font-medium">{data.name}</p>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {data.count} meals ({data.value}%)
          </p>
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-sm font-medium"
      >
        {percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
      </text>
    );
  };

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-6 shadow-soft hover:shadow-medium transition-all duration-300 border border-neutral-100 dark:border-neutral-700">
      <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-4">
        {title}
      </h3>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={CustomLabel}
              outerRadius={100}
              innerRadius={40}
              fill="#8884d8"
              dataKey="value"
              paddingAngle={2}
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[entry.name]} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            <Legend 
              verticalAlign="bottom" 
              height={36}
              formatter={(value, entry) => (
                <span style={{ color: entry.color }} className="text-sm">
                  {value}
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      <div className="mt-4 grid grid-cols-3 gap-4 text-center">
        {chartData.map((item, index) => (
          <div key={index} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div 
              className="w-3 h-3 rounded-full mx-auto mb-1"
              style={{ backgroundColor: COLORS[item.name] }}
            ></div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{item.name}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              {item.count} meals
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MealRiskDonutChart;

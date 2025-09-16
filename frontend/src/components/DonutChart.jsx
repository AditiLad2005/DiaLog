import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const MealRiskDonutChart = ({ data, title = "Recent Meals Analysis", showMealNames = false }) => {
  // Sample data if none provided
  const defaultData = [
    { name: 'Low Risk', value: 65, count: 13, color: '#10b981' },
    { name: 'Medium Risk', value: 25, count: 5, color: '#f59e0b' },
    { name: 'High Risk', value: 10, count: 2, color: '#ef4444' }
  ];

  const chartData = data && data.length > 0 ? data : defaultData;

  console.log('DonutChart received data:', data); // Debug log
  console.log('Using chartData:', chartData); // Debug log

  // Get risk-based color
  const getRiskColor = (risk) => {
    const riskLower = risk?.toLowerCase() || 'unknown';
    if (riskLower === 'high') return '#ef4444';
    if (riskLower === 'medium') return '#f59e0b';
    if (riskLower === 'low') return '#10b981';
    return '#6b7280'; // gray for unknown
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600">
          <p className="text-gray-900 dark:text-white font-medium">{data.name}</p>
          {showMealNames && data.risk && (
            <p className="text-sm text-gray-600 dark:text-gray-400 capitalize">
              {data.risk} Risk
            </p>
          )}
          {data.postMeal && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Post-meal: {data.postMeal} mg/dL
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    // Only show label if segment is large enough
    if (percent < 0.08) return null;

    // Truncate long meal names
    const displayName = showMealNames && name ? 
      (name.length > 10 ? name.substring(0, 10) + '...' : name) : 
      `${(percent * 100).toFixed(0)}%`;

    return (
      <text 
        x={x} 
        y={y} 
        fill="white" 
        textAnchor={x > cx ? 'start' : 'end'} 
        dominantBaseline="central"
        className="text-xs font-medium"
      >
        {displayName}
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
                <Cell key={`cell-${index}`} fill={entry.color || getRiskColor(entry.risk)} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
            {!showMealNames && (
              <Legend 
                verticalAlign="bottom" 
                height={36}
                formatter={(value, entry) => (
                  <span style={{ color: entry.color }} className="text-sm">
                    {value}
                  </span>
                )}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>
      
      {/* Summary stats */}
      {!showMealNames ? (
        <div className="mt-4 grid grid-cols-3 gap-4 text-center">
          {chartData.map((item, index) => (
            <div key={index} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
              <div 
                className="w-3 h-3 rounded-full mx-auto mb-1"
                style={{ backgroundColor: item.color || getRiskColor(item.risk) }}
              ></div>
              <p className="text-xs text-gray-600 dark:text-gray-400">{item.name}</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">
                {item.count} meals
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 max-h-32 overflow-y-auto">
          <div className="space-y-2">
            {chartData.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 dark:bg-gray-700">
                <div className="flex items-center space-x-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color || getRiskColor(item.risk) }}
                  ></div>
                  <span className="text-sm text-gray-900 dark:text-white truncate max-w-32">
                    {item.name}
                  </span>
                </div>
                <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                  {item.risk || 'Unknown'} Risk
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default MealRiskDonutChart;

import React from 'react';
import { 
  HeartIcon,
  BoltIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

const HealthPlanModal = ({ meal, isOpen, onClose, riskLevel = 'low' }) => {
  if (!isOpen) return null;

  // Risk-based health plan recommendations 
  const getHealthPlan = (risk) => {
    if (risk === 'high') {
      return {
        immediate: [
          "URGENT: Take a 20-25 minute brisk walk immediately to counter potential sugar spike",
          "Drink 2-3 glasses of water to help flush excess glucose",
          "Check blood sugar in 1 hour - expect significant elevation",
          "Practice deep breathing exercises to reduce stress-induced glucose spikes",
          "Avoid any additional food for the next 3-4 hours"
        ],
        shortTerm: [
          "Take prescribed diabetes medication if recommended by your doctor",
          "Monitor for symptoms: excessive thirst, frequent urination, fatigue",
          "Do light stretching or yoga after 2 hours",
          "Plan a protein-rich, low-carb meal for your next eating time",
          "Stay extra hydrated throughout the rest of the day"
        ],
        longTerm: [
          "CRITICAL: Discuss this meal choice with your healthcare provider",
          "Learn about portion control and safer food alternatives",
          "Consider working with a diabetes educator for meal planning",
          "Track patterns to identify your personal trigger foods",
          "Work on stress management techniques to improve glucose response"
        ],
        monitoring: [
          "Check blood sugar every hour for the next 4 hours",
          "Watch for emergency symptoms: confusion, rapid heartbeat, dizziness",
          "Log this meal's impact for discussion with your healthcare team"
        ]
      };
    } else if (risk === 'medium') {
      return {
        immediate: [
          "Take a 10-15 minute pleasant walk to help with glucose management",
          "Drink a glass of water to stay well hydrated",
          "Relax and avoid stressful activities for the next 30 minutes",
          "Consider having a small portion of nuts if you feel hungry later"
        ],
        shortTerm: [
          "Light exercise like stretching after 1 hour is beneficial",
          "Monitor how you feel in 2 hours - note your energy levels",
          "Choose protein-rich snacks if you need something later",
          "Ensure good sleep tonight as food choices can affect sleep quality"
        ],
        longTerm: [
          "Track patterns with similar meals to understand your body's response",
          "Consider smaller portions or different preparation methods next time",
          "Always pair carbohydrates with vegetables and protein for better control",
          "Regular exercise helps improve your body's carbohydrate tolerance"
        ],
        monitoring: [
          "Check blood sugar in 1.5-2 hours (expect mild to moderate elevation)",
          "Note energy patterns and hunger levels throughout the day"
        ]
      };
    } else {
      return {
        immediate: [
          "Great choice! A gentle 5-10 minute walk will enhance the benefits",
          "Stay hydrated and enjoy the sustained energy this meal provides",
          "Continue with your normal activities - no restrictions needed"
        ],
        shortTerm: [
          "Any type of exercise is fine after 30 minutes",
          "This meal should keep you satisfied for several hours",
          "Use this as a template for future healthy meal planning"
        ],
        longTerm: [
          "Keep making excellent choices like this for optimal health",
          "Build on this success by exploring similar healthy meal options",
          "Track how these positive choices make you feel overall"
        ],
        monitoring: [
          "Expect stable blood sugar levels with sustained energy",
          "Notice how satisfied and energetic you feel compared to other meals"
        ]
      };
    }
  };

  const healthPlan = getHealthPlan(riskLevel);

  // Get risk-specific general tips
  const getGeneralTips = (risk) => {
    if (risk === 'high') {
      return [
        "⚠️ This meal carries significant risk for blood sugar spikes",
        "🩺 Check blood sugar frequently until levels stabilize",
        "💊 Keep fast-acting glucose tablets handy for emergencies", 
        "📞 Contact your doctor if symptoms worsen or persist",
        "🚫 Avoid similar high-risk foods until you improve control",
        "💧 Stay extra hydrated and avoid alcohol today"
      ];
    } else if (risk === 'medium') {
      return [
        "⚠️ This meal requires moderate caution and monitoring",
        "📊 Monitor blood sugar 2 hours after eating",
        "💧 Stay hydrated and maintain regular meal timing",
        "🥗 Balance future meals with more vegetables and protein",
        "📝 Track patterns to identify your personal triggers",
        "🚶‍♂️ Light exercise helps improve glucose metabolism"
      ];
    } else {
      return [
        "✅ Excellent choice! This supports your health goals",
        "🎯 Keep making healthy choices like this one",
        "💧 Stay hydrated throughout the day",
        "📋 Use this meal as a template for future planning",
        "💪 You're on the right track for optimal diabetes management"
      ];
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      default: return 'text-green-600 bg-green-50 border-green-200';
    }
  };

  const getRiskIcon = (risk) => {
    switch (risk) {
      case 'high': return ExclamationTriangleIcon;
      case 'medium': return InformationCircleIcon;
      default: return CheckCircleIcon;
    }
  };

  const RiskIcon = getRiskIcon(riskLevel);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`p-2 rounded-full border ${getRiskColor(riskLevel)}`}>
                <RiskIcon className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Health Plan
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Risk Level: <span className={`font-medium capitalize ${riskLevel === 'high' ? 'text-red-600' : riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'}`}>{riskLevel}</span>
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl font-semibold"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Immediate Actions */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <BoltIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="font-semibold text-blue-900 dark:text-blue-200">Immediate Actions (Next 30 minutes)</h3>
            </div>
            <ul className="space-y-2">
              {healthPlan.immediate.map((action, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm text-blue-800 dark:text-blue-300">
                  <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Short-term Actions */}
          <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <ClockIcon className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              <h3 className="font-semibold text-purple-900 dark:text-purple-200">Short-term Actions (Next 2-4 hours)</h3>
            </div>
            <ul className="space-y-2">
              {healthPlan.shortTerm.map((action, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm text-purple-800 dark:text-purple-300">
                  <div className="w-2 h-2 bg-purple-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Long-term Actions */}
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
            <div className="flex items-center space-x-2 mb-3">
              <HeartIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
              <h3 className="font-semibold text-green-900 dark:text-green-200">Long-term Strategy</h3>
            </div>
            <ul className="space-y-2">
              {healthPlan.longTerm.map((action, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-sm text-green-800 dark:text-green-300">
                  <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                  <span>{action}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Monitoring */}
          {healthPlan.monitoring.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <InformationCircleIcon className="h-5 w-5 text-gray-600 dark:text-gray-400" />
                <h3 className="font-semibold text-gray-900 dark:text-gray-200">Monitoring Points</h3>
              </div>
              <ul className="space-y-2">
                {healthPlan.monitoring.map((point, idx) => (
                  <li key={idx} className="flex items-start space-x-2 text-sm text-gray-700 dark:text-gray-300">
                    <div className="w-2 h-2 bg-gray-500 rounded-full mt-2 flex-shrink-0"></div>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* General Tips */}
          <div className={`rounded-lg p-4 border ${
            riskLevel === 'high' 
              ? 'bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20 border-red-200 dark:border-red-700'
              : riskLevel === 'medium'
              ? 'bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 border-yellow-200 dark:border-yellow-700'
              : 'bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-900/20 dark:to-blue-900/20 border-green-200 dark:border-green-700'
          }`}>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              {riskLevel === 'high' ? 'Critical Reminders' : riskLevel === 'medium' ? 'Important Tips' : 'Keep It Up!'}
            </h3>
            <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
              {getGeneralTips(riskLevel).map((tip, idx) => (
                <p key={idx}>{tip}</p>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-gray-50 dark:bg-gray-700 rounded-b-xl">
          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              This is general guidance. Always follow your doctor's specific recommendations.
            </p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors duration-200"
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HealthPlanModal;
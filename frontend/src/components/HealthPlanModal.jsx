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

  // Health plan recommendations based on food type and risk level
  const getHealthPlan = (mealName, risk) => {
    const foodLower = mealName?.toLowerCase() || '';
    
    let recommendations = {
      immediate: [],
      shortTerm: [],
      longTerm: [],
      monitoring: []
    };

    // Determine food category
    const isHighCarb = foodLower.includes('rice') || foodLower.includes('bread') || foodLower.includes('roti') || 
                      foodLower.includes('pasta') || foodLower.includes('noodles') || foodLower.includes('potato');
    const isSweet = foodLower.includes('sweet') || foodLower.includes('sugar') || foodLower.includes('dessert') || 
                   foodLower.includes('cake') || foodLower.includes('ice cream') || foodLower.includes('chocolate');
    const isProtein = foodLower.includes('dal') || foodLower.includes('lentil') || foodLower.includes('chicken') || 
                     foodLower.includes('fish') || foodLower.includes('egg') || foodLower.includes('paneer');
    const isVegetable = foodLower.includes('vegetable') || foodLower.includes('salad') || foodLower.includes('spinach') ||
                       foodLower.includes('broccoli') || foodLower.includes('cabbage') || foodLower.includes('carrot');
    const isFried = foodLower.includes('fried') || foodLower.includes('pakora') || foodLower.includes('samosa') ||
                   foodLower.includes('chips') || foodLower.includes('fries');

    // HIGH RISK FOODS - Urgent intervention needed
    if (risk === 'high') {
      if (isSweet) {
        recommendations.immediate = [
          "URGENT: Take a 20-25 minute brisk walk immediately to counter sugar spike",
          "Drink 2-3 glasses of water to help flush excess glucose",
          "Check blood sugar in 1 hour - it may spike significantly",
          "Take deep breaths and avoid stress - stress worsens sugar spikes"
        ];
        recommendations.shortTerm = [
          "Avoid any more sweets or carbs for next 4-6 hours",
          "Take prescribed diabetes medication if recommended by doctor",
          "Do light stretching or yoga after 2 hours",
          "Monitor for symptoms: excessive thirst, frequent urination, fatigue"
        ];
        recommendations.longTerm = [
          "CRITICAL: Discuss sweet consumption with your healthcare provider",
          "Learn about diabetes-friendly dessert alternatives",
          "Consider portion control strategies for future occasions",
          "Work on stress management techniques to improve glucose response"
        ];
        recommendations.monitoring = [
          "Check blood sugar every hour for next 4 hours",
          "Watch for warning signs: dizziness, excessive thirst, blurred vision"
        ];
      } else if (isHighCarb) {
        recommendations.immediate = [
          "Take a 15-20 minute walk to help muscles absorb glucose",
          "Drink water slowly - avoid large amounts at once",
          "Practice breathing exercises to reduce cortisol impact",
          "Consider taking fiber supplement if approved by doctor"
        ];
        recommendations.shortTerm = [
          "Avoid additional carbohydrates for next 4 hours",
          "Light resistance exercises after 90 minutes can help",
          "Monitor energy levels - high carbs can cause crashes",
          "Plan protein-rich snack in 3-4 hours if needed"
        ];
        recommendations.longTerm = [
          "Learn carb counting and portion control for rice/bread",
          "Switch to whole grain alternatives gradually",
          "Always pair carbs with vegetables and protein",
          "Track blood sugar patterns with different carb amounts"
        ];
        recommendations.monitoring = [
          "Blood sugar check in 1-2 hours (expect 180+ mg/dl spike)",
          "Note how you feel at 2-3 hour mark for pattern tracking"
        ];
      } else if (isFried) {
        recommendations.immediate = [
          "Take a 20-minute walk - fried foods slow glucose absorption",
          "Sip warm water slowly to aid digestion",
          "Avoid lying down for next 2 hours",
          "Take antacid if you experience bloating or discomfort"
        ];
        recommendations.shortTerm = [
          "No more fried or fatty foods today",
          "Light exercise after 2 hours when digestion settles",
          "Choose steamed or grilled foods for remaining meals",
          "Increase water intake to help liver process fats"
        ];
        recommendations.longTerm = [
          "Limit fried foods to once per week maximum",
          "Learn healthier cooking methods: grilling, steaming, baking",
          "Understand how fats affect your blood sugar timing",
          "Plan balanced meals with minimal processed foods"
        ];
        recommendations.monitoring = [
          "Blood sugar may spike later (2-3 hours) due to fat content",
          "Watch for digestive discomfort or acid reflux"
        ];
      }
    }
    
    // MEDIUM RISK FOODS - Moderate precautions
    else if (risk === 'medium') {
      if (isHighCarb) {
        recommendations.immediate = [
          "Take a 10-15 minute pleasant walk to help glucose uptake",
          "Drink a glass of water to stay hydrated",
          "Relax for 30 minutes - avoid stressful activities",
          "Consider having some nuts or seeds to slow absorption"
        ];
        recommendations.shortTerm = [
          "Light exercise like stretching after 1 hour is beneficial",
          "Monitor how you feel in 2 hours - note energy levels",
          "Choose protein-rich snacks if hungry later",
          "Ensure good sleep tonight - carbs can affect sleep quality"
        ];
        recommendations.longTerm = [
          "Track patterns with this amount of carbohydrates",
          "Experiment with smaller portions next time",
          "Always pair carbs with vegetables for better control",
          "Regular exercise helps improve carbohydrate tolerance"
        ];
        recommendations.monitoring = [
          "Check blood sugar in 1.5-2 hours (expect mild elevation)",
          "Note energy patterns throughout the day"
        ];
      } else if (isProtein) {
        recommendations.immediate = [
          "Great choice! A gentle 10-minute walk will optimize protein use",
          "Stay hydrated - protein requires water for metabolism",
          "You can continue normal activities",
          "This should provide steady energy for hours"
        ];
        recommendations.shortTerm = [
          "Any exercise is fine after 30 minutes",
          "Protein will keep you satisfied - avoid unnecessary snacking",
          "This meal supports muscle health and blood sugar stability",
          "Plan similar protein-rich meals for consistent control"
        ];
        recommendations.longTerm = [
          "Maintain this protein intake pattern",
          "Learn about different protein sources to avoid boredom",
          "Combine proteins with vegetables for optimal nutrition",
          "Use this as a template for future meal planning"
        ];
        recommendations.monitoring = [
          "Minimal blood sugar impact expected from protein",
          "Notice sustained energy levels compared to carb-heavy meals"
        ];
      } else if (isFried) {
        recommendations.immediate = [
          "Take a 15-minute walk to aid digestion",
          "Sip water slowly over next hour",
          "Consider digestive enzymes if recommended by doctor",
          "Avoid heavy lifting or intense activity for 2 hours"
        ];
        recommendations.shortTerm = [
          "Choose lighter, steamed foods for next meal",
          "Light movement after 1.5 hours helps digestion",
          "Monitor for any digestive discomfort",
          "Plan extra vegetables for dinner to balance"
        ];
        recommendations.longTerm = [
          "Limit fried foods to occasional treats",
          "Learn air-frying or oven-baking alternatives",
          "Balance indulgent meals with extra healthy choices",
          "Track how fried foods affect your overall blood sugar patterns"
        ];
        recommendations.monitoring = [
          "Blood sugar may be delayed - check in 2-3 hours",
          "Note any digestive effects for future reference"
        ];
      }
    }
    
    // LOW RISK FOODS - Keep it short and encouraging
    else { // low risk
      if (isVegetable) {
        recommendations.immediate = [
          "Great choice! A pleasant 5-minute walk is perfect",
          "Stay hydrated and enjoy the energy"
        ];
        recommendations.shortTerm = [
          "Continue normal activities - no restrictions",
          "This supports your health goals perfectly"
        ];
        recommendations.longTerm = [
          "Keep making choices like this",
          "Vegetables are your best friend for diabetes control"
        ];
        recommendations.monitoring = [
          "Minimal blood sugar impact expected"
        ];
      } else if (isProtein) {
        recommendations.immediate = [
          "Excellent protein choice! Light walk if desired",
          "This will provide sustained energy"
        ];
        recommendations.shortTerm = [
          "Any activity is fine after 30 minutes",
          "This keeps you satisfied for hours"
        ];
        recommendations.longTerm = [
          "Use this as your meal template",
          "Protein supports stable blood sugar"
        ];
        recommendations.monitoring = [
          "Expect stable levels with sustained energy"
        ];
      } else {
        recommendations.immediate = [
          "Good choice! Light walk enhances benefits",
          "Continue normal activities"
        ];
        recommendations.shortTerm = [
          "No special precautions needed",
          "Monitor how satisfied you feel"
        ];
        recommendations.longTerm = [
          "Build on this success",
          "Track positive health patterns"
        ];
        recommendations.monitoring = [
          "Stable blood sugar expected"
        ];
      }
    }

    return recommendations;
  };

  const healthPlan = getHealthPlan(meal?.mealName, riskLevel);

  // Get risk-specific general tips
  const getGeneralTips = (risk) => {
    if (risk === 'high') {
      return [
        "• Check blood sugar frequently until levels stabilize",
        "• Keep fast-acting glucose tablets handy for emergencies", 
        "• Contact your doctor if symptoms worsen or persist",
        "• Avoid similar high-risk foods until you improve control",
        "• Stay extra hydrated and avoid alcohol today"
      ];
    } else if (risk === 'medium') {
      return [
        "• Monitor blood sugar 2 hours after eating",
        "• Stay hydrated and maintain regular meal timing",
        "• Balance future meals with more vegetables and protein",
        "• Track patterns to identify your personal triggers",
        "• Light exercise helps improve glucose metabolism"
      ];
    } else {
      return [
        "• Keep making healthy choices like this",
        "• Stay hydrated throughout the day",
        "• Use this meal as a template for future planning"
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
                  Health Plan for {meal?.mealName || 'Your Meal'}
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
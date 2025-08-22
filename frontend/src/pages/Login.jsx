import React, { useState } from 'react';
import { 
  UserIcon, 
  EnvelopeIcon, 
  CalendarDaysIcon,
  ScaleIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const RegisterProfile = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    gender: '',
    height: '',
    weight: '',
    heightUnit: 'cm',
    weightUnit: 'kg'
  });

  const [bmi, setBmi] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Calculate BMI whenever height or weight changes
  React.useEffect(() => {
    const { height, weight, heightUnit, weightUnit } = formData;
    
    if (height && weight) {
      let heightInM = parseFloat(height);
      let weightInKg = parseFloat(weight);

      // Convert height to meters
      if (heightUnit === 'cm') {
        heightInM = heightInM / 100;
      } else if (heightUnit === 'ft') {
        heightInM = heightInM * 0.3048;
      }

      // Convert weight to kg
      if (weightUnit === 'lbs') {
        weightInKg = weightInKg * 0.453592;
      }

      const calculatedBmi = weightInKg / (heightInM * heightInM);
      setBmi(calculatedBmi.toFixed(1));
    } else {
      setBmi(null);
    }
  }, [formData.height, formData.weight, formData.heightUnit, formData.weightUnit]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getBmiCategory = (bmiValue) => {
    if (bmiValue < 18.5) return { category: 'Underweight', color: 'text-blue-600 bg-blue-100' };
    if (bmiValue < 25) return { category: 'Normal', color: 'text-green-600 bg-green-100' };
    if (bmiValue < 30) return { category: 'Overweight', color: 'text-yellow-600 bg-yellow-100' };
    return { category: 'Obese', color: 'text-red-600 bg-red-100' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    console.log('Profile data:', { ...formData, bmi });
    setIsLoading(false);
    
    // In a real app, you'd handle the response and redirect
    alert('Profile saved successfully!');
  };

  const isFormValid = formData.name && formData.email && formData.age && formData.gender && formData.height && formData.weight;

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Complete Your Profile
          </h1>
          <p className="text-lg text-gray-600">
            Help us personalize your diabetes management experience
          </p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-2xl shadow-soft p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Personal Information
              </h2>

              {/* Name */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <UserIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="Enter your full name"
                    required
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <EnvelopeIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    placeholder="Enter your email address"
                    required
                  />
                </div>
              </div>

              {/* Age and Gender */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-2">
                    Age
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CalendarDaysIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="age"
                      name="age"
                      value={formData.age}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="Age"
                      min="1"
                      max="120"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-2">
                    Gender
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="block w-full px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                    required
                  >
                    <option value="">Select gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Physical Measurements */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-gray-900 border-b border-gray-200 pb-2">
                Physical Measurements
              </h2>

              {/* Height */}
              <div>
                <label htmlFor="height" className="block text-sm font-medium text-gray-700 mb-2">
                  Height
                </label>
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ScaleIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="height"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="Height"
                      step="0.1"
                      required
                    />
                  </div>
                  <select
                    name="heightUnit"
                    value={formData.heightUnit}
                    onChange={handleInputChange}
                    className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  >
                    <option value="cm">cm</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
              </div>

              {/* Weight */}
              <div>
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700 mb-2">
                  Weight
                </label>
                <div className="flex space-x-3">
                  <div className="flex-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <ScaleIcon className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      id="weight"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                      placeholder="Weight"
                      step="0.1"
                      required
                    />
                  </div>
                  <select
                    name="weightUnit"
                    value={formData.weightUnit}
                    onChange={handleInputChange}
                    className="px-3 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-colors duration-200"
                  >
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                  </select>
                </div>
              </div>

              {/* BMI Display */}
              {bmi && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">BMI (Auto-calculated)</span>
                    <div className="flex items-center space-x-3">
                      <span className="text-2xl font-bold text-gray-900">{bmi}</span>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getBmiCategory(parseFloat(bmi)).color}`}>
                        {getBmiCategory(parseFloat(bmi)).category}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className={`
                  w-full flex items-center justify-center px-8 py-4 text-lg font-semibold rounded-xl 
                  transition-all duration-200 transform
                  ${isFormValid && !isLoading
                    ? 'bg-primary-600 text-white hover:bg-primary-700 hover:-translate-y-1 shadow-medium hover:shadow-strong'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-6 w-6 mr-3 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-6 w-6 mr-3" />
                    Save Profile
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default RegisterProfile;

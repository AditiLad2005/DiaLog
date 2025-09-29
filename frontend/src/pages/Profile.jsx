import React, { useState } from 'react';
import { useTranslationContext, INDIAN_LANGUAGES } from '../contexts/TranslationContext';
import { auth } from '../services/firebase';
import { saveUserProfile, fetchUserProfile } from '../services/firebase';
import { 
  UserIcon, 
  ScaleIcon,
  ArrowPathIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

const Profile = () => {
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
  const [isEditing, setIsEditing] = useState(false);
  const { language, setLanguage } = useTranslationContext();
  // Fetch profile data on mount
  React.useEffect(() => {
    const fetchProfile = async () => {
      const user = auth.currentUser;
      if (user) {
        let profile = await fetchUserProfile(user.uid);
        if (profile) {
          setFormData({
            ...profile,
            email: user.email || profile.email || ''
          });
          // Use saved language if present
          if (profile?.preferredLanguage) {
            try { setLanguage(profile.preferredLanguage); } catch {}
          }
        } else {
          setFormData(prev => ({
            ...prev,
            email: user.email || ''
          }));
        }
      }
    };
    fetchProfile();
  }, []);

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
  }, [formData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const getBmiCategory = (bmiValue) => {
    if (bmiValue < 18.5) return { category: 'Underweight', color: 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/30' };
    if (bmiValue < 25) return { category: 'Normal', color: 'text-success-600 bg-success-100 dark:text-success-400 dark:bg-success-900/30' };
    if (bmiValue < 30) return { category: 'Overweight', color: 'text-warning-600 bg-warning-100 dark:text-warning-400 dark:bg-warning-900/30' };
    return { category: 'Obese', color: 'text-danger-600 bg-danger-100 dark:text-danger-400 dark:bg-danger-900/30' };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        alert('You must be logged in to save your profile.');
        setIsLoading(false);
        return;
      }
      await saveUserProfile(user.uid, { ...formData, bmi, preferredLanguage: language });
      try { localStorage.setItem('preferredLanguage', language); } catch {}
      alert('Profile saved successfully!');
    } catch (error) {
      alert('Error saving profile: ' + error.message);
    }
    setIsLoading(false);
  };

  const isFormValid = formData.name && formData.email && formData.age && formData.gender;

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 py-12 transition-all duration-300">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-primary-700 dark:text-primary-400 mb-4">
            Your Health Profile
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-300">
            Help us personalize your diabetes management experience
          </p>
        </div>

        {/* Form */}
        <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl shadow-soft border border-neutral-100 dark:border-neutral-700 p-8 transition-all duration-300">
          <form onSubmit={handleSubmit} className="space-y-8">
            
            {/* Personal Information */}
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-600 pb-2 flex items-center">
                <UserIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
                Personal Information
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your full name"
                    required
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    required
                    disabled
                  />
                </div>

                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Preferred Language
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    disabled={!isEditing}
                  >
                    {INDIAN_LANGUAGES.map(l => (
                      <option key={l.code} value={l.code}>{l.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Age *
                  </label>
                  <input
                    type="number"
                    id="age"
                    name="age"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    placeholder="Your age"
                    min="1"
                    max="120"
                    required
                    disabled={!isEditing}
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                    required
                    disabled={!isEditing}
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
              <h2 className="text-xl font-semibold text-neutral-900 dark:text-white border-b border-neutral-200 dark:border-neutral-600 pb-2 flex items-center">
                <ScaleIcon className="h-6 w-6 mr-2 text-primary-600 dark:text-primary-400" />
                Physical Measurements
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Height *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      name="height"
                      value={formData.height}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="Height"
                      required
                      disabled={!isEditing}
                    />
                    <select
                      name="heightUnit"
                      value={formData.heightUnit}
                      onChange={handleInputChange}
                      className="px-3 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      disabled={!isEditing}
                    >
                      <option value="cm">cm</option>
                      <option value="ft">ft</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300 mb-2">
                    Weight *
                  </label>
                  <div className="flex space-x-2">
                    <input
                      type="number"
                      name="weight"
                      value={formData.weight}
                      onChange={handleInputChange}
                      className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      placeholder="Weight"
                      required
                      disabled={!isEditing}
                    />
                    <select
                      name="weightUnit"
                      value={formData.weightUnit}
                      onChange={handleInputChange}
                      className="px-3 py-3 rounded-xl border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-gray-700 text-neutral-900 dark:text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                      disabled={!isEditing}
                    >
                      <option value="kg">kg</option>
                      <option value="lbs">lbs</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* BMI Display */}
              {bmi && (
                <div className="mt-4 p-4 bg-primary-50 dark:bg-primary-900/20 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">Your BMI</p>
                      <p className="text-2xl font-bold text-neutral-900 dark:text-white">{bmi}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-medium ${getBmiCategory(parseFloat(bmi)).color}`}>
                      {getBmiCategory(parseFloat(bmi)).category}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Health Information */}
            {/* Submit Button */}
            <div className="pt-6">
              <button
                type="submit"
                disabled={!isFormValid || isLoading || !isEditing}
                className={`
                  w-full flex items-center justify-center px-6 py-4 rounded-xl font-semibold text-lg transition-all duration-200
                  ${isFormValid && !isLoading && isEditing
                    ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-medium hover:shadow-strong transform hover:-translate-y-1'
                    : 'bg-neutral-300 dark:bg-neutral-700 text-neutral-500 dark:text-neutral-400 cursor-not-allowed'
                  }
                `}
              >
                {isLoading ? (
                  <>
                    <ArrowPathIcon className="h-5 w-5 mr-2 animate-spin" />
                    Saving Profile...
                  </>
                ) : (
                  <>
                    <CheckIcon className="h-5 w-5 mr-2" />
                    Save Profile
                  </>
                )}
              </button>
              <button
                type="button"
                className="mt-4 w-full flex items-center justify-center px-6 py-3 rounded-xl font-semibold text-base bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 hover:bg-primary-200 dark:hover:bg-primary-900/40 transition-all duration-200"
                onClick={() => setIsEditing((prev) => !prev)}
              >
                {isEditing ? 'Cancel' : 'Edit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Profile;

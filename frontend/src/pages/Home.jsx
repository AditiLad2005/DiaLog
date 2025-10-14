import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../services/firebase';
import { TranslatedText as T } from '../components/TranslatedText';
import { 
  ChartBarIcon, 
  HeartIcon, 
  ClipboardDocumentListIcon,
  UserCircleIcon,
  ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';

const Home = () => {
  const features = [
    {
      icon: ClipboardDocumentListIcon,
      title: "Smart Meal Logging",
      description: "Easily log your meals with detailed nutritional information and get instant feedback on their impact on your blood sugar levels.",
      color: "text-primary-600 bg-primary-100 dark:from-primary-900/30 dark:to-primary-800/30"
    },
    {
      icon: ChartBarIcon,
      title: "Visual Analytics",
      description: "Track your progress with beautiful charts and graphs that help you understand patterns in your glucose levels over time.",
      color: "text-success-600 bg-success-100 dark:from-success-900/30 dark:to-success-800/30"
    },
    {
      icon: HeartIcon,
      title: "Health Insights",
      description: "Get personalized recommendations and insights to help you make better dietary choices for optimal diabetes management.",
      color: "text-secondary-600 bg-secondary-100 dark:from-secondary-900/30 dark:to-secondary-800/30"
    }
  ];

  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      // Do not auto-redirect; always show landing page first
    });
    return () => unsubscribe();
  }, []);

  const handleProfileClick = (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/profile');
    }
  };

  const handleLogClick = (e) => {
    e.preventDefault();
    if (!user) {
      navigate('/auth');
    } else {
      navigate('/meal-log');
    }
  };

  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 transition-all duration-300">
      {/* Hero Section */}
      <section className="relative pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Hero badge */}
            <div className="inline-flex items-center space-x-2 bg-primary-100 dark:bg-primary-900/30 text-primary-800 dark:text-primary-300 px-6 py-3 rounded-full text-sm font-medium mb-8 animate-bounce-gentle shadow-soft">
              <SparklesIcon className="h-4 w-4" />
              <T>Your Personal Diabetes Management Companion</T>
            </div>

            {/* Main headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold mb-6 animate-fade-in">
              <T as="span" className="text-neutral-900 dark:text-white">
                Take Control of Your
              </T>
              <T as="span" className="block text-primary-600 dark:text-primary-400">
                Diabetes Journey
              </T>
            </h1>

            {/* Subtext */}
            <T as="p" className="text-xl text-neutral-600 dark:text-neutral-300 mb-8 max-w-3xl mx-auto leading-relaxed animate-slide-up">
              DiaLog helps you monitor your blood sugar levels, track your meals, and make informed decisions 
              about your health with intelligent analytics and personalized insights.
            </T>

            {/* Single Start Logging button: always send to auth */}
            <div className="flex justify-center mt-8 animate-slide-up">
              <Link
                to="/auth"
                className="inline-flex items-center px-8 py-4 bg-primary-800 text-white text-lg font-semibold rounded-xl hover:bg-primary-900 transition-all duration-200 border-2 border-primary-500"
              >
                <T>Start Logging</T>
                <ArrowRightIcon className="h-5 w-5 ml-2" />
              </Link>
            </div>
          </div>
        </div>

        {/* Background decoration */}
        <div className="absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary-200/30 dark:bg-primary-800/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-secondary-200/30 dark:bg-secondary-800/20 rounded-full blur-3xl"></div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 sm:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Section header */}
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Everything You Need for Better Health
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-300 max-w-2xl mx-auto">
              Our comprehensive platform provides all the tools you need to manage your diabetes effectively and live your best life.
            </p>
          </div>

          {/* Features grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <div 
                key={index}
                className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-sm rounded-2xl p-8 shadow-soft hover:shadow-strong transition-all duration-300 transform hover:-translate-y-2 animate-slide-up border border-neutral-100 dark:border-neutral-700 group"
                style={{animationDelay: `${index * 0.1}s`}}
              >
                {/* Feature icon */}
                <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl mb-6 ${feature.color} group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="h-7 w-7" />
                </div>

                {/* Feature content */}
                <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-4">
                  {feature.title}
                </h3>
                <p className="text-neutral-600 dark:text-neutral-300 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 bg-primary-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
            Ready to Start Your Health Journey?
          </h2>
          <p className="text-xl text-primary-100 mb-8 max-w-2xl mx-auto">
            Join thousands of users who are already taking control of their diabetes with DiaLog.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
            <button
              onClick={handleProfileClick}
              className="inline-flex items-center px-8 py-4 bg-white text-primary-600 text-lg font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200 shadow-medium hover:shadow-strong transform hover:-translate-y-1"
            >
              <UserCircleIcon className="h-6 w-6 mr-3" />
              Set Up Profile
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;

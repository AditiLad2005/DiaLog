import React from 'react';
import { Link } from 'react-router-dom';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';

const NotFound = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center px-4">
      <div className="text-center">
        {/* 404 Number */}
        <div className="mb-8">
          <h1 className="text-9xl font-bold text-gray-200 select-none">404</h1>
        </div>

        {/* Error Message */}
        <div className="mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
            Oops! Page Not Found
          </h2>
          <p className="text-lg text-gray-600 max-w-md mx-auto">
            The page you're looking for doesn't exist. It might have been moved, deleted, or you entered the wrong URL.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-6">
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-all duration-200 shadow-soft hover:shadow-medium transform hover:-translate-y-1"
          >
            <HomeIcon className="h-5 w-5 mr-2" />
            Go Home
          </Link>
          
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center px-6 py-3 bg-white text-gray-700 font-semibold rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200 shadow-soft hover:shadow-medium"
          >
            <ArrowLeftIcon className="h-5 w-5 mr-2" />
            Go Back
          </button>
        </div>

        {/* Helpful Links */}
        <div className="mt-12">
          <p className="text-gray-500 mb-4">Or try one of these helpful links:</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link to="/dashboard" className="text-primary-600 hover:text-primary-700 font-medium">
              Dashboard
            </Link>
            <Link to="/meal-log" className="text-primary-600 hover:text-primary-700 font-medium">
              Log Meal
            </Link>
            <Link to="/profile" className="text-primary-600 hover:text-primary-700 font-medium">
              Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;

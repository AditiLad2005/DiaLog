import React from 'react';
import FoodSafetyChecker from '../components/FoodSafetyChecker';

export default function FoodSafety() {
  return (
    <div className="min-h-screen bg-primary-50 dark:bg-gray-900 transition-colors duration-300">
      <section className="pt-10 pb-6 sm:pt-12 sm:pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-neutral-900 dark:text-white">Safety & Nutrition</h1>
          <p className="text-neutral-600 dark:text-neutral-300">Search any food to see diabetes-focused safety results with full nutritional details. This tool does not log meals.</p>
        </div>
      </section>

      <section className="pb-12 sm:pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <FoodSafetyChecker className="mb-6" />
        </div>
      </section>
    </div>
  );
}

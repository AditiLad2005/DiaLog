import React from 'react';
import LogoPlaceholder from './LogoPlaceholder';

const Footer = () => {
  return (
    <footer className="bg-neutral-50/80 dark:bg-gray-900/80 backdrop-blur-xl border-t border-neutral-200 dark:border-neutral-700 transition-all duration-300">
      <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* Brand */}
          <div className="flex items-center space-x-3">
            <LogoPlaceholder className="w-6 h-6" />
            <span className="text-lg font-semibold text-primary-600 dark:text-primary-400">
              DiaLog
            </span>
          </div>

          {/* Copyright */}
          <div className="text-center md:text-right">
            <p className="text-sm text-neutral-500 dark:text-neutral-400">
              © 2025 DiaLog. Made with <span className="text-danger-500">❤️</span> for better health management.
            </p>
          </div>
        </div>

        {/* Additional info */}
        <div className="mt-6 pt-6 border-t border-neutral-200 dark:border-neutral-700">
          <p className="text-xs text-neutral-400 dark:text-neutral-500 text-center">
            This application is for educational purposes. Always consult with healthcare professionals for medical advice.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

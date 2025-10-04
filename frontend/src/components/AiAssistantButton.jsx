import React from 'react';

const AiAssistantButton = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      aria-label="Open DiaLog AI Assistant"
      className="fixed bottom-6 right-6 z-50 flex items-center space-x-2 px-4 py-3 rounded-full shadow-strong bg-primary-600 hover:bg-primary-700 text-white transition-all duration-200"
    >
      <span className="inline-block w-2 h-2 rounded-full bg-green-300 animate-pulse" />
      <span className="font-semibold">Ask DiaLog</span>
    </button>
  );
};

export default AiAssistantButton;

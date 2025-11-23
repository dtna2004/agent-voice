import React from 'react';

export const LoadingSpinner: React.FC = () => (
  <div className="flex justify-center items-center space-x-2 animate-pulse">
    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-75"></div>
    <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce delay-150"></div>
    <div className="w-2 h-2 bg-pink-400 rounded-full animate-bounce delay-300"></div>
  </div>
);

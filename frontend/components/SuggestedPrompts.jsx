import React from 'react';
import { SparklesIcon } from '@heroicons/react/24/outline';

/**
 * AI-generated follow-up prompt suggestions shown after bot responses.
 * These help users continue the conversation naturally.
 */
export default function SuggestedPrompts({ suggestions, onSelect, isDarkMode, isLoading }) {
  if (!suggestions?.length || isLoading) return null;

  return (
    <div className="animate-fadeIn mt-2 sm:mt-3 ml-8 sm:ml-12">
      <div className="flex items-center gap-1.5 mb-1.5 sm:mb-2">
        <SparklesIcon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`} />
        <span className={`text-[10px] sm:text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          Continue the conversation
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {suggestions.slice(0, 3).map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(prompt)}
            disabled={isLoading}
            className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-xl text-[10px] sm:text-xs border transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] max-w-[200px] sm:max-w-none truncate ${
              isDarkMode
                ? 'border-gray-600 text-gray-300 hover:bg-gray-700 hover:border-gray-500 disabled:opacity-50'
                : 'border-gray-300 text-gray-600 hover:bg-gray-100 hover:border-gray-400 disabled:opacity-50'
            }`}
            title={prompt}
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}

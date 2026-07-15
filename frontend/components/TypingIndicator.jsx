import React from 'react';

export default function TypingIndicator({ isDarkMode }) {
  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="flex gap-3 max-w-xs md:max-w-md lg:max-w-xl flex-row">

        {/* Typing Indicator */}
        <div
          className={`px-5 py-3 rounded-2xl ${
            isDarkMode 
              ? 'bg-gray-700' 
              : 'bg-white border border-gray-200 shadow-sm'
          }`}
          role="status"
          aria-label="Bot is typing"
        >
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
              } animate-bounce`}
              style={{ animationDelay: '0s' }}
            />
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
              } animate-bounce`}
              style={{ animationDelay: '0.15s' }}
            />
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isDarkMode ? 'bg-gray-400' : 'bg-gray-500'
              } animate-bounce`}
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

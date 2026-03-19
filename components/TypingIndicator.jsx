import React from 'react';

export default function TypingIndicator({ isDarkMode }) {
  return (
    <div className="flex justify-start animate-fadeIn">
      <div className="flex gap-3 max-w-xs md:max-w-md lg:max-w-xl flex-row">
        {/* Bot Avatar */}
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center text-lg flex-shrink-0 ${
            isDarkMode 
              ? 'bg-blue-600' 
              : 'bg-blue-500'
          }`}
          role="img"
          aria-label="Bot avatar"
        >
          <img
            src="/chat-con.png"
            alt="Assistant avatar"
            className="w-full h-full rounded-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>

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
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-bounce`}
              style={{ animationDelay: '0s' }}
            />
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-bounce`}
              style={{ animationDelay: '0.15s' }}
            />
            <div
              className={`w-2.5 h-2.5 rounded-full ${
                isDarkMode ? 'bg-blue-400' : 'bg-blue-500'
              } animate-bounce`}
              style={{ animationDelay: '0.3s' }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

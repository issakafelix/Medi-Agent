import React from 'react';

/**
 * Advanced Chatbot Layout - Full-featured version with sidebar
 * Shows how to extend the basic ChatBot component
 */
import ChatBot from './ChatBot';
import ChatHistory from './components/ChatHistory';

export default function AdvancedChatBotLayout() {
  const [currentChatId, setCurrentChatId] = React.useState(1);
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  return (
    <div className={`flex h-screen ${isDarkMode ? 'bg-neutral-900' : 'bg-white'}`}>
      {/* Sidebar */}
      <ChatHistory
        isDarkMode={isDarkMode}
        onSelectChat={setCurrentChatId}
        currentChatId={currentChatId}
      />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <ChatBot isDarkMode={isDarkMode} onToggleDarkMode={setIsDarkMode} />
      </div>
    </div>
  );
}

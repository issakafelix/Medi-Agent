import React from 'react';
import ChatBot from './ChatBot';
import './styles/globals.css';

export default function App() {
  return (
    <div className="antialiased dark h-screen w-screen overflow-hidden bg-stakely-bg text-gray-200">
      <ChatBot isDarkMode={true} />
    </div>
  );
}

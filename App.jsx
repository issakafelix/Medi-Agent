import React from 'react';
import ChatBot from './ChatBot';
import FirebaseAuth from './components/FirebaseAuth';
import './styles/globals.css';

export default function App() {
  return (
    <div className="antialiased h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--user-text)]">
      <ChatBot isDarkMode={false} />
      <FirebaseAuth />
    </div>
  );
}

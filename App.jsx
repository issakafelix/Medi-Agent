import React from 'react';
import ChatBot from './ChatBot';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/globals.css';

function AppContent() {
  const { user } = useAuth();
  return (
    <div className="antialiased h-screen w-screen overflow-hidden bg-[var(--bg-color)] text-[var(--user-text)]">
      {user ? <ChatBot isDarkMode={false} /> : <AuthPage />}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

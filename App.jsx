import React from 'react';
import ChatBot from './ChatBot';
import AuthPage from './pages/AuthPage';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import './styles/globals.css';

function AppContent() {
  const { user } = useAuth();
  return (
    <div className="antialiased dark h-screen w-screen overflow-hidden bg-stakely-bg text-gray-200">
      {user ? <ChatBot isDarkMode={true} /> : <AuthPage />}
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

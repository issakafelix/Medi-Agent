import React, { useState } from 'react';
import SymptomWizard from './pages/SymptomWizard';
import AuthPage from './pages/AuthPage';
import './styles/globals.css';

export default function App() {
  const [showAuth, setShowAuth] = useState(false);

  if (showAuth) {
    return <AuthPage onDone={() => setShowAuth(false)} />;
  }
  return <SymptomWizard onOpenAuth={() => setShowAuth(true)} />;
}

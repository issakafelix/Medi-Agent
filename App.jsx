import React from 'react';
import SymptomWizard from './pages/SymptomWizard';
import FirebaseAuth from './components/FirebaseAuth';
import './styles/globals.css';

export default function App() {
  return (
    <>
      <SymptomWizard />
      <FirebaseAuth />
    </>
  );
}

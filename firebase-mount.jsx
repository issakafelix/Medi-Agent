import React from 'react';
import ReactDOM from 'react-dom/client';
import FirebaseAuth from './components/FirebaseAuth';

const el = document.getElementById('firebase-auth-root') || (() => {
  const d = document.createElement('div');
  d.id = 'firebase-auth-root';
  document.body.appendChild(d);
  return d;
})();

const root = ReactDOM.createRoot(el);
root.render(
  <React.StrictMode>
    <FirebaseAuth />
  </React.StrictMode>
);

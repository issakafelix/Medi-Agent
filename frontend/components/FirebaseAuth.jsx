import React, { useEffect, useState } from 'react';
import { signOut, isFirebaseConfigured, getAuthInstance, onAuthStateChange } from '../services/firebaseAuth';

/* Compact header auth widget. Signing in happens on the dedicated auth
   page (see pages/AuthPage.jsx) — the header only shows "Sign in" (via
   `onOpenAuth`) or the signed-in user with a sign-out button. */
export default function FirebaseAuth({ onOpenAuth }) {
  const [user, setUser] = useState(null);
  const configured = isFirebaseConfigured();

  useEffect(() => {
    if (!configured) return;
    const auth = getAuthInstance();
    if (!auth) return;
    setUser(auth.currentUser ?? null);
    const unsubscribe = onAuthStateChange((u) => setUser(u ?? null));
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [configured]);

  if (!configured) {
    return (
      <div className="auth-widget">
        <button className="auth-btn ghost" disabled>
          Auth disabled
        </button>
      </div>
    );
  }

  const label = user?.displayName || user?.email || '';

  return (
    <div className="auth-widget">
      {user ? (
        <div className="auth-user">
          {user.photoURL ? (
            <img src={user.photoURL} alt="" className="auth-avatar" referrerPolicy="no-referrer" />
          ) : (
            <span className="auth-avatar auth-avatar-fallback" aria-hidden="true">
              {(label[0] || '?').toUpperCase()}
            </span>
          )}
          <span className="auth-user-name">{label}</span>
          <button onClick={() => signOut()} className="auth-btn danger">
            Sign out
          </button>
        </div>
      ) : (
        <button onClick={onOpenAuth} className="auth-btn primary">
          Sign in
        </button>
      )}
    </div>
  );
}

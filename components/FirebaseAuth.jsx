import React, { useEffect, useState } from 'react';
import { signOut, isFirebaseConfigured, getAuthInstance, onAuthStateChange, signInWithProvider, signInWithEmail, signUpWithEmail } from '../services/firebaseAuth';

export default function FirebaseAuth() {
  const [user, setUser] = useState(null);
  const configured = isFirebaseConfigured();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    if (!configured) return;
    const auth = getAuthInstance();
    if (!auth) return;
    // lazy-check current user
    setUser(auth.currentUser ?? null);

    // subscribe to changes using exported wrapper
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

  return (
    <div className="auth-widget">
      {user ? (
        <div className="auth-user">
          <img src={user.photoURL} alt="" className="auth-avatar" />
          <span className="auth-user-name">{user.displayName ?? user.email}</span>
          <button onClick={() => signOut()} className="auth-btn danger">
            Sign out
          </button>
        </div>
      ) : (
        <div className="auth-actions">
          <button
            onClick={() => signInWithProvider('google').catch((e) => console.warn('Sign-in failed', e))}
            className="auth-btn primary"
          >
            Google
          </button>
          <button
            onClick={() => signInWithProvider('github').catch((e) => console.warn('Sign-in failed', e))}
            className="auth-btn secondary"
          >
            GitHub
          </button>
          <button
            onClick={() => setShowEmail((s) => !s)}
            className="auth-btn ghost"
            aria-expanded={showEmail}
          >
            Email
          </button>
        </div>
      )}
      {showEmail && !user && (
        <div className="auth-email-form">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="auth-email-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="auth-email-input"
          />
          <div className="auth-actions">
            <button
              onClick={() => signInWithEmail(email, password).catch((e) => console.warn('Sign-in failed', e))}
              className="auth-btn primary"
            >
              Sign in
            </button>
            <button
              onClick={() => signUpWithEmail(email, password).catch((e) => console.warn('Sign-up failed', e))}
              className="auth-btn secondary"
            >
              Sign up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

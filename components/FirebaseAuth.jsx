import React, { useEffect, useState } from 'react';
import { signOut, isFirebaseConfigured, getAuthInstance, onAuthStateChange, signInWithGoogle, signInWithEmail, signUpWithEmail } from '../services/firebaseAuth';

const FRIENDLY_AUTH_ERRORS = {
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/email-already-in-use': 'An account with that email already exists — try signing in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
};

function friendlyAuthError(err) {
  const code = err?.code || '';
  return FRIENDLY_AUTH_ERRORS[code] || 'Sign-in failed. Please try again.';
}

export default function FirebaseAuth() {
  const [user, setUser] = useState(null);
  const configured = isFirebaseConfigured();
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [busy, setBusy] = useState(false);

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

  async function handleGoogleSignIn() {
    setAuthError('');
    setBusy(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      // A user closing the popup isn't an error worth surfacing.
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setAuthError(friendlyAuthError(e));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSignIn() {
    setAuthError('');
    setBusy(true);
    try {
      await signInWithEmail(email, password);
    } catch (e) {
      setAuthError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

  async function handleEmailSignUp() {
    setAuthError('');
    setBusy(true);
    try {
      await signUpWithEmail(email, password);
    } catch (e) {
      setAuthError(friendlyAuthError(e));
    } finally {
      setBusy(false);
    }
  }

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
          <button onClick={handleGoogleSignIn} className="auth-btn primary" disabled={busy}>
            {busy ? 'Signing in…' : 'Google'}
          </button>
          <button
            onClick={() => { setShowEmail((s) => !s); setAuthError(''); }}
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
            type="email"
            className="auth-email-input"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="auth-email-input"
          />
          {authError && <div className="auth-error">{authError}</div>}
          <div className="auth-actions">
            <button onClick={handleEmailSignIn} className="auth-btn primary" disabled={busy}>
              Sign in
            </button>
            <button onClick={handleEmailSignUp} className="auth-btn secondary" disabled={busy}>
              Sign up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

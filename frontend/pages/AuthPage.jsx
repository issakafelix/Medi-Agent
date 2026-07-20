import React, { useState } from 'react';
import {
  signInWithGoogle,
  signInWithEmail,
  signUpWithEmail,
  friendlyAuthError,
  isFirebaseConfigured,
} from '../services/firebaseAuth';

/* Full-page sign-in / create-account screen. Reached from the header's
   "Sign in" button; `onDone` returns to the wizard (after a successful
   sign-in, or via "Continue without an account"). */
export default function AuthPage({ onDone }) {
  const configured = isFirebaseConfigured();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function handleGoogle() {
    setError('');
    setBusy(true);
    try {
      await signInWithGoogle();
      onDone();
    } catch (e) {
      // A user closing the popup isn't an error worth surfacing.
      if (e?.code !== 'auth/popup-closed-by-user' && e?.code !== 'auth/cancelled-popup-request') {
        setError(friendlyAuthError(e));
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signup') {
        await signUpWithEmail(email.trim(), password, name.trim());
      } else {
        await signInWithEmail(email.trim(), password);
      }
      onDone();
    } catch (err) {
      setError(friendlyAuthError(err));
    } finally {
      setBusy(false);
    }
  }

  const isSignup = mode === 'signup';

  return (
    <div className="symptom-wizard auth-screen">
      <main className="auth-card" aria-labelledby="auth-title">
        <button
          type="button"
          className="brand auth-brand"
          onClick={onDone}
          aria-label="Back to MediAgent"
        >
          <svg className="brand-mark" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M2 12h4l2-7 4 14 2-9 2 5h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="brand-name">MediAgent</span>
        </button>

        {/* Re-keyed on mode switch so the entrance animation replays. */}
        <h1 id="auth-title" className="auth-title" key={`title-${mode}`}>
          {isSignup ? <>Create your <em>account</em>.</> : <>Welcome <em>back</em>.</>}
        </h1>
        <p className="auth-sub" key={`sub-${mode}`}>
          {isSignup
            ? 'Keep your symptom checks and pick them up on any device.'
            : 'Sign in to see your past sessions on any device.'}
        </p>

        {!configured ? (
          <div className="auth-error" role="alert">
            Sign-in isn&rsquo;t configured in this build. You can still use MediAgent without an account.
          </div>
        ) : (
          <>
            <button type="button" className="auth-google-btn" onClick={handleGoogle} disabled={busy}>
              {busy && <span className="auth-spinner" aria-hidden="true" />}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18A10.97 10.97 0 0 0 1 12c0 1.77.42 3.45 1.18 4.94l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
              {busy ? 'Signing in…' : 'Continue with Google'}
            </button>

            <div className="auth-divider" aria-hidden="true"><span>or</span></div>

            <form className="auth-form" onSubmit={handleSubmit}>
              {isSignup && (
                <label className="auth-field">
                  <span>Name</span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="How should we greet you?"
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                />
              </label>
              <label className="auth-field">
                <span>Password</span>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isSignup ? 'At least 6 characters' : 'Your password'}
                  autoComplete={isSignup ? 'new-password' : 'current-password'}
                  required
                  minLength={6}
                />
              </label>

              {error && <div className="auth-error" role="alert">{error}</div>}

              <button type="submit" className="auth-submit" disabled={busy}>
                {busy && <span className="auth-spinner" aria-hidden="true" />}
                {busy ? 'One moment…' : isSignup ? 'Create account' : 'Sign in'}
              </button>
            </form>

            <p className="auth-switch">
              {isSignup ? 'Already have an account?' : 'New to MediAgent?'}{' '}
              <button type="button" onClick={() => switchMode(isSignup ? 'signin' : 'signup')}>
                {isSignup ? 'Sign in' : 'Create an account'}
              </button>
            </p>
          </>
        )}

        <button type="button" className="auth-skip" onClick={onDone}>
          Continue without an account →
        </button>
      </main>
      <p className="auth-foot">
        MediAgent is a research prototype and does not replace professional medical care.
      </p>
    </div>
  );
}

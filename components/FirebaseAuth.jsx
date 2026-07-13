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
      <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 9999, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', maxWidth: 'min(92vw, 360px)' }}>
        <button className="px-3 py-1 rounded bg-gray-200 text-sm" disabled>
          Auth disabled
        </button>
      </div>
    );
  }

  return (
    <div style={{ position: 'absolute', top: 8, right: 8, zIndex: 9999, display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', maxWidth: 'min(92vw, 460px)' }}>
      {user ? (
        <div className="flex items-center gap-2">
          <img src={user.photoURL} alt="avatar" className="w-8 h-8 rounded-full" />
          <span className="text-sm">{user.displayName ?? user.email}</span>
          <button
            onClick={() => signOut()}
            className="ml-2 px-3 py-1 rounded bg-red-500 text-white text-sm"
          >
            Sign out
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => signInWithProvider('google').catch((e) => console.warn('Sign-in failed', e))}
            className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
          >
            Sign in with Google
          </button>
          <button
            onClick={() => signInWithProvider('github').catch((e) => console.warn('Sign-in failed', e))}
            className="px-3 py-1 rounded bg-gray-800 text-white text-sm"
          >
            Sign in with GitHub
          </button>
          <button
            onClick={() => setShowEmail((s) => !s)}
            className="px-3 py-1 rounded bg-gray-200 text-sm"
          >
            Email
          </button>
        </div>
      )}
      {showEmail && !user && (
        <div className="mt-2 p-2 bg-white rounded shadow-md w-64">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="w-full mb-2 p-1 border rounded"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="w-full mb-2 p-1 border rounded"
          />
          <div className="flex gap-2">
            <button
              onClick={() => signInWithEmail(email, password).catch((e) => console.warn('Sign-in failed', e))}
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
            >
              Sign in
            </button>
            <button
              onClick={() => signUpWithEmail(email, password).catch((e) => console.warn('Sign-up failed', e))}
              className="px-3 py-1 rounded bg-green-600 text-white text-sm"
            >
              Sign up
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

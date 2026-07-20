import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as firebaseSignOut,
  onIdTokenChanged,
  getIdToken
} from 'firebase/auth';
import { onAuthStateChanged } from 'firebase/auth';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
} from 'firebase/auth';
import { setFirebaseIdToken } from './apiService';

let auth = null;

function initFirebase() {
  if (auth) return auth;
  const raw = import.meta.env.VITE_FIREBASE_CONFIG;
  if (!raw) {
    console.warn('VITE_FIREBASE_CONFIG not set; Firebase auth disabled');
    return null;
  }

  let config;
  try {
    config = typeof raw === 'string' && raw.trim().startsWith('{') ? JSON.parse(raw) : raw;
  } catch (e) {
    console.warn('Invalid VITE_FIREBASE_CONFIG JSON:', e);
    return null;
  }

  if (!getApps().length) {
    try {
      initializeApp(config);
    } catch (e) {
      console.warn('Failed to initialize Firebase app:', e);
      return null;
    }
  }

  auth = getAuth();

  // Keep local storage token in sync with auth state
  onIdTokenChanged(auth, async (user) => {
    if (user) {
      try {
        const token = await getIdToken(user, /* forceRefresh */ false);
        setFirebaseIdToken(token);
      } catch (e) {
        console.warn('Failed to get ID token', e);
        setFirebaseIdToken(null);
      }
    } else {
      setFirebaseIdToken(null);
    }
  });

  return auth;
}

export async function signInWithGoogle() {
  const a = initFirebase();
  if (!a) throw new Error('Firebase not initialized');
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(a, provider);
  const user = result.user;
  const token = await getIdToken(user, true);
  setFirebaseIdToken(token);
  return { user, token };
}

export async function signUpWithEmail(email, password, displayName) {
  const a = initFirebase();
  if (!a) throw new Error('Firebase not initialized');
  const result = await createUserWithEmailAndPassword(a, email, password);
  const user = result.user;
  if (displayName) {
    try {
      await updateProfile(user, { displayName });
    } catch (e) {
      // Account exists either way; a failed profile write shouldn't block sign-up.
      console.warn('Failed to set display name', e);
    }
  }
  const token = await getIdToken(user, true);
  setFirebaseIdToken(token);
  return { user, token };
}

export const FRIENDLY_AUTH_ERRORS = {
  'auth/wrong-password': 'Incorrect password.',
  'auth/invalid-credential': 'Incorrect email or password.',
  'auth/user-not-found': 'No account found with that email.',
  'auth/email-already-in-use': 'An account with that email already exists — try signing in instead.',
  'auth/invalid-email': 'Enter a valid email address.',
  'auth/weak-password': 'Password should be at least 6 characters.',
  'auth/network-request-failed': 'Network error — check your connection and try again.',
  'auth/too-many-requests': 'Too many attempts. Please wait a moment and try again.',
};

export function friendlyAuthError(err) {
  const code = err?.code || '';
  return FRIENDLY_AUTH_ERRORS[code] || 'Sign-in failed. Please try again.';
}

export async function signInWithEmail(email, password) {
  const a = initFirebase();
  if (!a) throw new Error('Firebase not initialized');
  const result = await signInWithEmailAndPassword(a, email, password);
  const user = result.user;
  const token = await getIdToken(user, true);
  setFirebaseIdToken(token);
  return { user, token };
}

export async function signOut() {
  const a = initFirebase();
  if (!a) return;
  await firebaseSignOut(a);
  setFirebaseIdToken(null);
}

export function getAuthInstance() {
  return initFirebase();
}

export function isFirebaseConfigured() {
  return Boolean(import.meta.env.VITE_FIREBASE_CONFIG);
}

export function onAuthStateChange(cb) {
  const a = initFirebase();
  if (!a) return () => {};
  return onAuthStateChanged(a, cb);
}

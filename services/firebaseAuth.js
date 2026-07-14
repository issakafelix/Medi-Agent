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

export async function signUpWithEmail(email, password) {
  const a = initFirebase();
  if (!a) throw new Error('Firebase not initialized');
  const result = await createUserWithEmailAndPassword(a, email, password);
  const user = result.user;
  const token = await getIdToken(user, true);
  setFirebaseIdToken(token);
  return { user, token };
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

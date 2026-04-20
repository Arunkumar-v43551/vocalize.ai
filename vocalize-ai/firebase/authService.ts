import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  updateProfile,
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { auth, googleProvider, db } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// Google Sign-In
// ─────────────────────────────────────────────────────────────────────────────
export const signInWithGoogle = async (): Promise<User> => {
  const result = await signInWithPopup(auth, googleProvider);
  await ensureUserProfile(result.user);
  return result.user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Email / Password — Register
// ─────────────────────────────────────────────────────────────────────────────
export const registerWithEmail = async (
  email: string,
  password: string,
  displayName: string
): Promise<User> => {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(result.user, { displayName });
  await ensureUserProfile(result.user);
  return result.user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Email / Password — Login
// ─────────────────────────────────────────────────────────────────────────────
export const loginWithEmail = async (
  email: string,
  password: string
): Promise<User> => {
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sign Out
// ─────────────────────────────────────────────────────────────────────────────
export const signOut = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

// ─────────────────────────────────────────────────────────────────────────────
// Auth State Listener — call this once in App to react to login/logout
// ─────────────────────────────────────────────────────────────────────────────
export const onAuthChange = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};

// ─────────────────────────────────────────────────────────────────────────────
// Internal: Create user profile in Firestore on first sign-in
// ─────────────────────────────────────────────────────────────────────────────
const ensureUserProfile = async (user: User): Promise<void> => {
  const userRef = doc(db, 'users', user.uid);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    await setDoc(userRef, {
      uid:         user.uid,
      displayName: user.displayName || 'Vocalize User',
      email:       user.email,
      photoURL:    user.photoURL || null,
      createdAt:   serverTimestamp(),
      preferences: {
        defaultVoice:    'Kore',
        defaultLanguage: 'Tamil',
        defaultSpeed:    1.0,
      },
    });
  }
};

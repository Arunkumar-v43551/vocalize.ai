// Re-export everything from the root firebase authService.
// This ensures AuthModal and App.tsx both use the same Firebase Auth instance.
export {
  signInWithGoogle,
  registerWithEmail,
  loginWithEmail,
  signOut,
  onAuthChange,
} from '../../firebase/authService';

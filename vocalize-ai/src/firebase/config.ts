// Re-export everything from the root firebase config to ensure a single Firebase app instance.
// This prevents duplicate app initialization and ensures all services share the same Firestore DB.
export { auth, db, googleProvider } from '../../firebase/config';
export { default } from '../../firebase/config';

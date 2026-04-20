// Re-export everything from the root firebase sessionService.
// This ensures HistorySidebar and App.tsx both use the same Firestore collection.
export {
  saveSession,
  getUserSessions,
  deleteSession,
  formatSessionLabel,
} from '../../firebase/sessionService';

export type { VocalSession } from '../../firebase/sessionService';

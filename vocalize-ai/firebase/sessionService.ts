import {
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './config';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface VocalSession {
  id?: string;           // Firestore document ID (set after fetch)
  uid: string;           // Firebase Auth user ID
  text: string;          // The text that was synthesized
  voice: string;         // e.g. "Kore"
  language: string;      // e.g. "Tamil"
  emotion: string;       // e.g. "Happy"
  speed: number;         // e.g. 1.0
  audioDurationSec: number;
  label: string;         // Auto-generated label like "Happy · Kore · Tamil"
  createdAt?: Timestamp;
}

// ─────────────────────────────────────────────────────────────────────────────
// Save a new session to Firestore
// ─────────────────────────────────────────────────────────────────────────────
export const saveSession = async (
  sessionData: Omit<VocalSession, 'id' | 'createdAt'>
): Promise<string> => {
  const docRef = await addDoc(collection(db, 'sessions'), {
    ...sessionData,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

// ─────────────────────────────────────────────────────────────────────────────
// Fetch all sessions for a user (ordered by newest first)
// ─────────────────────────────────────────────────────────────────────────────
export const getUserSessions = async (uid: string): Promise<VocalSession[]> => {
  // NOTE: We intentionally avoid orderBy('createdAt') in the query because
  // combining where() + orderBy() on different fields requires a Firestore
  // composite index. Sorting client-side is simpler and index-free.
  const q = query(
    collection(db, 'sessions'),
    where('uid', '==', uid)
  );

  const snapshot = await getDocs(q);
  const sessions = snapshot.docs.map((d) => ({
    id: d.id,
    ...(d.data() as Omit<VocalSession, 'id'>),
  }));

  // Sort newest-first client-side
  return sessions.sort((a, b) => {
    const aTime = a.createdAt?.toMillis() ?? 0;
    const bTime = b.createdAt?.toMillis() ?? 0;
    return bTime - aTime;
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Delete a session
// ─────────────────────────────────────────────────────────────────────────────
export const deleteSession = async (sessionId: string): Promise<void> => {
  await deleteDoc(doc(db, 'sessions', sessionId));
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Format a friendly label for a session
// ─────────────────────────────────────────────────────────────────────────────
export const formatSessionLabel = (
  emotion: string,
  voice: string,
  language: string
): string => `${emotion} · ${voice} · ${language}`;

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Trash2, Play, Sparkles, ChevronRight } from 'lucide-react';
import { getUserSessions, deleteSession, VocalSession } from '../firebase/sessionService';
import { Timestamp } from 'firebase/firestore';

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  onLoadSession: (session: VocalSession) => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const formatDate = (ts: Timestamp | undefined): string => {
  if (!ts) return 'Just now';
  const d = ts.toDate();
  return d.toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  });
};

const emotionEmoji: Record<string, string> = {
  Neutral: '😐', Happy: '😊', Excited: '🤩',
  Sad: '😢', Angry: '😠', Calm: '😌',
};

// ─────────────────────────────────────────────────────────────────────────────
// HistorySidebar
// ─────────────────────────────────────────────────────────────────────────────
const HistorySidebar: React.FC<Props> = ({ isOpen, onClose, uid, onLoadSession }) => {
  const [sessions, setSessions]   = useState<VocalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Fetch sessions when sidebar opens
  useEffect(() => {
    if (isOpen && uid) {
      setIsLoading(true);
      getUserSessions(uid)
        .then(setSessions)
        .catch(console.error)
        .finally(() => setIsLoading(false));
    }
  }, [isOpen, uid]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err) {
      console.error('Delete failed:', err);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-[#0a0f1e] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Generation History</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                id="close-history-btn"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 uppercase tracking-widest font-bold">Loading history...</p>
                </div>
              ) : sessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold text-sm">No sessions yet</p>
                    <p className="text-slate-600 text-xs mt-1">Your generated audio sessions will appear here.</p>
                  </div>
                </div>
              ) : (
                sessions.map((session) => (
                  <motion.div
                    key={session.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    onClick={() => { onLoadSession(session); onClose(); }}
                    className="group relative p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-200"
                  >
                    {/* Emoji + label */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{emotionEmoji[session.emotion] || '🎙️'}</span>
                        <div>
                          <p className="text-sm font-semibold text-slate-200">{session.label}</p>
                          <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-widest">
                            {formatDate(session.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          id={`delete-session-${session.id}`}
                          onClick={(e) => handleDelete(session.id!, e)}
                          disabled={deletingId === session.id}
                          className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                        >
                          {deletingId === session.id
                            ? <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            : <Trash2 className="w-3 h-3" />
                          }
                        </button>
                      </div>
                    </div>

                    {/* Text snippet */}
                    <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                      {session.text}
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-2">
                      {[session.voice, session.language, `${session.speed}x`].map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider text-indigo-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>

                    {/* Load cue */}
                    <div className="absolute right-3 bottom-3 flex items-center gap-1 text-[9px] text-slate-700 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                      <Play className="w-2.5 h-2.5" fill="currentColor" />
                      <span>Load</span>
                      <ChevronRight className="w-2.5 h-2.5" />
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistorySidebar;

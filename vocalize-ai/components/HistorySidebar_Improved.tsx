import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, Trash2, Play, Sparkles, ChevronRight, Search, Star } from 'lucide-react';
import { getUserSessions, deleteSession, VocalSession } from '../firebase/sessionService';
import { Timestamp } from 'firebase/firestore';
import { toast } from '../utils/toast';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  uid: string;
  onLoadSession: (session: VocalSession) => void;
}

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

const sortSessions = (
  items: VocalSession[],
  favorites: Set<string>
): VocalSession[] =>
  [...items].sort((a, b) => {
    const aFav = favorites.has(a.id || '');
    const bFav = favorites.has(b.id || '');
    if (aFav !== bFav) return aFav ? -1 : 1;
    return (b.createdAt?.toDate().getTime() || 0) - (a.createdAt?.toDate().getTime() || 0);
  });

const HistorySidebar: React.FC<Props> = ({ isOpen, onClose, uid, onLoadSession }) => {
  const [sessions, setSessions] = useState<VocalSession[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (isOpen && uid) {
      setIsLoading(true);
      getUserSessions(uid)
        .then(setSessions)
        .catch(console.error)
        .finally(() => setIsLoading(false));
      
      // Load favorites from localStorage
      const saved = localStorage.getItem(`favorites_${uid}`);
      if (saved) {
        setFavorites(new Set(JSON.parse(saved)));
      }
    }
  }, [isOpen, uid]);

  // Save favorites to localStorage
  const toggleFavorite = (sessionId: string) => {
    const updated = new Set(favorites);
    if (updated.has(sessionId)) {
      updated.delete(sessionId);
    } else {
      updated.add(sessionId);
    }
    setFavorites(updated);
    localStorage.setItem(`favorites_${uid}`, JSON.stringify(Array.from(updated)));
  };

  const filteredSessions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const matched = query
      ? sessions.filter(
          (s) =>
            s.text.toLowerCase().includes(query) ||
            s.voice.toLowerCase().includes(query) ||
            s.language.toLowerCase().includes(query) ||
            s.emotion.toLowerCase().includes(query)
        )
      : sessions;
    return sortSessions(matched, favorites);
  }, [sessions, searchQuery, favorites]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  const handleDelete = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingId(sessionId);
    try {
      await deleteSession(sessionId);
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
      const updated = new Set(favorites);
      updated.delete(sessionId);
      setFavorites(updated);
      localStorage.setItem(`favorites_${uid}`, JSON.stringify(Array.from(updated)));
      toast.success('Session deleted.');
    } catch (err) {
      console.error('Delete failed:', err);
      toast.error('Could not delete session.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          />

          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed top-0 right-0 h-full w-full max-w-sm z-50 bg-[#0a0f1e] border-l border-white/10 flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">Generation History</h2>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                    {filteredSessions.length} of {sessions.length}
                  </p>
                </div>
              </div>
              <button
                id="close-history-btn"
                onClick={onClose}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                aria-label="Close history"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Bar */}
            <div className="px-4 py-3 border-b border-white/5 bg-black/20">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search by text, voice, language..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 pl-10 pr-4 py-2 rounded-lg text-sm text-slate-200 placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                  aria-label="Search sessions"
                />
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center h-48 gap-3">
                  <div className="w-6 h-6 border-2 border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin" />
                  <p className="text-xs text-slate-600 uppercase tracking-widest font-bold">Loading history...</p>
                </div>
              ) : filteredSessions.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-4">
                  <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-slate-600" />
                  </div>
                  <div>
                    <p className="text-slate-400 font-semibold text-sm">
                      {searchQuery ? 'No matches found' : 'No sessions yet'}
                    </p>
                    <p className="text-slate-600 text-xs mt-1">
                      {searchQuery
                        ? 'Try a different search term'
                        : 'Your generated audio sessions will appear here.'}
                    </p>
                  </div>
                </div>
              ) : (
                filteredSessions.map((session) => {
                  const isFavorite = favorites.has(session.id || '');
                  return (
                    <motion.div
                      key={session.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      onClick={() => {
                        onLoadSession(session);
                        onClose();
                      }}
                      className="group relative p-4 bg-white/5 border border-white/5 rounded-2xl cursor-pointer hover:bg-white/10 hover:border-indigo-500/20 transition-all duration-200"
                    >
                      {/* Favorite badge */}
                      {isFavorite && (
                        <div className="absolute top-2 right-2">
                          <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                        </div>
                      )}

                      <div className="flex items-start justify-between mb-3 pr-6">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{emotionEmoji[session.emotion] || '🎙️'}</span>
                          <div>
                            <p className="text-sm font-semibold text-slate-200">{session.label}</p>
                            <p className="text-[10px] text-slate-600 mt-0.5 uppercase tracking-widest">
                              {formatDate(session.createdAt)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 line-clamp-2 mb-3 leading-relaxed">
                        {session.text}
                      </p>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          {[session.voice, session.language, `${session.speed}x`].map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-[9px] font-bold uppercase tracking-wider text-indigo-400 truncate"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleFavorite(session.id || '');
                            }}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500/20 transition-all"
                            aria-label={isFavorite ? 'Remove favorite' : 'Add favorite'}
                          >
                            <Star className="w-3 h-3" fill={isFavorite ? 'currentColor' : 'none'} />
                          </button>
                          <button
                            id={`delete-session-${session.id}`}
                            onClick={(e) => handleDelete(session.id || '', e)}
                            disabled={deletingId === session.id}
                            className="w-7 h-7 flex items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all"
                            aria-label="Delete session"
                          >
                            {deletingId === session.id ? (
                              <div className="w-3 h-3 border border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="absolute right-3 bottom-3 flex items-center gap-1 text-[9px] text-slate-700 font-bold uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-2.5 h-2.5" fill="currentColor" />
                        <span>Load</span>
                        <ChevronRight className="w-2.5 h-2.5" />
                      </div>
                    </motion.div>
                  );
                })
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default HistorySidebar;

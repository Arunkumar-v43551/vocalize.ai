import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard } from 'lucide-react';
import { COMMON_SHORTCUTS } from '../hooks/useKeyboardShortcuts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const KeyboardShortcutsModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const shortcuts = [
    { keys: COMMON_SHORTCUTS.GENERATE, description: 'Generate speech' },
    { keys: COMMON_SHORTCUTS.PLAY_PAUSE, description: 'Play / Pause audio' },
    { keys: COMMON_SHORTCUTS.STOP, description: 'Stop playback' },
    { keys: COMMON_SHORTCUTS.DOWNLOAD, description: 'Download audio' },
    { keys: COMMON_SHORTCUTS.HISTORY, description: 'Open history' },
    { keys: COMMON_SHORTCUTS.ANALYTICS, description: 'Open analytics' },
    { keys: '?', description: 'Show this help menu' },
  ];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="w-full max-w-md bg-[#0a0f1e] border border-white/10 rounded-3xl shadow-2xl overflow-hidden pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <Keyboard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold text-white">Keyboard Shortcuts</h2>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">Quick commands</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                  aria-label="Close help"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Content */}
              <div className="p-6 space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {shortcuts.map((shortcut, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/5 hover:bg-white/10 transition-all"
                  >
                    <p className="text-sm text-slate-300">{shortcut.description}</p>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.split('+').map((key, i, parts) => (
                        <React.Fragment key={`${shortcut.keys}-${key}-${i}`}>
                          <kbd className="px-2.5 py-1.5 rounded-lg bg-white/10 border border-white/20 text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                            {key}
                          </kbd>
                          {i < parts.length - 1 && (
                            <span className="text-slate-600 text-xs">+</span>
                          )}
                        </React.Fragment>
                      ))}
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-white/5 bg-white/5">
                <p className="text-xs text-slate-500 text-center">
                  Press <kbd className="px-1.5 py-0.5 mx-1 rounded bg-white/10 border border-white/20 text-[9px] font-bold">?</kbd> to toggle this menu
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default KeyboardShortcutsModal;

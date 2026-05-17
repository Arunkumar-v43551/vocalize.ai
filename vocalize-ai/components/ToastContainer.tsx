import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';
import {
  subscribeToToasts,
  subscribeToToastClose,
  closeToast,
  ToastMessage,
  ToastType,
} from '../utils/toast';

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-300 before:bg-emerald-500',
  error: 'bg-red-500/10 border-red-500/20 text-red-300 before:bg-red-500',
  warning: 'bg-amber-500/10 border-amber-500/20 text-amber-300 before:bg-amber-500',
  info: 'bg-blue-500/10 border-blue-500/20 text-blue-300 before:bg-blue-500',
};

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle className="w-5 h-5 shrink-0" aria-hidden />,
  error: <AlertCircle className="w-5 h-5 shrink-0" aria-hidden />,
  warning: <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden />,
  info: <Info className="w-5 h-5 shrink-0" aria-hidden />,
};

const MAX_VISIBLE = 4;

const ToastContainer: React.FC = () => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismiss = useCallback((id: string) => {
    closeToast(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    return subscribeToToasts((toast) => {
      setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), toast]);
    });
  }, []);

  useEffect(() => {
    return subscribeToToastClose((id) => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    });
  }, []);

  return (
    <motion.div
      role="region"
      aria-live="polite"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 left-4 sm:left-auto sm:bottom-6 sm:right-6 z-[9999] flex flex-col items-end gap-3 pointer-events-none max-w-sm sm:max-w-md ml-auto"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            layout
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            className={`
              relative flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border pointer-events-auto w-full
              shadow-lg shadow-black/20
              ${TOAST_STYLES[toast.type]}
              before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:rounded-l-xl
            `}
          >
            <div className="flex items-center gap-3 flex-1 min-w-0">
              {TOAST_ICONS[toast.type]}
              <p className="text-sm font-medium leading-snug">{toast.message}</p>
            </motion.div>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="flex-shrink-0 p-1 rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </motion.div>
  );
};

export default ToastContainer;

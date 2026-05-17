export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

const toastListeners = new Set<(toast: ToastMessage) => void>();
const toastCloseListeners = new Set<(id: string) => void>();
const dismissTimers = new Map<string, ReturnType<typeof setTimeout>>();

export const subscribeToToasts = (callback: (toast: ToastMessage) => void) => {
  toastListeners.add(callback);
  return () => toastListeners.delete(callback);
};

export const subscribeToToastClose = (callback: (id: string) => void) => {
  toastCloseListeners.add(callback);
  return () => toastCloseListeners.delete(callback);
};

export const closeToast = (id: string) => {
  const timer = dismissTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    dismissTimers.delete(id);
  }
  toastCloseListeners.forEach((callback) => callback(id));
};

const showToast = (type: ToastType, message: string, duration = 4000) => {
  const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const toast: ToastMessage = { id, type, message, duration };

  toastListeners.forEach((callback) => callback(toast));

  if (duration > 0) {
    const timer = setTimeout(() => closeToast(id), duration);
    dismissTimers.set(id, timer);
  }
};

export const toast = {
  success: (message: string, duration?: number) => showToast('success', message, duration),
  error: (message: string, duration?: number) => showToast('error', message, duration ?? 6000),
  warning: (message: string, duration?: number) => showToast('warning', message, duration),
  info: (message: string, duration?: number) => showToast('info', message, duration),
};

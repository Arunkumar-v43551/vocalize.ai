import { useEffect, useRef } from 'react';

export interface ShortcutMap {
  [key: string]: () => void;
}

const normalizeKey = (key: string): string => {
  if (key === ' ') return 'Space';
  if (key === 'Escape') return 'Escape';
  if (key === 'Enter') return 'Enter';
  if (key.length === 1) return key.toUpperCase();
  return key;
};

export const buildShortcutString = (e: KeyboardEvent): string => {
  const parts: string[] = [];
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl');
  if (e.shiftKey) parts.push('Shift');
  if (e.altKey) parts.push('Alt');
  parts.push(normalizeKey(e.key));
  return parts.join('+');
};

const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || target.isContentEditable;
};

export const useKeyboardShortcuts = (shortcuts: ShortcutMap, enabled = true) => {
  const shortcutsRef = useRef(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target)) return;

      const handler = shortcutsRef.current[buildShortcutString(e)];
      if (handler) {
        e.preventDefault();
        handler();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [enabled]);
};

export const COMMON_SHORTCUTS = {
  GENERATE: 'Ctrl+Enter',
  PLAY_PAUSE: 'Space',
  STOP: 'Escape',
  DOWNLOAD: 'Ctrl+S',
  HISTORY: 'Ctrl+H',
  ANALYTICS: 'Ctrl+Shift+A',
} as const;

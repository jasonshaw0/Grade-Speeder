import { useEffect } from 'react';
import type { KeybindingsConfig } from '../types';

function normalizeKey(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push('Ctrl');
  if (event.altKey) parts.push('Alt');
  if (event.shiftKey && event.key !== 'Shift') parts.push('Shift');
  const key = event.key.length === 1 ? event.key.toUpperCase() : event.key;
  parts.push(key);
  return parts.join('+');
}

export function useKeyboardNavigation(
  keybindings: KeybindingsConfig | null,
  handlers: {
    nextField: () => void;
    prevField: () => void;
    nextStudentSameField: () => void;
    prevStudentSameField: () => void;
  },
  enabled: boolean,
) {
  useEffect(() => {
    if (!enabled || !keybindings) return;

    const handleKey = (event: KeyboardEvent) => {
      const normalized = normalizeKey(event);
      const matches = (action: keyof KeybindingsConfig) =>
        keybindings[action]?.some((k) => k.toLowerCase() === normalized.toLowerCase());

      if (matches('NEXT_FIELD')) {
        event.preventDefault();
        handlers.nextField();
      } else if (matches('PREV_FIELD')) {
        event.preventDefault();
        handlers.prevField();
      } else if (matches('NEXT_STUDENT_SAME_FIELD')) {
        event.preventDefault();
        handlers.nextStudentSameField();
      } else if (matches('PREV_STUDENT_SAME_FIELD')) {
        event.preventDefault();
        handlers.prevStudentSameField();
      }
    };

    window.addEventListener('keydown', handleKey, true);
    return () => window.removeEventListener('keydown', handleKey, true);
  }, [enabled, handlers, keybindings]);
}

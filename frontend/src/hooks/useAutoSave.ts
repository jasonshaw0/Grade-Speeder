import { useEffect, useRef } from 'react';
import type { DraftState } from '../types';

export function useAutoSave(drafts: Record<number, DraftState>, interval: number = 30000) {
  const draftsRef = useRef(drafts);

  useEffect(() => {
    draftsRef.current = drafts;
  }, [drafts]);

  useEffect(() => {
    if (interval <= 0) return;

    const save = () => {
      const currentDrafts = draftsRef.current;
      // Only save if there are dirty drafts
      const hasDirty = Object.values(currentDrafts).some(d => d.gradeDirty || d.commentDirty || d.statusDirty || d.rubricCommentsDirty);
      if (hasDirty) {
        localStorage.setItem('grade-speeder-autosave', JSON.stringify(currentDrafts));
        console.log('Auto-saved drafts');
      }
    };

    const timer = setInterval(save, interval);
    return () => clearInterval(timer);
  }, [interval]);
}

export function loadAutoSave(): Record<number, DraftState> | null {
  const saved = localStorage.getItem('grade-speeder-autosave');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      return null;
    }
  }
  return null;
}

export function clearAutoSave() {
  localStorage.removeItem('grade-speeder-autosave');
}

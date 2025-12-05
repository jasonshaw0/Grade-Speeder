import { useState, useEffect, useCallback } from 'react';

export interface HistoryChange {
  userId: number;
  studentName: string;
  oldGrade: number | null;
  newGrade: number | null;
  oldComment: string;
  newComment: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  summary: string;
  changes: HistoryChange[];
}

export function useHistory(maxEntries: number = 50) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem('grade-speeder-history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Apply maxEntries limit when loading
        setHistory(parsed.slice(0, maxEntries));
      } catch (e) {
        console.error('Failed to parse history', e);
      }
    }
  }, [maxEntries]);

  const addEntry = useCallback((entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      timestamp: Date.now(),
    };
    setHistory(prev => {
      const next = [newEntry, ...prev].slice(0, maxEntries);
      localStorage.setItem('grade-speeder-history', JSON.stringify(next));
      return next;
    });
    return newEntry;
  }, [maxEntries]);

  const clearHistory = useCallback(() => {
    setHistory([]);
    localStorage.removeItem('grade-speeder-history');
  }, []);

  return { history, addEntry, clearHistory };
}

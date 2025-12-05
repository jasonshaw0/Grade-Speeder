import { useState } from 'react';
import type { HistoryEntry } from '../hooks/useHistory';

interface Props {
  open: boolean;
  history: HistoryEntry[];
  onClose: () => void;
  onClearHistory: () => void;
}

export function HistoryModal({ open, history, onClose, onClearHistory }: Props) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl max-h-[80vh] flex flex-col rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined">history</span>
            History Stack
          </h2>
          <button
            className="text-sm text-slate-500 transition hover:text-slate-900 dark:hover:text-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          {history.length === 0 ? (
            <div className="text-center py-10 text-slate-500 dark:text-slate-400">
              No history recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((entry) => (
                <div key={entry.id} className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                  <div 
                    className="p-3 flex items-center justify-between cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-900 dark:text-slate-100">
                        {entry.summary}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400">
                      {expandedId === entry.id ? 'expand_less' : 'expand_more'}
                    </span>
                  </div>
                  
                  {expandedId === entry.id && (
                    <div className="border-t border-slate-200 dark:border-slate-700 p-3 bg-white dark:bg-slate-950">
                      <table className="w-full text-sm text-left">
                        <thead className="text-xs text-slate-500 dark:text-slate-400 uppercase bg-slate-50 dark:bg-slate-900">
                          <tr>
                            <th className="px-2 py-1">Student</th>
                            <th className="px-2 py-1">Grade</th>
                            <th className="px-2 py-1">Comment</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.changes.map((change, idx) => (
                            <tr key={idx} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <td className="px-2 py-2 font-medium text-slate-900 dark:text-slate-100">
                                {change.studentName}
                              </td>
                              <td className="px-2 py-2 text-slate-700 dark:text-slate-300">
                                {change.oldGrade !== change.newGrade && (
                                  <div className="flex items-center gap-1">
                                    <span className="line-through text-slate-400">{change.oldGrade ?? '-'}</span>
                                    <span className="material-symbols-outlined text-[12px] text-slate-400">arrow_forward</span>
                                    <span className="font-bold text-blue-600 dark:text-blue-400">{change.newGrade ?? '-'}</span>
                                  </div>
                                )}
                                {change.oldGrade === change.newGrade && (
                                  <span>{change.newGrade ?? '-'}</span>
                                )}
                              </td>
                              <td className="px-2 py-2 text-slate-600 dark:text-slate-400 text-xs max-w-[200px] truncate">
                                {change.oldComment !== change.newComment ? (
                                  <span title={change.newComment}>Changed</span>
                                ) : (
                                  <span className="text-slate-300 dark:text-slate-600">-</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 flex justify-between items-center">
          <button
            className="text-sm text-red-500 hover:text-red-600 dark:hover:text-red-400 flex items-center gap-1"
            onClick={() => {
              if (confirm('Are you sure you want to clear all history?')) {
                onClearHistory();
              }
            }}
          >
            <span className="material-symbols-outlined text-[18px]">delete</span>
            Clear History
          </button>
          <button
            className="rounded-md bg-slate-200 dark:bg-slate-700 px-4 py-2 text-sm font-medium text-slate-900 dark:text-slate-100 hover:bg-slate-300 dark:hover:bg-slate-600"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

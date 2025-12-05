import { useEffect, useState } from 'react';
import type { PublicConfig } from '../types';

interface Props {
  open: boolean;
  config: PublicConfig | null;
  saving: boolean;
  onClose: () => void;
  onSave: (payload: {
    baseUrl: string;
    courseId: number | null;
    assignmentId: number | null;
    accessToken?: string | null;
  }) => void;
}

export function ApiKeyModal({ open, config, onClose, onSave, saving }: Props) {
  const [baseUrl, setBaseUrl] = useState('');
  const [courseId, setCourseId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  useEffect(() => {
    if (config && open) {
      setBaseUrl(config.baseUrl || '');
      setCourseId(config.courseId ? String(config.courseId) : '');
      setAccessToken('');
    }
  }, [config, open]);

  if (!open) return null;

  const handleSave = () => {
    const newCourseId = courseId ? Number(courseId) : null;
    const courseChanged = newCourseId !== config?.courseId;
    
    onSave({
      baseUrl: baseUrl.trim(),
      courseId: newCourseId,
      assignmentId: courseChanged ? null : (config?.assignmentId ?? null),
      accessToken: accessToken || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-5 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px] text-amber-500">key</span>
            Canvas API Connection
          </h2>
          <button
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="space-y-3">
          <label className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-300">
            Canvas API Base URL
            <input
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              placeholder="https://yourcanvas.instructure.com/api/v1"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-300">
            Course ID
            <input
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              placeholder="e.g., 12345"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-300">
            Access Token
            <input
              type="password"
              className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
              placeholder={config?.tokenPresent ? 'Token stored (leave blank to keep)' : 'Paste token'}
              value={accessToken}
              onChange={(e) => setAccessToken(e.target.value)}
            />
          </label>
        </div>

        <p className="mt-3 text-[10px] text-slate-500 dark:text-slate-400">
          Token is stored locally and never sent to external servers.
        </p>

        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            className="px-3 py-1.5 text-xs rounded-md border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-3 py-1.5 text-xs font-medium rounded-md bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-60"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}

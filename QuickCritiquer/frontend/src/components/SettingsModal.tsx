import { useEffect, useState } from 'react';
import type { KeybindingAction, KeybindingsConfig, PublicConfig } from '../types';

type SettingsForm = {
  baseUrl: string;
  courseId: string;
  accessToken: string;
  keybindings: KeybindingsConfig;
};

const emptyKeybindings: KeybindingsConfig = {
  NEXT_FIELD: [],
  PREV_FIELD: [],
  NEXT_STUDENT_SAME_FIELD: [],
  PREV_STUDENT_SAME_FIELD: [],
};

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
    keybindings: KeybindingsConfig;
  }) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function SettingsModal({ open, config, onClose, onSave, saving, darkMode, onToggleDarkMode }: Props) {
  const [form, setForm] = useState<SettingsForm>({
    baseUrl: '',
    courseId: '',
    accessToken: '',
    keybindings: emptyKeybindings,
  });

  useEffect(() => {
    if (config && open) {
      setForm({
        baseUrl: config.baseUrl || '',
        courseId: config.courseId ? String(config.courseId) : '',
        accessToken: '',
        keybindings: config.keybindings || emptyKeybindings,
      });
    }
  }, [config, open]);

  if (!open) return null;

  const handleKeybindingChange = (action: KeybindingAction, value: string) => {
    const entries = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    setForm((prev) => ({
      ...prev,
      keybindings: {
        ...prev.keybindings,
        [action]: entries,
      },
    }));
  };

  const handleSave = () => {
    const newCourseId = form.courseId ? Number(form.courseId) : null;
    const courseChanged = newCourseId !== config?.courseId;
    
    onSave({
      baseUrl: form.baseUrl.trim(),
      courseId: newCourseId,
      // Clear assignment if course changed
      assignmentId: courseChanged ? null : (config?.assignmentId ?? null),
      accessToken: form.accessToken ? form.accessToken : undefined,
      keybindings: form.keybindings,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-3xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Settings</h2>
          <button
            className="text-sm text-slate-500 transition hover:text-slate-900 dark:hover:text-slate-100"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        {/* Theme toggle */}
        <div className="mt-4 flex items-center justify-between rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-slate-600 dark:text-slate-400">
              {darkMode ? 'dark_mode' : 'light_mode'}
            </span>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Dark Mode</span>
          </div>
          <button
            onClick={onToggleDarkMode}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              darkMode ? 'bg-blue-600' : 'bg-slate-300'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                darkMode ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Canvas API settings */}
        <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
          <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">cloud</span>
            Canvas API Connection
          </h3>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              Canvas API base URL
              <input
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                placeholder="https://yourcanvas.instructure.com/api/v1"
                value={form.baseUrl}
                onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              Course ID
              <input
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                placeholder="e.g., 12345"
                value={form.courseId}
                onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
              Canvas access token
              <input
                type="password"
                className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                placeholder={config?.tokenPresent ? 'Token stored (leave blank to keep)' : 'Paste token'}
                value={form.accessToken}
                onChange={(e) => setForm((prev) => ({ ...prev, accessToken: e.target.value }))}
              />
            </label>
          </div>
          <p className="mt-2 text-[10px] text-slate-500 dark:text-slate-400">
            Token is stored locally and never sent to external servers. Course can also be changed via the green selector above the assignment list.
          </p>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-4">
          <h3 className="mb-2 text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">keyboard</span>
            Keyboard shortcuts
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Comma separate multiple keys. Examples: Tab, ArrowDown</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(Object.keys(form.keybindings) as KeybindingAction[]).map((action) => (
              <label key={action} className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-300">
                {action}
                <input
                  className="rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                  value={(form.keybindings[action] || []).join(', ')}
                  onChange={(e) => handleKeybindingChange(action, e.target.value)}
                />
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end">
          <div className="flex gap-2">
            <button
              className="rounded-md border border-slate-300 dark:border-slate-600 px-4 py-2 text-slate-700 dark:text-slate-300 transition hover:border-slate-500 dark:hover:border-slate-400"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-blue-500/30 transition hover:brightness-110 disabled:opacity-60"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

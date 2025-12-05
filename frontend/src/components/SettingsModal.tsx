import { useEffect, useState } from 'react';
import type { KeybindingAction, KeybindingsConfig, PublicConfig, UiSettings, CommentSnippet } from '../types';
import { DEFAULT_UI_SETTINGS } from '../types';

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
  uiSettings: UiSettings;
  onSaveUiSettings: (settings: UiSettings) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

type Tab = 'general' | 'connection' | 'keybindings';

export function SettingsModal({
  open,
  config,
  onClose,
  onSave,
  saving,
  uiSettings,
  onSaveUiSettings,
  darkMode,
  onToggleDarkMode
}: Props) {
  const [activeTab, setActiveTab] = useState<Tab>('general');
  const [form, setForm] = useState({
    baseUrl: '',
    courseId: '',
    accessToken: '',
    keybindings: emptyKeybindings,
  });
  const [localUiSettings, setLocalUiSettings] = useState<UiSettings>(DEFAULT_UI_SETTINGS);
  const [newSnippetLabel, setNewSnippetLabel] = useState('');
  const [newSnippetText, setNewSnippetText] = useState('');
  const [editingSnippetId, setEditingSnippetId] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setForm({
        baseUrl: config?.baseUrl || '',
        courseId: config?.courseId ? String(config.courseId) : '',
        accessToken: '',
        keybindings: config?.keybindings || emptyKeybindings,
      });
      setLocalUiSettings(uiSettings);
    }
  }, [config, open, uiSettings]);

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

  const handleAddSnippet = () => {
    if (!newSnippetLabel.trim() || !newSnippetText.trim()) return;
    const newSnippet: CommentSnippet = {
      id: `snippet-${Date.now()}`,
      label: newSnippetLabel.trim(),
      text: newSnippetText.trim(),
    };
    setLocalUiSettings(prev => ({
      ...prev,
      commentSnippets: [...prev.commentSnippets, newSnippet],
    }));
    setNewSnippetLabel('');
    setNewSnippetText('');
  };

  const handleDeleteSnippet = (id: string) => {
    setLocalUiSettings(prev => ({
      ...prev,
      commentSnippets: prev.commentSnippets.filter(s => s.id !== id),
    }));
  };

  const handleUpdateSnippet = (id: string, field: 'label' | 'text', value: string) => {
    setLocalUiSettings(prev => ({
      ...prev,
      commentSnippets: prev.commentSnippets.map(s =>
        s.id === id ? { ...s, [field]: value } : s
      ),
    }));
  };

  const handleSave = () => {
    // Save Backend Config
    const newCourseId = form.courseId ? Number(form.courseId) : null;
    const courseChanged = newCourseId !== config?.courseId;

    onSave({
      baseUrl: form.baseUrl.trim(),
      courseId: newCourseId,
      assignmentId: courseChanged ? null : (config?.assignmentId ?? null),
      accessToken: form.accessToken ? form.accessToken : undefined,
      keybindings: form.keybindings,
    });

    // Save UI Settings
    onSaveUiSettings(localUiSettings);

    onClose();
  };

  const updateUiSetting = <K extends keyof UiSettings>(key: K, value: UiSettings[K]) => {
    setLocalUiSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-700">
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">settings</span>
            Settings
          </h2>
          <button
            className="p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
            onClick={onClose}
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-6 border-b border-slate-100 dark:border-slate-700">
          {[
            { id: 'general', label: 'General', icon: 'tune' },
            { id: 'connection', label: 'Connection', icon: 'cloud' },
            { id: 'keybindings', label: 'Keybindings', icon: 'keyboard' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as Tab)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === tab.id
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
            >
              <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'general' && (
            <div className="space-y-6">
              {/* Appearance */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">palette</span>
                  Appearance
                </h3>
                <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${darkMode ? 'bg-slate-700 text-yellow-400' : 'bg-blue-100 text-blue-600'}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {darkMode ? 'dark_mode' : 'light_mode'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Dark Mode</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Adjust the interface for low light</div>
                    </div>
                  </div>
                  <button
                    onClick={onToggleDarkMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${darkMode ? 'bg-blue-600' : 'bg-slate-300'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${darkMode ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </section>

              {/* Workflow */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">bolt</span>
                  Workflow
                </h3>
                <div className="space-y-3">
                  {/* Remember Session */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Remember Session</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Restore last assignment & student on launch</div>
                    </div>
                    <button
                      onClick={() => updateUiSetting('rememberSession', !localUiSettings.rememberSession)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localUiSettings.rememberSession ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localUiSettings.rememberSession ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {/* Default PDF Zoom */}
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Default PDF Zoom</span>
                      <select
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                        value={localUiSettings.defaultPdfZoom}
                        onChange={(e) => updateUiSetting('defaultPdfZoom', e.target.value as UiSettings['defaultPdfZoom'])}
                      >
                        <option value="fit-width">Fit to Width</option>
                        <option value="75">75%</option>
                        <option value="100">100%</option>
                        <option value="125">125%</option>
                        <option value="150">150%</option>
                      </select>
                    </label>

                    {/* Auto-Focus Field */}
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Auto-Focus on Student Change</span>
                      <select
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                        value={localUiSettings.autoFocusField}
                        onChange={(e) => updateUiSetting('autoFocusField', e.target.value as UiSettings['autoFocusField'])}
                      >
                        <option value="grade">Grade Field</option>
                        <option value="comment">Comment Field</option>
                        <option value="none">None</option>
                      </select>
                    </label>
                  </div>
                </div>
              </section>

              {/* Display */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">visibility</span>
                  Display
                </h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    {/* Student Name Format */}
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Student Name Format</span>
                      <select
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                        value={localUiSettings.studentNameFormat}
                        onChange={(e) => updateUiSetting('studentNameFormat', e.target.value as UiSettings['studentNameFormat'])}
                      >
                        <option value="first-last">First Last</option>
                        <option value="last-first">Last, First</option>
                      </select>
                    </label>

                    {/* Comment Box Height */}
                    <label className="block">
                      <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Comment Box Height</span>
                      <select
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                        value={localUiSettings.commentBoxHeight}
                        onChange={(e) => updateUiSetting('commentBoxHeight', e.target.value as UiSettings['commentBoxHeight'])}
                      >
                        <option value="small">Small (3 rows)</option>
                        <option value="medium">Medium (5 rows)</option>
                        <option value="large">Large (8 rows)</option>
                      </select>
                    </label>
                  </div>

                  {/* Show Score Percentage */}
                  <div className="flex items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Show Score Percentage</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Display "85/100 (85%)" instead of just points</div>
                    </div>
                    <button
                      onClick={() => updateUiSetting('showScorePercentage', !localUiSettings.showScorePercentage)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localUiSettings.showScorePercentage ? 'bg-blue-600' : 'bg-slate-300'}`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localUiSettings.showScorePercentage ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </div>
                </div>
              </section>

              {/* Grading Stats */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">analytics</span>
                  Grading Stats Panel
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Stats shown in the top-right corner above the PDF viewer
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { key: 'showGradingTimer', label: 'Grading Timer', desc: 'Track session time' },
                    { key: 'showProgressBar', label: 'Progress Bar', desc: 'Graded vs total' },
                    { key: 'showAvgTimePerStudent', label: 'Avg Time/Student', desc: 'Average grading pace' },
                    { key: 'showGradingSpeed', label: 'Grading Speed', desc: 'Students per hour' },
                  ].map((stat) => (
                    <div
                      key={stat.key}
                      className="flex items-center justify-between p-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                    >
                      <div>
                        <div className="text-xs font-medium text-slate-900 dark:text-slate-100">{stat.label}</div>
                        <div className="text-[10px] text-slate-500 dark:text-slate-400">{stat.desc}</div>
                      </div>
                      <button
                        onClick={() => updateUiSetting(stat.key as keyof UiSettings, !localUiSettings[stat.key as keyof UiSettings])}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${localUiSettings[stat.key as keyof UiSettings] ? 'bg-blue-600' : 'bg-slate-300'}`}
                      >
                        <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${localUiSettings[stat.key as keyof UiSettings] ? 'translate-x-5' : 'translate-x-1'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </section>

              {/* Notifications */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">notifications</span>
                  Notifications
                </h3>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Toast Notification Duration</span>
                  <select
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    value={localUiSettings.toastDuration}
                    onChange={(e) => updateUiSetting('toastDuration', Number(e.target.value))}
                  >
                    <option value={0}>Off</option>
                    <option value={3000}>3 seconds</option>
                    <option value={5000}>5 seconds</option>
                    <option value={10000}>10 seconds</option>
                    <option value={-1}>Until dismissed</option>
                  </select>
                </label>
              </section>

              {/* Data */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">database</span>
                  Data & Storage
                </h3>
                <label className="block">
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 block">Max History Entries</span>
                  <select
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    value={localUiSettings.maxHistoryEntries}
                    onChange={(e) => updateUiSetting('maxHistoryEntries', Number(e.target.value))}
                  >
                    <option value={25}>25 entries</option>
                    <option value={50}>50 entries</option>
                    <option value={100}>100 entries</option>
                    <option value={200}>200 entries</option>
                  </select>
                </label>
              </section>

              {/* Demo Mode */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">science</span>
                  Demo Mode
                </h3>
                <div className="flex items-center justify-between p-3 rounded-lg border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-full ${localUiSettings.demoMode ? 'bg-amber-500 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-500'}`}>
                      <span className="material-symbols-outlined text-[20px]">
                        {localUiSettings.demoMode ? 'play_circle' : 'pause_circle'}
                      </span>
                    </div>
                    <div>
                      <div className="text-sm font-medium text-slate-900 dark:text-slate-100">Enable Demo Mode</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">Load mock students for screenshots & testing</div>
                    </div>
                  </div>
                  <button
                    onClick={() => updateUiSetting('demoMode', !localUiSettings.demoMode)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${localUiSettings.demoMode ? 'bg-amber-500' : 'bg-slate-300'}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${localUiSettings.demoMode ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                {localUiSettings.demoMode && (
                  <p className="mt-2 text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">info</span>
                    Demo data will be loaded on next refresh. No real Canvas data will be affected.
                  </p>
                )}
              </section>

              {/* Comment Library */}
              <section>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-3 flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-slate-400">library_books</span>
                  Comment Library
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
                  Save frequently used feedback snippets for quick insertion
                </p>

                {/* Existing Snippets */}
                {localUiSettings.commentSnippets.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {localUiSettings.commentSnippets.map((snippet) => (
                      <div
                        key={snippet.id}
                        className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50"
                      >
                        {editingSnippetId === snippet.id ? (
                          <div className="space-y-2">
                            <input
                              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                              value={snippet.label}
                              onChange={(e) => handleUpdateSnippet(snippet.id, 'label', e.target.value)}
                              placeholder="Label"
                            />
                            <textarea
                              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-2 py-1 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 resize-none"
                              rows={2}
                              value={snippet.text}
                              onChange={(e) => handleUpdateSnippet(snippet.id, 'text', e.target.value)}
                              placeholder="Comment text"
                            />
                            <button
                              onClick={() => setEditingSnippetId(null)}
                              className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Done
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0 flex-1">
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">{snippet.label}</div>
                              <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">{snippet.text}</div>
                            </div>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              <button
                                onClick={() => setEditingSnippetId(snippet.id)}
                                className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              >
                                <span className="material-symbols-outlined text-[16px]">edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteSnippet(snippet.id)}
                                className="p-1 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Snippet */}
                <div className="p-3 rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-900/30">
                  <div className="space-y-2">
                    <input
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                      placeholder="Snippet label (e.g., 'Great work!')"
                      value={newSnippetLabel}
                      onChange={(e) => setNewSnippetLabel(e.target.value)}
                    />
                    <textarea
                      className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 resize-none"
                      rows={2}
                      placeholder="Comment text to insert..."
                      value={newSnippetText}
                      onChange={(e) => setNewSnippetText(e.target.value)}
                    />
                    <button
                      onClick={handleAddSnippet}
                      disabled={!newSnippetLabel.trim() || !newSnippetText.trim()}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="material-symbols-outlined text-[14px]">add</span>
                      Add Snippet
                    </button>
                  </div>
                </div>
              </section>
            </div>
          )}

          {activeTab === 'connection' && (
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 text-sm text-blue-800 dark:text-blue-300">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-[18px] mt-0.5">info</span>
                  <p>
                    These settings connect Grade-Speeder to your Canvas instance. The access token is stored locally in your browser and is never sent to any third-party server.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Canvas API Base URL</span>
                  <input
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    placeholder="https://canvas.instructure.com/api/v1"
                    value={form.baseUrl}
                    onChange={(e) => setForm((prev) => ({ ...prev, baseUrl: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Course ID</span>
                  <input
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    placeholder="e.g., 12345"
                    value={form.courseId}
                    onChange={(e) => setForm((prev) => ({ ...prev, courseId: e.target.value }))}
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">Access Token</span>
                  <input
                    type="password"
                    className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500"
                    placeholder={config?.tokenPresent ? 'Token stored (leave blank to keep)' : 'Paste token'}
                    value={form.accessToken}
                    onChange={(e) => setForm((prev) => ({ ...prev, accessToken: e.target.value }))}
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === 'keybindings' && (
            <div className="space-y-4">
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Customize keyboard shortcuts for faster grading. Separate multiple keys with commas.
              </p>

              <div className="grid grid-cols-1 gap-4">
                {(Object.keys(form.keybindings) as KeybindingAction[]).map((action) => (
                  <div key={action} className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
                    <label className="block">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1 block">
                        {action.replace(/_/g, ' ')}
                      </span>
                      <input
                        className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 px-3 py-2 text-sm text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 font-mono"
                        value={(form.keybindings[action] || []).join(', ')}
                        onChange={(e) => handleKeybindingChange(action, e.target.value)}
                        placeholder="e.g. Ctrl+Enter"
                      />
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-700 flex justify-end gap-3 bg-slate-50 dark:bg-slate-900/50 rounded-b-xl">
          <button
            className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            className="px-6 py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-lg shadow-blue-500/30 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

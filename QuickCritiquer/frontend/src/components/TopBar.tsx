import { useEffect, useRef, useState } from 'react';

export type RightPaneTab = 'preview' | 'details';

interface Props {
  courseName?: string;
  courseCode?: string;
  courseId: number | null;
  baseUrl?: string;
  tokenPresent?: boolean;
  onSaveConfig: (payload: {
    baseUrl: string;
    courseId: number | null;
    assignmentId: number | null;
    accessToken?: string | null;
  }) => void;
  savingConfig: boolean;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export function TopBar({ 
  courseName,
  courseCode,
  courseId,
  baseUrl,
  tokenPresent,
  onSaveConfig,
  savingConfig,
  darkMode,
  onToggleDarkMode,
}: Props) {
  const displayCourse = courseCode || courseName || (courseId ? `Course #${courseId}` : 'No Course');
  
  // Course dropdown state
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [courseIdInput, setCourseIdInput] = useState(courseId?.toString() || '');
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // API Key dropdown state
  const [showApiDropdown, setShowApiDropdown] = useState(false);
  const [apiBaseUrl, setApiBaseUrl] = useState(baseUrl || '');
  const [apiToken, setApiToken] = useState('');
  const apiDropdownRef = useRef<HTMLDivElement>(null);

  // Update inputs when props change
  useEffect(() => {
    setCourseIdInput(courseId?.toString() || '');
  }, [courseId]);

  useEffect(() => {
    setApiBaseUrl(baseUrl || '');
  }, [baseUrl]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setShowCourseDropdown(false);
      }
      if (apiDropdownRef.current && !apiDropdownRef.current.contains(e.target as Node)) {
        setShowApiDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowCourseDropdown(false);
        setShowApiDropdown(false);
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleCourseSubmit = () => {
    const id = parseInt(courseIdInput, 10);
    if (!isNaN(id) && id > 0 && id !== courseId) {
      onSaveConfig({
        baseUrl: baseUrl || '',
        courseId: id,
        assignmentId: null,
      });
    }
    setShowCourseDropdown(false);
  };

  const handleApiSave = () => {
    onSaveConfig({
      baseUrl: apiBaseUrl.trim(),
      courseId: courseId,
      assignmentId: null,
      accessToken: apiToken || undefined,
    });
    setApiToken('');
    setShowApiDropdown(false);
  };
  
  return (
    <div className="flex items-center justify-between gap-6">
      {/* Left side: Branding */}
      <div className="flex-shrink-0">
        
        <div className="text-[18px] font-bold text-blue-700 dark:text-blue-400"><span className="text-[14px] font-semibold text-slate-700 line-through dark:text-slate-400">Canvas Speed Grader</span> <i>Quick Critiquer</i></div>
        
        <div className="text-[12px] text-rose-600 dark:text-rose-400 font-medium"></div>
      </div>

      {/* Right side: Course dropdown + API Key dropdown + Dark mode toggle */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Course/Section dropdown */}
        <div className="relative" ref={courseDropdownRef}>
          <button 
            onClick={() => {
              setShowCourseDropdown(!showCourseDropdown);
              setShowApiDropdown(false);
            }}
            className="flex items-center gap-1 text-[12px] font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition"
          >
            <span className="material-symbols-outlined text-[14px]">school</span>
            <span>{displayCourse}</span>
            <span className="material-symbols-outlined text-[14px]">
              {showCourseDropdown ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {showCourseDropdown && (
            <div className="absolute top-full right-0 mt-1 w-[240px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 p-3">
              <div className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                Switch Course
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={courseIdInput}
                  onChange={(e) => setCourseIdInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCourseSubmit()}
                  placeholder="Course ID"
                  className="flex-1 px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-emerald-400"
                  autoFocus
                />
                <button
                  onClick={handleCourseSubmit}
                  disabled={savingConfig}
                  className="px-2 py-1.5 text-xs font-medium rounded bg-emerald-600 text-white hover:bg-emerald-700 transition disabled:opacity-50"
                >
                  Go
                </button>
              </div>
              <div className="mt-2 text-[9px] text-slate-400 dark:text-slate-500">
                Enter a Canvas course ID to switch courses
              </div>
            </div>
          )}
        </div>

        {/* API Key dropdown */}
        <div className="relative" ref={apiDropdownRef}>
          <button 
            onClick={() => {
              setShowApiDropdown(!showApiDropdown);
              setShowCourseDropdown(false);
            }}
            className="p-1.5 rounded-md text-amber-500 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition"
            title="API Settings"
          >
            
            <span className="material-symbols-outlined text-[18px]">vpn_key</span><span className="text-[10px]">API</span>
            
          </button>

          {showApiDropdown && (
            <div className="absolute top-full right-0 mt-1 w-[300px] rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 p-3">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-symbols-outlined text-[16px] text-amber-500">key</span>
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">Canvas API Connection</span>
              </div>

              <div className="space-y-2">
                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Base URL</span>
                  <input
                    type="text"
                    value={apiBaseUrl}
                    onChange={(e) => setApiBaseUrl(e.target.value)}
                    placeholder="https://canvas.instructure.com/api/v1"
                    className="px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </label>

                <label className="flex flex-col gap-1">
                  <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400">Access Token</span>
                  <input
                    type="password"
                    value={apiToken}
                    onChange={(e) => setApiToken(e.target.value)}
                    placeholder={tokenPresent ? 'Token stored (leave blank to keep)' : 'Paste your token'}
                    className="px-2 py-1.5 text-xs rounded border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </label>
              </div>

              <div className="mt-2 text-[9px] text-slate-400 dark:text-slate-500">
                Token stored locally, never sent externally
              </div>

              <div className="mt-3 flex justify-end gap-2">
                <button
                  onClick={() => setShowApiDropdown(false)}
                  className="px-2 py-1 text-[10px] rounded border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApiSave}
                  disabled={savingConfig}
                  className="px-2 py-1 text-[10px] font-medium rounded bg-blue-600 text-white hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {savingConfig ? 'Saving…' : 'Save'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Dark mode toggle */}
        <button 
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          onClick={onToggleDarkMode}
          title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {darkMode ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </div>
  );
}

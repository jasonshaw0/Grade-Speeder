import { useEffect, useRef, useState } from 'react';

export type RightPaneTab = 'preview' | 'details' | 'rubric';

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
  onShowHistory: () => void;
  onOpenSettings: () => void;
}

export function TopBar({
  courseName,
  courseCode,
  courseId,
  baseUrl,
  onSaveConfig,
  savingConfig,
  darkMode,
  onToggleDarkMode,
  onShowHistory,
  onOpenSettings,
}: Props) {
  const displayCourse = courseCode || courseName || (courseId ? `Course #${courseId}` : 'No Course');

  // Course dropdown state
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [courseIdInput, setCourseIdInput] = useState(courseId?.toString() || '');
  const courseDropdownRef = useRef<HTMLDivElement>(null);

  // Update inputs when props change
  useEffect(() => {
    setCourseIdInput(courseId?.toString() || '');
  }, [courseId]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (courseDropdownRef.current && !courseDropdownRef.current.contains(e.target as Node)) {
        setShowCourseDropdown(false);
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

  return (
    <div className="flex items-center justify-between gap-6">
      {/* Left side: Branding */}
      <div className="flex-shrink-0">
        <div className="text-[18px] font-bold text-blue-700 dark:text-blue-400">SpeedGrader Enhanced</div>
        <div className="text-[12px] text-rose-600 dark:text-rose-400 font-medium"></div>
      </div>

      {/* Right side: Course dropdown + Settings + History + Dark mode */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Course/Section dropdown */}
        <div className="relative" ref={courseDropdownRef}>
          <button
            onClick={() => setShowCourseDropdown(!showCourseDropdown)}
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

        {/* Settings Button */}
        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          onClick={onOpenSettings}
          title="Settings"
        >
          <span className="material-symbols-outlined text-[18px]">settings</span>
        </button>

        {/* History Button */}
        <button
          className="p-1.5 rounded-md text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition"
          onClick={onShowHistory}
          title="View History"
        >
          <span className="material-symbols-outlined text-[18px]">history</span>
        </button>

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

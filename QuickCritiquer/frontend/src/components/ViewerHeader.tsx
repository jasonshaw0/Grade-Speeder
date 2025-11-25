import type { RightPaneTab } from './TopBar';

interface Props {
  studentName?: string;
  groupName?: string | null;
  activeTab: RightPaneTab;
  onTabChange: (tab: RightPaneTab) => void;
}

export function ViewerHeader({ studentName, groupName, activeTab, onTabChange }: Props) {
  return (
    <div className="flex items-center gap-6 px-3 py-2 border-b border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-800/95 flex-shrink-0 ">
      {/* Left: Icon tabs */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <button
          onClick={() => onTabChange('preview')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'preview'
              ? 'bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-500'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
          }`}
          title="Preview submission"
        >
          <div className="flex flex-row items-center gap-1">
            <span className="material-symbols-outlined text-[22px]">preview</span>
            <span className="text-[11px] font-medium">Preview</span>
          </div>
        </button>
        <button
          onClick={() => onTabChange('details')}
          className={`px-3 py-1.5 rounded-lg transition ${
            activeTab === 'details'
              ? 'bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200 dark:from-slate-700 dark:via-slate-600 dark:to-slate-700 text-slate-700 dark:text-slate-200 shadow-sm border border-slate-300 dark:border-slate-500'
              : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-transparent'
          }`}
          title="Assignment details"
        >
          <div className="flex flex-row items-center gap-1">
            <span className="material-symbols-outlined text-[22px]">info</span>
            <span className="text-[11px] font-medium">Details</span>
          </div>
        </button>
      </div>

      {/* Student name - larger */}
      <div className="flex items-center gap-2 min-w-0 flex-1">
        {studentName ? (
          <>
            <span className="text-xl font-bold text-blue-700 dark:text-blue-400 truncate">
              {studentName}
            </span>
            {groupName && (
              <span className="text-[15px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium flex-shrink-0">
                {groupName}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-slate-400 dark:text-slate-500">Select a student</span>
        )}
      </div>
    </div>
  );
}

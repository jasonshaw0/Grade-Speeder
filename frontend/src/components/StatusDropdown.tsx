import { useEffect, useRef, useState } from 'react';
import type { SubmissionStatus } from '../types';

interface Props {
  status: SubmissionStatus;
  secondsLate?: number | null;
  onChange?: (status: SubmissionStatus) => void;
  size?: 'compact' | 'normal' | 'small';
  hideLateTime?: boolean;
}

const statusConfig: Record<SubmissionStatus, { label: string; color: string; bg: string; darkBg: string }> = {
  none: { label: 'None', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-200', darkBg: 'dark:bg-slate-700' },
  late: { label: 'Late', color: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/50' },
  missing: { label: 'Missing', color: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-100', darkBg: 'dark:bg-rose-900/50' },
  excused: { label: 'Excused', color: 'text-violet-700 dark:text-violet-400', bg: 'bg-violet-100', darkBg: 'dark:bg-violet-900/50' },
};

export function StatusDropdown({ status, secondsLate, onChange, size = 'normal', hideLateTime = false }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const config = statusConfig[status];

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Format days late from seconds
  const formatLateTime = (seconds: number) => {
    const days = seconds / 86400;
    if (days < 1) {
      const hours = seconds / 3600;
      return `${hours.toFixed(1)}h`;
    }
    return `${days.toFixed(1)}d`;
  };

  // Don't show dropdown for none status in compact mode (no badge needed)
  if (size === 'compact' && status === 'none') {
    return null;
  }

  return (
    <div ref={dropdownRef} className="relative inline-block">
      <button
        onClick={(e) => {
          e.stopPropagation();
          if (onChange) {
            setIsOpen(!isOpen);
          }
        }}
        className={`text-[10px] px-1.5 py-0.5 rounded font-medium flex items-center gap-1 ${config.bg} ${config.darkBg} ${config.color} ${onChange ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'} transition`}
      >
        <span>{config.label}</span>
        {!hideLateTime && status === 'late' && secondsLate && secondsLate > 0 && (
          <span className="opacity-75">[{formatLateTime(secondsLate)}]</span>
        )}
        {onChange && <span className="material-symbols-outlined text-[10px]">expand_more</span>}
      </button>

      {isOpen && onChange && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 py-1 min-w-[100px]">
          {(Object.keys(statusConfig) as SubmissionStatus[]).map((s) => {
            const opt = statusConfig[s];
            const isActive = s === status;
            return (
              <button
                key={s}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(s);
                  setIsOpen(false);
                }}
                className={`w-full px-3 py-1.5 text-left text-[11px] font-medium flex items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-700 transition ${
                  isActive ? 'bg-slate-50 dark:bg-slate-700' : ''
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${opt.bg} ${opt.darkBg}`} />
                <span className={opt.color}>{opt.label}</span>
                {isActive && (
                  <span className="material-symbols-outlined text-[12px] text-blue-500 ml-auto">check</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

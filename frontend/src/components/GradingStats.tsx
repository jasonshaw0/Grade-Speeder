import { useEffect, useState, useRef } from 'react';
import type { UiSettings, GradingSessionStats } from '../types';

interface Props {
    uiSettings: UiSettings;
    gradedCount: number;
    totalCount: number;
    sessionStats: GradingSessionStats;
    onToggleTimer: () => void;
}

export function GradingStats({
    uiSettings,
    gradedCount,
    totalCount,
    sessionStats,
    onToggleTimer,
}: Props) {
    const [displayTime, setDisplayTime] = useState('00:00:00');
    const intervalRef = useRef<number | null>(null);

    // Update timer display every second when running
    useEffect(() => {
        const updateDisplay = () => {
            let totalMs = sessionStats.totalGradingTimeMs;

            // Add live time if running
            if (sessionStats.isTimerRunning && sessionStats.sessionStartTime) {
                totalMs += Date.now() - sessionStats.sessionStartTime;
            }

            const totalSeconds = Math.floor(totalMs / 1000);
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;

            setDisplayTime(
                `${hours.toString().padStart(2, '0')}:${minutes
                    .toString()
                    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
            );
        };

        updateDisplay();

        if (sessionStats.isTimerRunning) {
            intervalRef.current = window.setInterval(updateDisplay, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [sessionStats]);

    // Calculate derived stats
    const avgTimePerStudent =
        sessionStats.studentsGradedThisSession > 0
            ? sessionStats.totalGradingTimeMs / sessionStats.studentsGradedThisSession / 1000
            : 0;

    const studentsPerHour =
        sessionStats.totalGradingTimeMs > 0
            ? (sessionStats.studentsGradedThisSession / sessionStats.totalGradingTimeMs) * 3600000
            : 0;

    const progressPercent = totalCount > 0 ? (gradedCount / totalCount) * 100 : 0;

    const formatAvgTime = (seconds: number) => {
        if (seconds === 0) return '--';
        if (seconds < 60) return `${Math.round(seconds)}s`;
        const mins = Math.floor(seconds / 60);
        const secs = Math.round(seconds % 60);
        return `${mins}m ${secs}s`;
    };

    const anyVisible =
        uiSettings.showGradingTimer ||
        uiSettings.showProgressBar ||
        uiSettings.showAvgTimePerStudent ||
        uiSettings.showGradingSpeed;

    if (!anyVisible) return null;

    return (
        <div className="flex items-center gap-3 px-3 py-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm">
            {/* Grading Timer */}
            {uiSettings.showGradingTimer && (
                <button
                    onClick={onToggleTimer}
                    className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition ${sessionStats.isTimerRunning
                            ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'
                            : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-600'
                        }`}
                    title={sessionStats.isTimerRunning ? 'Pause timer' : 'Start timer'}
                >
                    <span className="material-symbols-outlined text-[16px]">
                        {sessionStats.isTimerRunning ? 'pause' : 'play_arrow'}
                    </span>
                    <span className="font-mono text-sm font-medium tabular-nums">{displayTime}</span>
                </button>
            )}

            {/* Progress Bar */}
            {uiSettings.showProgressBar && (
                <div className="flex items-center gap-2" title={`${gradedCount} of ${totalCount} graded`}>
                    <div className="w-24 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-500 dark:bg-blue-400 transition-all duration-300"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400 tabular-nums">
                        {gradedCount}/{totalCount}
                    </span>
                </div>
            )}

            {/* Avg Time Per Student */}
            {uiSettings.showAvgTimePerStudent && (
                <div
                    className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"
                    title="Average time per student"
                >
                    <span className="material-symbols-outlined text-[14px]">avg_time</span>
                    <span className="font-medium">{formatAvgTime(avgTimePerStudent)}</span>
                </div>
            )}

            {/* Grading Speed */}
            {uiSettings.showGradingSpeed && (
                <div
                    className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400"
                    title="Students graded per hour"
                >
                    <span className="material-symbols-outlined text-[14px]">speed</span>
                    <span className="font-medium">
                        {studentsPerHour > 0 ? `${studentsPerHour.toFixed(1)}/hr` : '--/hr'}
                    </span>
                </div>
            )}
        </div>
    );
}

import { useState } from 'react';
import type { RubricCriterion } from '../types';

interface Props {
    rubric: RubricCriterion[];
    stats?: Record<string, Record<string, number>>; // criterionId -> ratingId -> count
}

export function RubricInfo({ rubric, stats }: Props) {
    const [expanded, setExpanded] = useState<Record<string, boolean>>({});

    const toggle = (id: string) => {
        setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 text-sm mb-4">
                <span className="material-symbols-outlined text-[18px]">info</span>
                <span>Assignment Rubric</span>
            </div>

            {rubric.map((criterion, idx) => (
                <div
                    key={criterion.id}
                    className="bg-white/60 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden"
                >
                    {/* Criterion header */}
                    <div
                        className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-b border-slate-200 dark:border-slate-600 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                        onClick={() => toggle(criterion.id)}
                    >
                        <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 flex items-center gap-2">
                                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 bg-slate-200 dark:bg-slate-600 rounded px-1.5 py-0.5">
                                    {idx + 1}
                                </span>
                                <h3 className="font-semibold text-slate-800 dark:text-slate-200">
                                    {criterion.description || criterion.short_description}
                                </h3>
                                <span className="material-symbols-outlined text-[16px] text-slate-400">
                                    {expanded[criterion.id] ? 'expand_less' : 'expand_more'}
                                </span>
                            </div>
                            <div className="flex-shrink-0 px-2 py-1 rounded-md bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-semibold text-sm">
                                {criterion.points} pts
                            </div>
                        </div>
                    </div>

                    {/* Expanded Details */}
                    {expanded[criterion.id] && (
                        <div className="px-4 py-3 animate-in fade-in slide-in-from-top-1 duration-200">
                            {criterion.long_description && (
                                <p className="mb-4 text-sm text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded border border-slate-100 dark:border-slate-700">
                                    {criterion.long_description}
                                </p>
                            )}

                            {/* Ratings */}
                            {criterion.ratings && criterion.ratings.length > 0 && (
                                <div>
                                    <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-2">
                                        Rating Scale
                                    </div>
                                    <div className="space-y-2">
                                        {criterion.ratings.map((rating, rIdx) => {
                                            const count = stats?.[criterion.id]?.[rating.id] || 0;
                                            const total = Object.values(stats?.[criterion.id] || {}).reduce((a, b) => a + b, 0);
                                            const percent = total > 0 ? Math.round((count / total) * 100) : 0;

                                            return (
                                                <div
                                                    key={rating.id}
                                                    className="relative flex items-start gap-3 p-2 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700/30 transition overflow-hidden"
                                                >
                                                    {/* Background bar for stats */}
                                                    {count > 0 && (
                                                        <div
                                                            className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 z-0"
                                                            style={{ width: `${percent}%`, transition: 'width 0.5s ease-out' }}
                                                        />
                                                    )}

                                                    <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${rIdx === 0
                                                            ? 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                                                            : rIdx === criterion.ratings!.length - 1
                                                                ? 'bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300'
                                                                : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                                                        }`}>
                                                        {rating.points}
                                                    </div>
                                                    <div className="relative z-10 flex-1 min-w-0">
                                                        <div className="flex items-center justify-between">
                                                            <div className="font-medium text-sm text-slate-800 dark:text-slate-200">
                                                                {rating.description}
                                                            </div>
                                                            {count > 0 && (
                                                                <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-white/50 dark:bg-black/20 px-1.5 py-0.5 rounded">
                                                                    {count} ({percent}%)
                                                                </div>
                                                            )}
                                                        </div>
                                                        {rating.long_description && (
                                                            <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                                                                {rating.long_description}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            ))}

            <div className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-4">
                Total points possible: {rubric.reduce((sum, c) => sum + c.points, 0)}
            </div>
        </div>
    );
}

import type { RubricCriterion } from '../types';

interface Props {
    rubric: RubricCriterion[];
    comments: Record<string, string>;
    onChange: (criterionId: string, comment: string) => void;
}

export function RubricGrid({ rubric, comments, onChange }: Props) {
    return (
        <div className="rubric-grid w-full pb-2">
            <div className="rubric-cell rubric-header sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">Criterion</div>
            <div className="rubric-cell rubric-header sticky top-0 z-10 bg-slate-50 dark:bg-slate-800">Comments</div>

            {rubric.map((criterion) => (
                <div key={criterion.id} className="contents">
                    <div className="rubric-cell flex flex-col gap-1 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-800 dark:text-slate-200 text-sm">{criterion.description || criterion.short_description}</span>
                            {criterion.long_description && (
                                <div className="group relative">
                                    <span className="material-symbols-outlined text-[14px] text-slate-400 cursor-help">info</span>
                                    <div className="absolute left-0 top-full mt-1 w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
                                        {criterion.long_description}
                                    </div>
                                </div>
                            )}
                        </div>
                        <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">{criterion.points} pts</span>

                        {/* Ratings - simplified for grid view */}
                        {criterion.ratings && criterion.ratings.length > 0 && (
                            <div className="mt-1 flex flex-wrap gap-1">
                                {criterion.ratings.map((rating) => (
                                    <div key={rating.id} className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 rounded text-slate-600 dark:text-slate-300" title={rating.long_description || rating.description}>
                                        {rating.points}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="rubric-cell border-b border-slate-100 dark:border-slate-700">
                        <textarea
                            className="glass-input w-full resize-none text-sm h-full min-h-[60px]"
                            placeholder="Add comment..."
                            value={comments[criterion.id] || ''}
                            onChange={(e) => onChange(criterion.id, e.target.value)}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

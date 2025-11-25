import { useEffect, useRef } from 'react';
import { StatusDropdown } from './StatusDropdown';
import type { DraftState, StudentSubmission, SubmissionStatus } from '../types';

interface Props {
  student: StudentSubmission;
  draft: DraftState;
  isActiveStudent: boolean;
  activeField: 'grade' | 'comment';
  onActivate: (field: 'grade' | 'comment') => void;
  onGradeChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onClearStaged?: () => void;
  onStatusChange?: (status: SubmissionStatus) => void;
  showGroups?: boolean;
  isInActiveGroup?: boolean;
  isFirstInGroup?: boolean;
  isLastInGroup?: boolean;
  latePolicy?: {
    lateSubmissionDeductionEnabled: boolean;
    lateSubmissionDeduction: number;
    lateSubmissionInterval: 'day' | 'hour';
    lateSubmissionMinimumPercent: number;
  } | null;
  pointsPossible?: number | null;
}

export function StudentRow({
  student,
  draft,
  isActiveStudent,
  activeField,
  onActivate,
  onGradeChange,
  onCommentChange,
  onClearStaged,
  onStatusChange,
  showGroups,
  isInActiveGroup,
  latePolicy,
  pointsPossible,
}: Props) {
  const gradeRef = useRef<HTMLInputElement>(null);
  const commentRef = useRef<HTMLTextAreaElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const isDirty = draft.gradeDirty || draft.commentDirty || draft.statusDirty;

  // Use draft status (supports manual changes)
  const currentStatus = draft.status;

  // Auto-focus the correct input when selected
  useEffect(() => {
    if (isActiveStudent) {
      if (activeField === 'grade' && gradeRef.current) {
        gradeRef.current.focus();
        gradeRef.current.select();
      } else if (activeField === 'comment' && commentRef.current) {
        commentRef.current.focus();
      }
    }
  }, [isActiveStudent, activeField]);

  // Auto-scroll card into view when selected
  useEffect(() => {
    if (isActiveStudent && cardRef.current) {
      cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isActiveStudent]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Check if the click was specifically on the comment area
    const target = e.target as HTMLElement;
    const isCommentArea = target.closest('[data-field="comment"]');
    onActivate(isCommentArea ? 'comment' : 'grade');
  };

  // Calculate late deduction if applicable
  const calculateLateDeduction = () => {
    if (!latePolicy?.lateSubmissionDeductionEnabled || !student.late || !student.secondsLate || !pointsPossible) {
      return null;
    }
    
    const intervalSeconds = latePolicy.lateSubmissionInterval === 'hour' ? 3600 : 86400;
    const intervals = Math.ceil(student.secondsLate / intervalSeconds);
    const deductionPercent = Math.min(
      intervals * latePolicy.lateSubmissionDeduction,
      100 - (latePolicy.lateSubmissionMinimumPercent || 0)
    );
    const deductionPoints = (deductionPercent / 100) * pointsPossible;
    
    return {
      deductionPercent,
      deductionPoints,
      intervals,
      intervalType: latePolicy.lateSubmissionInterval,
    };
  };

  const lateDeduction = calculateLateDeduction();
  const currentGrade = draft.grade ?? 0;
  const finalGrade = lateDeduction ? Math.max(0, currentGrade - lateDeduction.deductionPoints) : currentGrade;

  // Compact view for non-selected cards
  if (!isActiveStudent) {
    return (
      <div
        ref={cardRef}
        className={`student-card compact flex items-center justify-between gap-1 relative cursor-pointer ${
          showGroups && isInActiveGroup ? 'bg-blue-50/70 dark:bg-blue-900/20' : ''
        }`}
        onClick={handleCardClick}
      >
        {/* Group indicator line on left - continuous blue line */}
        {showGroups && student.groupId && (
          <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400 dark:bg-blue-500 -ml-[1px]" />
        )}
        {student.groupName && (
            <span className="text-[11px] px-1 py-0.5 rounded dark:bg-blue-900/50 text-blue-600 font-semibold dark:text-blue-400 truncate max-w-[80px]">
              #{student.groupName}
            </span>
          )}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          
          <span className="font-semibold text-md text-slate-800 dark:text-slate-200 truncate">{student.userName}</span>
          
          
          {/* Show "Late" text only (no duration) when not selected */}
          {currentStatus === 'late' && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 font-medium">
              Late
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[14px] text-slate-400 dark:text-slate-500">grade</span>
            <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[32px] text-center">
              {draft.grade ?? '—'}
            </span>
          </div>
          {draft.comment && (
            <span className="material-symbols-outlined text-[14px] text-emerald-500 dark:text-emerald-400 filled">comment</span>
          )}
          <span className={`status-dot ${isDirty ? 'status-staged' : 'status-synced'}`} />
        </div>
      </div>
    );
  }

  // Expanded view for selected card
  return (
    <div
      ref={cardRef}
      className={`student-card selected relative ring-2 ring-emerald-400 dark:ring-emerald-500 ${
        showGroups && isInActiveGroup ? 'bg-blue-50 dark:bg-blue-900/30' : 'bg-emerald-50/50 dark:bg-emerald-900/10'
      }`}
      onClick={handleCardClick}
    >
      {/* Group indicator line on left - continuous blue line */}
      {showGroups && student.groupId && (
        <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-blue-400 dark:bg-blue-500 -ml-[1px] rounded-l" />
      )}
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">{student.userName}</span>
            {student.groupName && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 font-medium">
                Group #{student.groupName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 dark:text-slate-400">
            {student.hasSubmission ? (
              <>
                <span className="material-symbols-outlined text-[12px]">schedule</span>
                <span>
                  {student.submittedAt
                    ? new Date(student.submittedAt).toLocaleString()
                    : 'Submitted'}
                </span>
              </>
            ) : (
              <span className="text-slate-400 dark:text-slate-500">No submission</span>
            )}
            <StatusDropdown
              status={currentStatus}
              secondsLate={student.secondsLate}
              onChange={onStatusChange}
              size="normal"
            />
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`status-dot ${isDirty ? 'status-staged' : 'status-synced'}`} />
          <span className={isDirty ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}>
            {isDirty ? 'Staged' : 'Synced'}
          </span>
          {isDirty && onClearStaged && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClearStaged();
              }}
              className="ml-1 p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-rose-500 transition"
              title="Clear staged changes"
            >
              <span className="material-symbols-outlined text-[14px]">close</span>
            </button>
          )}
        </div>
      </div>

      {/* Student comments (if any) */}
      {student.existingComments?.length > 0 && (
        <div className="mb-3 rounded-md border border-blue-100 dark:border-blue-900 bg-blue-50/50 dark:bg-blue-900/30 px-3 py-2 text-xs">
          <div className="flex items-center gap-1 mb-1 font-semibold text-blue-700 dark:text-blue-400">
            <span className="material-symbols-outlined text-[12px]">comment</span>
            Student comment
          </div>
          {student.existingComments.map((c) => (
            <div key={c.id} className="mb-1 last:mb-0">
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{new Date(c.createdAt).toLocaleString()}</div>
              <div className="text-slate-700 dark:text-slate-300">{c.comment}</div>
            </div>
          ))}
        </div>
      )}

      {/* Input fields */}
      <div className="flex gap-3">
        {/* Grade input */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">grade</span>
            Grade
          </label>
          <input
            ref={gradeRef}
            type="text"
            inputMode="numeric"
            className={`grade-input ${activeField === 'grade' ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}
            value={draft.grade ?? ''}
            onChange={(e) => onGradeChange(e.target.value)}
            onFocus={() => onActivate('grade')}
            onClick={(e) => e.stopPropagation()}
            placeholder="—"
          />
          {/* Late deduction display */}
          {lateDeduction && draft.grade && (
            <div className="text-[10px] text-rose-600 dark:text-rose-400 font-medium mt-0.5 whitespace-nowrap">
              <span>- {lateDeduction.deductionPoints.toFixed(1)} pts</span>
              <span className="text-slate-400 dark:text-slate-500 mx-1">({lateDeduction.intervals} {lateDeduction.intervalType}{lateDeduction.intervals !== 1 ? 's' : ''} late)</span>
              <span>= {finalGrade.toFixed(1)}</span>
            </div>
          )}
        </div>

        {/* Comment input */}
        <div className="flex-1 flex flex-col gap-1" data-field="comment">
          <label className="text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wide flex items-center gap-1">
            <span className="material-symbols-outlined text-[12px]">comment</span>
            Comment
          </label>
          <textarea
            ref={commentRef}
            className={`comment-input flex-1 ${activeField === 'comment' ? 'ring-2 ring-blue-300 dark:ring-blue-600' : ''}`}
            value={draft.comment}
            onChange={(e) => onCommentChange(e.target.value)}
            onFocus={() => onActivate('comment')}
            onClick={(e) => e.stopPropagation()}
            placeholder="Add feedback..."
            rows={2}
          />
        </div>
      </div>
    </div>
  );
}

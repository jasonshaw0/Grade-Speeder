import { memo, useEffect, useRef, useState } from 'react';
import { StatusDropdown } from './StatusDropdown';
import { RubricGrid } from './RubricGrid';
import type { DraftState, StudentSubmission, SubmissionStatus, RubricCriterion, UiSettings } from '../types';

interface Props {
   student: StudentSubmission;
   index: number;
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
   dueDate?: string | null;
   pointsPossible?: number | null;
   rubric?: RubricCriterion[] | null;
   showRubric?: boolean;
   onRubricCommentChange?: (criterionId: string, value: string) => void;
   onCopyToGroup?: (comment: string) => void;
   onCopyGradeToGroup?: (grade: number | null) => void;
   uiSettings?: UiSettings;
}

export const StudentRow = memo(function StudentRow({
   student,
   index,
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
   dueDate,
   pointsPossible,
   rubric,
   onRubricCommentChange,
   onCopyToGroup,
   onCopyGradeToGroup,
   uiSettings,
}: Props) {
   const gradeRef = useRef<HTMLInputElement>(null);
   const commentRef = useRef<HTMLTextAreaElement>(null);
   const cardRef = useRef<HTMLDivElement>(null);
   const rubricScrollRef = useRef<HTMLDivElement>(null);
   const [activeTab, setActiveTab] = useState<'comment' | 'rubric'>('comment');
   const [showSnippetMenu, setShowSnippetMenu] = useState(false);

   const isDirty = draft.gradeDirty || draft.commentDirty || draft.statusDirty || draft.rubricCommentsDirty;
   const currentStatus = draft.status;

   // Format student name based on settings
   const formatStudentName = (name: string) => {
      if (uiSettings?.studentNameFormat === 'last-first') {
         const parts = name.trim().split(/\s+/);
         if (parts.length >= 2) {
            const lastName = parts[parts.length - 1];
            const firstName = parts.slice(0, -1).join(' ');
            return `${lastName}, ${firstName}`;
         }
      }
      return name;
   };

   // Get comment box rows based on settings
   const getCommentBoxRows = () => {
      switch (uiSettings?.commentBoxHeight) {
         case 'small': return 2;
         case 'large': return 6;
         case 'medium':
         default: return 3;
      }
   };

   // Auto-focus based on autoFocusField setting
   useEffect(() => {
      if (isActiveStudent && uiSettings?.autoFocusField !== 'none') {
         if (activeField === 'grade' && gradeRef.current) {
            gradeRef.current.focus();
            gradeRef.current.select();
         } else if (activeField === 'comment' && commentRef.current) {
            commentRef.current.focus();
         }
      }
   }, [isActiveStudent, activeField, uiSettings?.autoFocusField]);

   // Auto-scroll
   useEffect(() => {
      if (isActiveStudent && cardRef.current) {
         cardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
   }, [isActiveStudent]);

   const handleCardClick = (e: React.MouseEvent) => {
      const target = e.target as HTMLElement;
      const isCommentArea = target.closest('[data-field="comment"]');
      onActivate(isCommentArea ? 'comment' : 'grade');
   };

   // Late deduction calculation
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
      return { deductionPercent, deductionPoints, intervals, intervalType: latePolicy.lateSubmissionInterval };
   };

   const lateDeduction = calculateLateDeduction();

   // Submission Insight (Early/Late)
   const getSubmissionInsight = () => {
      if (!student.submittedAt) return null;

      const exactTime = new Date(student.submittedAt).toLocaleString('en-US', {
         month: 'short',
         day: 'numeric',
         year: 'numeric',
         hour: 'numeric',
         minute: '2-digit'
      });

      if (student.late && student.secondsLate) {
         const days = Math.floor(student.secondsLate / 86400);
         const hours = Math.floor((student.secondsLate % 86400) / 3600);
         const label = days > 0 ? `${days}d ${hours}h late` : (`${hours < 1 ? `${Math.floor((student.secondsLate % 3600) / 60)}m` : `${hours}h`} late`);
         return { label, exactTime, isLate: true };
      }

      if (dueDate) {
         const due = new Date(dueDate).getTime();
         const submitted = new Date(student.submittedAt).getTime();
         const diff = due - submitted;
         if (diff > 0) {
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(hours / 24);
            const label = days > 0 ? `${days}d early` : (`${hours > 1 ? `${hours}h` : `${Math.floor((diff % 3600000) / 60000)}m`} early`);
            return { label, exactTime, isLate: false };
         }
      }
      return { label: 'Submitted', exactTime, isLate: false };
   };

   const submissionInsight = getSubmissionInsight();

   // Comment Icons
   const hasInstructorComments = student.existingComments.some(c => c.authorId !== student.userId);
   const hasStudentComments = student.existingComments.some(c => c.authorId === student.userId);
   const hasRubricComments = Object.values(draft.rubricComments || {}).some(c => c);

   // Compact View (Unselected)
   if (!isActiveStudent) {
      // In group view, highlight students in the same group as the active student
      let highlightClasses = 'hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700';
      if (isInActiveGroup) {
         highlightClasses = 'bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800';
      }
      if (isDirty) highlightClasses += ' bg-purple-50/30 dark:bg-purple-900/10';

      return (
         <div
            ref={cardRef}
            className={`student-card compact flex items-center justify-between gap-2 py-2 px-3 cursor-pointer transition-all ${highlightClasses}`}
            onClick={handleCardClick}
         >
            <div className="flex items-center gap-3 min-w-0 flex-1">
               {/* Numbering */}
               {showGroups ? (
                  <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50 text-[10px] font-bold text-blue-600 dark:text-blue-300" title={student.groupName || 'No Group'}>
                     {student.groupName ? student.groupName.replace(/\D/g, '') || '#' : '-'}
                  </div>
               ) : (
                  <span className="flex-shrink-0 text-xs text-slate-400 font-mono w-5 text-right">{index}</span>
               )}

               <span className="font-medium text-sm text-slate-700 dark:text-slate-200 truncate">{formatStudentName(student.userName)}</span>

               {/* Grade Display (Moved next to name) */}
               <div className="flex items-center gap-1 ml-2">
                  <span className={`text-sm font-bold ${draft.grade !== null ? 'text-slate-800 dark:text-slate-200' : 'text-slate-300 dark:text-slate-600'}`}>
                     {draft.grade ?? '-'}
                  </span>
                  {pointsPossible && (
                     <span className="text-[9px] text-slate-400">/ {pointsPossible}</span>
                  )}
                  {uiSettings?.showScorePercentage && draft.grade !== null && pointsPossible && pointsPossible > 0 && (
                     <span className="text-[9px] text-slate-400 ml-1">({Math.round((draft.grade / pointsPossible) * 100)}%)</span>
                  )}
               </div>
               {/* Icons (Moved to right) */}
               <div className="flex items-center gap-1 ml-1">
                  {hasInstructorComments && <span className="material-symbols-outlined text-[14px] text-emerald-500" title="Instructor Comments">school</span>}
                  {hasRubricComments && <span className="material-symbols-outlined text-[14px] text-blue-500" title="Rubric Comments">fact_check</span>}
                  {hasStudentComments && <span className="material-symbols-outlined text-[1px] text-slate-400" title="Student Comments">person_raised_hand</span>}
                  {draft.comment && <span className="material-symbols-outlined text-[14px] text-emerald-500 filled" title="Draft Comment">comment</span>}
               </div>
            </div>



            {/* Staged Changes Badge */}
            {isDirty && (

               <>{onClearStaged && (
                  <button onClick={(e) => { e.stopPropagation(); onClearStaged(); }} className="hover:text-purple-800">
                     <div className="flex items-center gap-1 text-[16px] text-purple-600 dark:text-purple-400 font-medium bg-purple-700/15 dark:bg-purple-900/20 px-2 py-0.3 rounded-full">
                        <span className="material-symbols-outlined text-[16px]">edit_note</span>
                        {(draft.gradeDirty ? 1 : 0) + (draft.commentDirty ? 1 : 0) + (draft.statusDirty ? 1 : 0) + (draft.rubricCommentsDirty ? 1 : 0)}
                        {onClearStaged && (
                           <button onClick={(e) => { e.stopPropagation(); onClearStaged(); }} className="ml-0.5 hover:text-purple-800">
                              <span className="material-symbols-outlined text-[12px]">close</span>
                           </button>
                        )}
                     </div>
                  </button>
               )}
               </>
            )
            }
         </div >


      );

   }



   // Expanded View (Selected)
   return (
      <div
         ref={cardRef}
         className={`student-card selected relative rounded-lg shadow-sm border-2 border-blue-500 dark:border-blue-400 bg-white dark:bg-slate-800 my-2 overflow-hidden`}
         onClick={handleCardClick}
      >
         {/* Header Area */}
         <div className="bg-slate-50 dark:bg-slate-800/50 px-3 py-2 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between gap-3">
            {showGroups ? (
               <div className="flex-shrink-0 w-5 h-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                  {student.groupName ? student.groupName.replace(/\D/g, '') || '#' : '-'}
               </div>
            ) : (
               <span className="flex-shrink-0 text-sm text-slate-400 font-mono font-bold">#{index}</span>
            )}
            <div className="flex items-center gap-2 min-w-0 flex-1 flex-wrap">
               {/* Numbering */}

               <div className="font-bold text-slate-800 dark:text-slate-100 truncate text-base">{formatStudentName(student.userName)}</div>
               {/* Grade Entry & Icons */}
               <div className="flex items-center gap-3">
                  {/* Grade Input */}
                  <div className="flex flex-col items-end gap-1">
                     <div className="flex items-center gap-2">
                        <input
                           ref={gradeRef}
                           type="text"
                           inputMode="numeric"
                           className={`w-20 text-right font-bold text-lg rounded px-2 py-1 outline-none transition-all ${activeField === 'grade'
                              ? 'bg-white dark:bg-slate-900 border-2 border-blue-500 ring-2 ring-blue-500/20'
                              : 'bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:border-slate-400'
                              }`}
                           value={draft.grade ?? ''}
                           onChange={(e) => onGradeChange(e.target.value)}
                           onFocus={() => onActivate('grade')}
                           onClick={(e) => e.stopPropagation()}
                           placeholder="-"
                        />
                        <span className="text-xs text-slate-400 font-medium pt-1">/ {pointsPossible || 0}</span>
                        {uiSettings?.showScorePercentage && draft.grade !== null && pointsPossible && pointsPossible > 0 && (
                           <span className="text-xs text-slate-400 font-medium pt-1 ml-1">({Math.round((draft.grade / pointsPossible) * 100)}%)</span>
                        )}
                     </div>
                     {lateDeduction && draft.grade && (
                        <div className="text-[9px] text-rose-500 font-medium">
                           -{lateDeduction.deductionPoints.toFixed(1)} (Late)
                        </div>
                     )}
                     {/* Copy Grade to Group Button */}
                     {showGroups && onCopyGradeToGroup && draft.grade !== null && (
                        <button
                           onClick={(e) => { e.stopPropagation(); onCopyGradeToGroup(draft.grade); }}
                           className="text-[9px] flex items-center gap-0.5 text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 px-1 py-0.5 rounded transition"
                        >
                           <span className="material-symbols-outlined text-[10px]">content_copy</span>
                           Copy to Group
                        </button>
                     )}
                  </div>

               </div>

               {/* Submission Info */}
               {student.hasSubmission ? (
                  <div className="group relative flex items-center">
                     <span className={`flex items-center gap-1 text-[13px] px-1.5 py-0.5 rounded font-bold ${submissionInsight?.isLate
                        ? 'text-amber-700 dark:text-amber-400'
                        : 'text-emerald-700 dark:text-emerald-400'
                        }`}>
                        <span className="material-symbols-outlined text-[12px]">schedule</span>
                        {submissionInsight?.label}
                     </span>
                     {/* Tooltip with exact time */}
                     <div className="absolute left-0 top-full mt-1 px-2 py-1 bg-slate-800 text-white text-[10px] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 whitespace-nowrap">
                        {submissionInsight?.exactTime}
                     </div>
                  </div>
               ) : (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 flex items-center gap-1">
                     <span className="material-symbols-outlined text-[12px]">warning</span>
                     Missing
                  </span>

               )}


               {/* Status Dropdown (Moved next to submission time) */}
               <StatusDropdown
                  status={currentStatus}
                  secondsLate={student.secondsLate}
                  onChange={onStatusChange}
                  size="small"
                  hideLateTime={true}
               />



            </div>
            {/* Staged Changes Badge */}
            {isDirty && (
               <div className="flex items-center gap-1 text-[16px] text-purple-600 dark:text-purple-400 font-medium bg-purple-700/15 dark:bg-purple-900/20 px-2 py-0.3 rounded-full">
                  <span className="material-symbols-outlined text-[16px]">edit_note</span>
                  {(draft.gradeDirty ? 1 : 0) + (draft.commentDirty ? 1 : 0) + (draft.statusDirty ? 1 : 0) + (draft.rubricCommentsDirty ? 1 : 0)}
                  {onClearStaged && (
                     <button onClick={(e) => { e.stopPropagation(); onClearStaged(); }} className="ml-0.5 hover:text-purple-800">
                        <span className="material-symbols-outlined text-[12px]">close</span>
                     </button>
                  )}
               </div>
            )}


         </div>


         {/* Body Area with Tabs */}
         <div className="flex flex-col">
            {/* Tab Bar - only show if rubric exists */}
            {rubric && rubric.length > 0 && (
               <div className="flex border-b border-slate-200 dark:border-slate-700 px-3">
                  <button
                     onClick={(e) => { e.stopPropagation(); setActiveTab('comment'); }}
                     className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${activeTab === 'comment'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                  >
                     <span className="material-symbols-outlined text-[14px]">comment</span>
                     Comments
                     {draft.comment && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                  </button>
                  <button
                     onClick={(e) => { e.stopPropagation(); setActiveTab('rubric'); }}
                     className={`px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors flex items-center gap-1.5 ${activeTab === 'rubric'
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                  >
                     <span className="material-symbols-outlined text-[14px]">fact_check</span>
                     Rubric
                     {hasRubricComments && <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>}
                  </button>
               </div>
            )}

            {/* Tab Content */}
            <div className="p-3">
               {/* Comment Tab */}
               {(activeTab === 'comment' || !rubric || rubric.length === 0) && (
                  <div className="space-y-3">
                     {/* Comment Input - Now ABOVE existing comments */}
                     <div className="flex flex-col gap-1" data-field="comment">
                        <div className="relative">
                           <textarea
                              ref={commentRef}
                              className={`w-full text-sm p-2 rounded-md border bg-white dark:bg-slate-900 transition-all outline-none resize-none ${activeField === 'comment'
                                 ? 'border-blue-400 ring-1 ring-blue-400/20'
                                 : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                 }`}
                              value={draft.comment}
                              onChange={(e) => onCommentChange(e.target.value)}
                              onFocus={() => onActivate('comment')}
                              onClick={(e) => e.stopPropagation()}
                              placeholder="Add feedback..."
                              rows={getCommentBoxRows()}
                           />
                           {/* Insert Snippet Button */}
                           {uiSettings?.commentSnippets && uiSettings.commentSnippets.length > 0 && (
                              <div className="absolute right-2 top-2">
                                 <button
                                    onClick={(e) => { e.stopPropagation(); setShowSnippetMenu(!showSnippetMenu); }}
                                    className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
                                    title="Insert snippet"
                                 >
                                    <span className="material-symbols-outlined text-[16px]">post_add</span>
                                 </button>
                                 {/* Snippet Menu Dropdown */}
                                 {showSnippetMenu && (
                                    <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 z-50 max-h-48 overflow-y-auto">
                                       <div className="p-1">
                                          {uiSettings.commentSnippets.map((snippet) => (
                                             <button
                                                key={snippet.id}
                                                onClick={(e) => {
                                                   e.stopPropagation();
                                                   // Insert snippet at cursor or append to end
                                                   const textarea = commentRef.current;
                                                   if (textarea) {
                                                      const start = textarea.selectionStart;
                                                      const end = textarea.selectionEnd;
                                                      const newValue = draft.comment.substring(0, start) + snippet.text + draft.comment.substring(end);
                                                      onCommentChange(newValue);
                                                      // Move cursor after inserted text
                                                      setTimeout(() => {
                                                         textarea.focus();
                                                         textarea.setSelectionRange(start + snippet.text.length, start + snippet.text.length);
                                                      }, 0);
                                                   } else {
                                                      onCommentChange(draft.comment + (draft.comment ? ' ' : '') + snippet.text);
                                                   }
                                                   setShowSnippetMenu(false);
                                                }}
                                                className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                                             >
                                                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{snippet.label}</div>
                                                <div className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{snippet.text}</div>
                                             </button>
                                          ))}
                                       </div>
                                    </div>
                                 )}
                              </div>
                           )}
                        </div>
                        {showGroups && onCopyToGroup && draft.comment && (
                           <button
                              onClick={(e) => { e.stopPropagation(); onCopyToGroup(draft.comment); }}
                              className="self-end text-[10px] flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium px-2 py-1 rounded hover:bg-blue-50 dark:hover:bg-blue-900/30 transition"
                           >
                              <span className="material-symbols-outlined text-[12px]">content_copy</span>
                              Copy to Group
                           </button>
                        )}
                     </div>

                     {/* Existing Comments - Now BELOW input */}
                     {student.existingComments?.length > 0 && (
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1 scroll-area">
                           <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium uppercase tracking-wide">Previous Comments</div>
                           {student.existingComments.map((c) => (
                              <div key={c.id} className={`text-xs p-2 rounded border ${c.authorId === student.userId
                                 ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                 : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-800'
                                 }`}>
                                 <div className="flex items-center justify-between mb-1 opacity-70">
                                    <span className="font-semibold flex items-center gap-1">
                                       <span className="material-symbols-outlined text-[10px]">
                                          {c.authorId === student.userId ? 'person' : 'school'}
                                       </span>
                                       {c.authorName}
                                    </span>
                                    <span className="text-[9px]">{new Date(c.createdAt).toLocaleDateString()}</span>
                                 </div>
                                 <div className="text-slate-700 dark:text-slate-300 leading-relaxed">{c.comment}</div>
                              </div>
                           ))}
                        </div>
                     )}
                  </div>
               )}

               {/* Rubric Tab - with hover-scroll like PDF */}
               {activeTab === 'rubric' && rubric && rubric.length > 0 && (
                  <div
                     ref={rubricScrollRef}
                     className="max-h-72 overflow-y-auto scroll-area pb-2"
                     onClick={(e) => e.stopPropagation()}
                  >
                     <RubricGrid
                        rubric={rubric}
                        comments={draft.rubricComments || {}}
                        onChange={(criterionId, value) => onRubricCommentChange?.(criterionId, value)}
                     />
                  </div>
               )}
            </div>
         </div>
      </div>
   );
});

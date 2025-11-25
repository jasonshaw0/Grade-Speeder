import { useEffect, useRef, useState } from 'react';
import type { AssignmentInfo } from '../types';

interface Props {
  assignments: AssignmentInfo[];
  selectedId: number | null;
  courseId: number | null;
  courseName: string;
  onSelect: (assignment: AssignmentInfo) => void;
  onClose: () => void;
  onChangeCourseId: (courseId: number) => void;
  loading?: boolean;
}

export function AssignmentPicker({ 
  assignments, 
  selectedId, 
  courseId,
  courseName,
  onSelect, 
  onClose, 
  onChangeCourseId,
  loading 
}: Props) {
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseIdInput, setCourseIdInput] = useState(courseId?.toString() || '');

  // Update course ID input when courseId prop changes
  useEffect(() => {
    setCourseIdInput(courseId?.toString() || '');
  }, [courseId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const filteredAssignments = assignments.filter((a) =>
    a.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.moduleName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return 'No due date';
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  // Determine assignment status for color-coding
  const getAssignmentStatus = (assignment: AssignmentInfo) => {
    const now = new Date();
    const dueDate = assignment.dueAt ? new Date(assignment.dueAt) : null;
    
    // Fully graded = all submissions have grades
    const isFullyGraded = assignment.submissionCount > 0 && assignment.gradedCount >= assignment.submissionCount;
    
    if (isFullyGraded) {
      return 'graded'; // Grey - done grading
    }
    
    if (!dueDate) {
      return 'upcoming'; // Green - no due date set
    }
    
    if (dueDate > now) {
      return 'upcoming'; // Green - due date is in the future
    }
    
    return 'past'; // Yellow - past due date, not fully graded
  };

  // Get color classes based on status
  const getStatusColors = (status: string, isSelected: boolean) => {
    if (isSelected) {
      return {
        bg: 'bg-blue-50 dark:bg-blue-900/20',
        text: 'text-blue-600 dark:text-blue-400',
        indicator: 'bg-blue-500',
      };
    }
    
    switch (status) {
      case 'graded':
        return {
          bg: '',
          text: 'text-slate-400 dark:text-slate-500',
          indicator: 'bg-slate-400',
        };
      case 'past':
        return {
          bg: '',
          text: 'text-amber-700 dark:text-amber-400',
          indicator: 'bg-amber-500',
        };
      case 'upcoming':
      default:
        return {
          bg: '',
          text: 'text-emerald-700 dark:text-emerald-400',
          indicator: 'bg-emerald-500',
        };
    }
  };

  const handleCourseIdSubmit = () => {
    const id = parseInt(courseIdInput, 10);
    if (!isNaN(id) && id > 0 && id !== courseId) {
      onChangeCourseId(id);
    }
  };

  return (
    <div
      ref={dropdownRef}
      className="absolute top-full right-0 mt-1 w-[400px] max-h-[700px] overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-xl z-50 flex flex-col"
    >
      {/* Course ID header */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700 bg-emerald-50/50 dark:bg-emerald-900/20">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400">school</span>
          <input
            type="text"
            value={courseIdInput}
            onChange={(e) => setCourseIdInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCourseIdSubmit()}
            onBlur={handleCourseIdSubmit}
            placeholder="Course ID"
            className="flex-1 px-2 py-1 text-[11px] rounded border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-700 text-emerald-700 dark:text-emerald-300 font-semibold outline-none focus:ring-1 focus:ring-emerald-400"
          />
          <span className="text-[10px] text-slate-400 dark:text-slate-500 truncate max-w-[150px]" title={courseName}>
            {courseName}
          </span>
        </div>
      </div>

      {/* Search header */}
      <div className="p-2 border-b border-slate-200 dark:border-slate-700">
        <div className="relative">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-slate-400">
            search
          </span>
          <input
            type="text"
            placeholder="Search assignments..."
            className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 dark:border-slate-600 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>
      </div>

      {/* Assignment list */}
      <div className="flex-1 overflow-y-auto scroll-area">
        {loading ? (
          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
            <span className="material-symbols-outlined animate-spin text-[20px]">refresh</span>
            <div className="mt-1">Loading assignments...</div>
          </div>
        ) : filteredAssignments.length === 0 ? (
          <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
            No assignments found
          </div>
        ) : (
          filteredAssignments.map((assignment) => {
            const isSelected = assignment.id === selectedId;
            const status = getAssignmentStatus(assignment);
            const colors = getStatusColors(status, isSelected);
            
            return (
              <button
                key={assignment.id}
                onClick={() => onSelect(assignment)}
                className={`w-full px-3 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-700/50 transition border-b border-slate-100 dark:border-slate-700/50 last:border-b-0 ${colors.bg}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    {/* Module name */}
                    {assignment.moduleName && (
                      <div className="text-[10px] font-medium text-slate-400 dark:text-slate-500 uppercase tracking-wide truncate mb-0.5">
                        {assignment.moduleName}
                      </div>
                    )}
                    {/* Assignment name with status color */}
                    <div className="flex items-center gap-2">
                      <span className={`w-1.5 h-1.5 rounded-full ${colors.indicator} flex-shrink-0`} />
                      <span className={`text-sm font-medium truncate ${colors.text}`}>
                        {assignment.name}
                      </span>
                    </div>
                    {/* Due date and points as subtext */}
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-slate-500 dark:text-slate-400 pl-3.5">
                      <span className="flex items-center gap-0.5">
                        <span className="material-symbols-outlined text-[11px]">schedule</span>
                        {formatDate(assignment.dueAt)}
                      </span>
                      {assignment.pointsPossible !== null && (
                        <span>{assignment.pointsPossible} pts</span>
                      )}
                    </div>
                  </div>
                  {/* Submission stats */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                      <span className="text-slate-500 dark:text-slate-400">{assignment.submissionCount}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span className="text-slate-500 dark:text-slate-400">{assignment.gradedCount}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

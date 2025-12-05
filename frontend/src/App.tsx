import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchConfig, fetchSubmissions, fetchAssignments, saveConfig, syncSubmissions, createInitialDrafts, buildAttachmentUrl } from './api';
import { AssignmentDetails } from './components/AssignmentDetails';
import { AssignmentPicker } from './components/AssignmentPicker';
import { PdfViewer } from './components/PdfViewer';
import { StudentRow } from './components/StudentRow';
import { TopBar, type RightPaneTab } from './components/TopBar';
import { ViewerHeader } from './components/ViewerHeader';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import type { AssignmentInfo, DraftState, PublicConfig, SubmissionsResponse } from './types';

function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);

  // Dark mode state with localStorage persistence
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('quickcritiquer-dark-mode');
    return saved === 'true';
  });

  // Apply dark mode class to document
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('quickcritiquer-dark-mode', String(darkMode));
  }, [darkMode]);

  const [submissionsResponse, setSubmissionsResponse] = useState<SubmissionsResponse | null>(null);
  
  // Group sorting toggle
  const [groupSortEnabled, setGroupSortEnabled] = useState(false);
  const [drafts, setDrafts] = useState<Record<number, DraftState>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<'grade' | 'comment'>('grade');

  // Assignment picker state
  const [assignments, setAssignments] = useState<AssignmentInfo[]>([]);
  const [loadingAssignments, setLoadingAssignments] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Resizable divider state - default to ~40% of typical screen width
  const [leftPanelRatio, setLeftPanelRatio] = useState(0.4);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Tab state for right pane
  const [rightPaneTab, setRightPaneTab] = useState<RightPaneTab>('preview');

  // Assignment picker state in student list header
  const [showAssignmentPicker, setShowAssignmentPicker] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const cfg = await fetchConfig();
        setConfig(cfg);
      } catch (err: any) {
        setError(err.message || 'Failed to load config');
      }
    };
    load();
  }, []);

  const loadSubmissions = useCallback(async () => {
    setLoadingSubmissions(true);
    setError(null);
    setMessage(null);
    try {
      const data = await fetchSubmissions();
      setSubmissionsResponse(data);
      setDrafts(createInitialDrafts(data.submissions));
      // Set active to first student by userId
      setActiveUserId(data.submissions[0]?.userId ?? null);
      setActiveField('grade');
      setLastSyncTime(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  }, []);

  // Load assignments for the assignment picker
  const loadAssignments = useCallback(async () => {
    setLoadingAssignments(true);
    try {
      const data = await fetchAssignments();
      setAssignments(data.assignments);
    } catch (err: any) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoadingAssignments(false);
    }
  }, []);

  useEffect(() => {
    if (!config) return;
    if (!config.baseUrl || !config.courseId || !config.assignmentId) return;
    loadSubmissions();
  }, [config, loadSubmissions]);

  // Load assignments when config is available
  useEffect(() => {
    if (!config) return;
    if (!config.baseUrl || !config.courseId) return;
    loadAssignments();
  }, [config, loadAssignments]);

  const submissions = submissionsResponse?.submissions || [];
  const hasGroups = submissionsResponse?.hasGroups || false;
  const latePolicy = submissionsResponse?.latePolicy || null;
  const pointsPossible = submissionsResponse?.pointsPossible || null;
  
  // Sort students: staged at top (alphabetically), then rest (alphabetically or by group)
  // Key fix: The currently active student stays in place (not moved to staged) until they're deselected
  const sortedSubmissions = useMemo(() => {
    const getLastName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : parts[0];
    };
    
    let sorted = [...submissions];
    
    if (groupSortEnabled && hasGroups) {
      // Sort by group name first, then by last name within group
      sorted.sort((a, b) => {
        const groupA = a.groupName || 'zzz'; // No group goes last
        const groupB = b.groupName || 'zzz';
        if (groupA !== groupB) {
          return groupA.localeCompare(groupB);
        }
        return getLastName(a.userName).localeCompare(getLastName(b.userName));
      });
    } else {
      sorted.sort((a, b) => {
        return getLastName(a.userName).localeCompare(getLastName(b.userName));
      });
    }
    
    // Separate into staged and non-staged, but keep active student in their natural position
    const staged = sorted.filter((s) => {
      const isDirty = drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty;
      // Don't move the currently active student to staged section
      return isDirty && s.userId !== activeUserId;
    });
    const nonStaged = sorted.filter((s) => {
      const isDirty = drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty;
      // Keep non-dirty students AND the currently active student in the normal list
      return !isDirty || s.userId === activeUserId;
    });
    
    return [...staged, ...nonStaged];
  }, [submissions, drafts, groupSortEnabled, hasGroups, activeUserId]);
  
  // Check if there's a divider needed (both staged and non-staged exist)
  const hasStagedDivider = useMemo(() => {
    const stagedCount = sortedSubmissions.filter((s) => drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty).length;
    return stagedCount > 0 && stagedCount < sortedSubmissions.length;
  }, [sortedSubmissions, drafts]);
  
  const stagedCount = useMemo(() => {
    return sortedSubmissions.filter((s) => drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty).length;
  }, [sortedSubmissions, drafts]);
  
  // Compute activeIndex from activeUserId (userId is the source of truth)
  const computedActiveIndex = useMemo(() => {
    if (activeUserId === null) return 0;
    const idx = sortedSubmissions.findIndex(s => s.userId === activeUserId);
    return idx >= 0 ? idx : 0;
  }, [sortedSubmissions, activeUserId]);
  
  const activeStudent = sortedSubmissions[computedActiveIndex];

  // Handle resizable divider drag
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      if (!containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const newRatio = (e.clientX - containerRect.left) / containerWidth;
      // Clamp between 25% and 60%
      setLeftPanelRatio(Math.max(0.25, Math.min(0.6, newRatio)));
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isDragging]);

  const updateDraft = (userId: number, changes: Partial<DraftState>) => {
    setDrafts((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const next = { ...current, ...changes };
      next.gradeDirty = next.grade !== current.baseGrade;
      next.commentDirty = next.comment !== current.baseComment;
      next.synced = !(next.gradeDirty || next.commentDirty);
      return { ...prev, [userId]: next };
    });
  };

  const handleGradeChange = (userId: number, value: string) => {
    const num = value === '' ? null : Number(value);
    if (value !== '' && Number.isNaN(num)) return;
    updateDraft(userId, { grade: num });
  };

  const handleCommentChange = (userId: number, value: string) => {
    updateDraft(userId, { comment: value });
  };

  const handleStatusChange = (userId: number, status: import('./types').SubmissionStatus) => {
    setDrafts((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const next = { ...current, status, statusDirty: status !== current.baseStatus };
      next.synced = !(next.gradeDirty || next.commentDirty || next.statusDirty);
      return { ...prev, [userId]: next };
    });
  };

  const nextField = useCallback(() => {
    if (sortedSubmissions.length === 0) return;
    const idx = computedActiveIndex;
    const fieldIndex = activeField === 'grade' ? 0 : 1;
    const global = idx * 2 + fieldIndex;
    const next = Math.min(global + 1, sortedSubmissions.length * 2 - 1);
    const nextStudentIdx = Math.floor(next / 2);
    const nextFieldType: 'grade' | 'comment' = next % 2 === 0 ? 'grade' : 'comment';
    setActiveUserId(sortedSubmissions[nextStudentIdx]?.userId ?? null);
    setActiveField(nextFieldType);
  }, [activeField, computedActiveIndex, sortedSubmissions]);

  const prevField = useCallback(() => {
    if (sortedSubmissions.length === 0) return;
    const idx = computedActiveIndex;
    const fieldIndex = activeField === 'grade' ? 0 : 1;
    const global = idx * 2 + fieldIndex;
    const prev = Math.max(global - 1, 0);
    const prevStudentIdx = Math.floor(prev / 2);
    const prevFieldType: 'grade' | 'comment' = prev % 2 === 0 ? 'grade' : 'comment';
    setActiveUserId(sortedSubmissions[prevStudentIdx]?.userId ?? null);
    setActiveField(prevFieldType);
  }, [activeField, computedActiveIndex, sortedSubmissions]);

  const nextStudentSameField = useCallback(() => {
    if (sortedSubmissions.length === 0) return;
    const nextIdx = Math.min(computedActiveIndex + 1, sortedSubmissions.length - 1);
    setActiveUserId(sortedSubmissions[nextIdx]?.userId ?? null);
  }, [computedActiveIndex, sortedSubmissions]);

  const prevStudentSameField = useCallback(() => {
    if (sortedSubmissions.length === 0) return;
    const prevIdx = Math.max(computedActiveIndex - 1, 0);
    setActiveUserId(sortedSubmissions[prevIdx]?.userId ?? null);
  }, [computedActiveIndex, sortedSubmissions]);

  useKeyboardNavigation(
    config?.keybindings || null,
    {
      nextField,
      prevField,
      nextStudentSameField,
      prevStudentSameField,
    },
    true,
  );

  const stats = useMemo(() => {
    const total = sortedSubmissions.length;
    const withSubmission = sortedSubmissions.filter((s) => s.hasSubmission).length;
    const graded = sortedSubmissions.filter((s) => drafts[s.userId]?.grade !== null).length;
    const dirty = sortedSubmissions.filter((s) => drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty).length;
    return { total, withSubmission, graded, dirty };
  }, [drafts, sortedSubmissions]);

  const handleSaveConfig = async (payload: {
    baseUrl: string;
    courseId: number | null;
    assignmentId: number | null;
    accessToken?: string | null;
  }) => {
    setSettingsSaving(true);
    setError(null);
    try {
      const courseChanged = payload.courseId !== config?.courseId;
      const updated = await saveConfig({ 
        ...payload, 
        keybindings: config?.keybindings || { 
          NEXT_FIELD: ['Tab'], 
          PREV_FIELD: ['Shift+Tab'],
          NEXT_STUDENT_SAME_FIELD: ['ArrowDown'],
          PREV_STUDENT_SAME_FIELD: ['ArrowUp']
        } 
      });
      setConfig(updated);
      
      // If course changed, clear submissions and show appropriate message
      if (courseChanged) {
        setSubmissionsResponse(null);
        setAssignments([]);
        setMessage('Course changed. Select an assignment to load submissions.');
      } else {
        setMessage('Config saved');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to save config');
    } finally {
      setSettingsSaving(false);
    }
  };

  const handleSync = async () => {
    if (!sortedSubmissions.length) return;
    const updates = sortedSubmissions
      .map((s) => {
        const draft = drafts[s.userId];
        if (!draft) return null;
        return {
          userId: s.userId,
          gradeChanged: draft.gradeDirty,
          newGrade: draft.grade,
          commentChanged: draft.commentDirty,
          newComment: draft.comment,
        };
      })
      .filter(Boolean) as any[];

    const toSend = updates.filter((u) => u.gradeChanged || u.commentChanged);
    if (toSend.length === 0) {
      setMessage('No staged changes to sync');
      return;
    }

    setSyncing(true);
    setError(null);
    try {
      const result = await syncSubmissions(toSend);
      const successIds = result.results.filter((r) => r.success).map((r) => r.userId);
      setDrafts((prev) => {
        const next: Record<number, DraftState> = { ...prev };
        successIds.forEach((id) => {
          const current = next[id];
          if (!current) return;
          next[id] = {
            ...current,
            baseGrade: current.grade,
            baseComment: current.comment,
            gradeDirty: false,
            commentDirty: false,
            synced: true,
          };
        });
        return next;
      });
      const failures = result.results.filter((r) => !r.success);
      if (failures.length) {
        setError(`Synced ${successIds.length} students. ${failures.length} failed.`);
      } else {
        setMessage(`Synced ${successIds.length} students.`);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to sync changes');
    } finally {
      setSyncing(false);
    }
  };

  const activeAttachments = activeStudent?.attachments || [];
  const activePdf = activeAttachments.find((a) => a.isPdf);
  const nonPdf = activeAttachments.filter((a) => !a.isPdf);
  // Simple PDF URL without hash params that might interfere
  const pdfUrl = activePdf ? buildAttachmentUrl(activePdf.localViewUrl) : '';

  const hasConfig = Boolean(config?.baseUrl && config.courseId && config.assignmentId);

  // Format last sync time
  const formatSyncTime = (date: Date | null) => {
    if (!date) return '';
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString();
  };

  // Handle assignment selection from picker
  const handleSelectAssignment = async (assignment: AssignmentInfo) => {
    if (!config) return;
    setSettingsSaving(true);
    try {
      const updated = await saveConfig({ ...config, assignmentId: assignment.id });
      setConfig(updated);
      // Submissions will auto-load via the useEffect
    } catch (err: any) {
      setError(err.message || 'Failed to switch assignment');
    } finally {
      setSettingsSaving(false);
    }
  };

  // Clear all staged changes
  const handleClearAllStaged = () => {
    setDrafts((prev) => {
      const next: Record<number, DraftState> = {};
      Object.entries(prev).forEach(([key, draft]) => {
        next[Number(key)] = {
          ...draft,
          grade: draft.baseGrade,
          comment: draft.baseComment,
          status: draft.baseStatus,
          gradeDirty: false,
          commentDirty: false,
          statusDirty: false,
          synced: true,
        };
      });
      return next;
    });
    setMessage('Cleared all staged changes');
  };

  // Clear staged changes for a specific student
  const handleClearStudentStaged = (userId: number) => {
    setDrafts((prev) => {
      const draft = prev[userId];
      if (!draft) return prev;
      return {
        ...prev,
        [userId]: {
          ...draft,
          grade: draft.baseGrade,
          comment: draft.baseComment,
          status: draft.baseStatus,
          gradeDirty: false,
          commentDirty: false,
          statusDirty: false,
          synced: true,
        },
      };
    });
  };

  // Handle course ID change from TopBar
  const handleChangeCourseId = async (newCourseId: number) => {
    if (!config) return;
    setSettingsSaving(true);
    setError(null);
    try {
      const updated = await saveConfig({ ...config, courseId: newCourseId, assignmentId: null });
      setConfig(updated);
      setSubmissionsResponse(null);
      setAssignments([]);
      setMessage('Switched to new course. Select an assignment.');
    } catch (err: any) {
      setError(err.message || 'Failed to switch course');
    } finally {
      setSettingsSaving(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-[var(--bg-primary)] text-slate-900 dark:text-slate-100 px-12 py-4">
      {/* Main content area with resizable panels */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden gap-0">
        {/* Left panel: Header + Student list */}
        <div
          className="flex flex-col"
          style={{ width: `${leftPanelRatio * 100}%`, flexShrink: 0 }}
        >
          {/* Header section - only above left panel */}
          <div className="pr-3 pb-2">
            <TopBar
              courseName={submissionsResponse?.courseName}
              courseCode={submissionsResponse?.courseCode}
              courseId={submissionsResponse?.courseId ?? config?.courseId ?? null}
              baseUrl={config?.baseUrl}
              tokenPresent={config?.tokenPresent}
              onSaveConfig={handleSaveConfig}
              savingConfig={settingsSaving}
              darkMode={darkMode}
              onToggleDarkMode={() => setDarkMode(prev => !prev)}
            />
            {(message || error) && (
              <div
                className={`mt-2 rounded-lg border px-3 py-2 text-xs ${
                  error 
                    ? 'border-rose-300 dark:border-rose-800 bg-rose-50 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300' 
                    : 'border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300'
                }`}
              >
                {error || message}
              </div>
            )}
            {!hasConfig && (
              <div className="mt-2 rounded-lg border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/50 px-3 py-2 text-xs text-amber-800 dark:text-amber-300">
                Canvas configuration missing. Open settings to configure.
              </div>
            )}
          </div>

          {/* Student list */}
          <div className="flex-1 overflow-hidden pr-3 pb-3 ml-3">
            <div className="panel h-full flex flex-col">
              {/* Header bar - taller with better spacing */}
              <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-700 flex items-center gap-3">
                
                {/* Groups toggle - far left */}
                <button
                  onClick={() => setGroupSortEnabled((prev) => !prev)}
                  className={`p-1.5 rounded transition flex-shrink-0 ${
                    groupSortEnabled
                      ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300'
                      : 'text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                  title={groupSortEnabled ? 'Disable group sorting' : 'Sort by groups'}
                >
                  <span className="material-symbols-outlined text-[20px]">groups</span>
                </button>

                {/* Fetch - icon with timestamp */}
                <button 
                  className="flex flex-col items-center text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition disabled:opacity-50 flex-shrink-0"
                  onClick={loadSubmissions}
                  disabled={loadingSubmissions}
                  title="Fetch submissions from Canvas"
                >
                  <span className={`material-symbols-outlined text-[20px] ${loadingSubmissions ? 'animate-spin' : ''}`}>
                    {loadingSubmissions ? 'progress_activity' : 'sync'}
                  </span>
                  <span className="text-[9px] font-medium">
                    {lastSyncTime ? formatSyncTime(lastSyncTime) : 'fetch'}
                  </span>
                </button>

                {/* Stats */}
                <div className="flex items-center gap-3 text-[11px]">
                  <div className="flex items-center gap-1" title="Total students">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stats.total}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Submitted">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stats.withSubmission}</span>
                  </div>
                  <div className="flex items-center gap-1" title="Graded">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span className="text-slate-600 dark:text-slate-400 font-medium">{stats.graded}</span>
                  </div>
                  {stats.dirty > 0 && (
                    <div className="flex items-center gap-1 pl-2 border-l border-slate-200 dark:border-slate-600">
                      <span className="w-2 h-2 rounded-full bg-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-semibold">{stats.dirty}</span>
                      <button
                        onClick={handleClearAllStaged}
                        className="ml-0.5 p-0.5 rounded hover:bg-rose-100 dark:hover:bg-rose-900/30 text-rose-500 dark:text-rose-400 transition"
                        title="Clear all staged changes"
                      >
                        <span className="material-symbols-outlined text-[12px]">close</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Commit button - only shown when changes are staged */}
                {stats.dirty > 0 && (
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-gradient-to-br from-amber-200 via-amber-100 to-amber-200 dark:from-amber-800/60 dark:via-amber-700/40 dark:to-amber-800/60 border border-amber-400 dark:border-amber-600 text-amber-800 dark:text-amber-200 hover:from-amber-300 hover:via-amber-200 hover:to-amber-300 dark:hover:from-amber-700/70 dark:hover:via-amber-600/50 dark:hover:to-amber-700/70 transition shadow-sm disabled:opacity-50 flex-shrink-0"
                    onClick={handleSync}
                    disabled={syncing}
                    title="Push staged changes to Canvas"
                  >
                    <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>
                      {syncing ? 'progress_activity' : 'commit'}
                    </span>
                    <span className="text-[11px] font-semibold">Commit</span>
                  </button>
                )}

                {/* Assignment text - right aligned, truncates */}
                <div className="relative flex-1 min-w-0 flex justify-end">
                  <button 
                    onClick={() => setShowAssignmentPicker(!showAssignmentPicker)}
                    className="flex items-center gap-1 text-right max-w-full hover:opacity-80 transition"
                  >
                    <div className="min-w-0 text-right">
                      <div className="text-[12px] font-bold text-blue-600 dark:text-blue-400 truncate" title={submissionsResponse?.assignmentName || 'Select Assignment'}>
                        {submissionsResponse?.assignmentName || (config?.assignmentId ? `Assignment #${config.assignmentId}` : 'Select Assignment')}
                      </div>
                      {(submissionsResponse?.dueAt || pointsPossible != null) && (
                        <div className="text-[10px] text-amber-600 dark:text-amber-400 truncate">
                          {submissionsResponse?.dueAt && (
                            <span>Due: {new Date(submissionsResponse.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                          )}
                          {submissionsResponse?.dueAt && pointsPossible != null && <span className="mx-1">•</span>}
                          {pointsPossible != null && <span>{pointsPossible} pts</span>}
                        </div>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-[16px] text-slate-400 flex-shrink-0">
                      {showAssignmentPicker ? 'expand_less' : 'expand_more'}
                    </span>
                  </button>
                  
                  {showAssignmentPicker && (
                    <AssignmentPicker
                      assignments={assignments}
                      selectedId={config?.assignmentId ?? null}
                      courseId={submissionsResponse?.courseId ?? config?.courseId ?? null}
                      courseName={submissionsResponse?.courseCode || submissionsResponse?.courseName || (config?.courseId ? `Course #${config.courseId}` : 'No Course')}
                      onSelect={(assignment) => {
                        handleSelectAssignment(assignment);
                        setShowAssignmentPicker(false);
                      }}
                      onClose={() => setShowAssignmentPicker(false)}
                      onChangeCourseId={handleChangeCourseId}
                      loading={loadingAssignments}
                    />
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-y-auto scroll-area p-2 space-y-1.5">
                {loadingSubmissions && (
                  <div className="flex flex-col items-center justify-center py-8 gap-3">
                    <span className="material-symbols-outlined text-[28px] text-blue-500 animate-spin">progress_activity</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400">Loading submissions...</span>
                  </div>
                )}
                {!loadingSubmissions && sortedSubmissions.length === 0 && (
                  <div className="flex flex-col items-center justify-center py-8 gap-2 text-slate-400">
                    <span className="material-symbols-outlined text-[28px]">inbox</span>
                    <span className="text-xs">No submissions loaded</span>
                  </div>
                )}
                {!loadingSubmissions && sortedSubmissions.map((student, idx) => {
                  const draft = drafts[student.userId] || {
                    grade: student.score ?? null,
                    comment: '',
                    baseGrade: student.score ?? null,
                    baseComment: '',
                    gradeDirty: false,
                    commentDirty: false,
                    synced: true,
                  };
                  const isDirty = draft.gradeDirty || draft.commentDirty || draft.statusDirty;
                  // Show divider after last staged student
                  const showDivider = hasStagedDivider && isDirty && idx === stagedCount - 1;
                  
                  // Group-related calculations
                  const activeStudentGroupId = activeStudent?.groupId;
                  const isInActiveGroup = groupSortEnabled && hasGroups && student.groupId != null && student.groupId === activeStudentGroupId;
                  
                  // For group dividers - check if this is first/last in their group
                  const prevStudent = idx > 0 ? sortedSubmissions[idx - 1] : null;
                  const nextStudent = idx < sortedSubmissions.length - 1 ? sortedSubmissions[idx + 1] : null;
                  const isFirstInGroup = groupSortEnabled && hasGroups && student.groupId != null && 
                    (prevStudent?.groupId !== student.groupId);
                  const isLastInGroup = groupSortEnabled && hasGroups && student.groupId != null && 
                    (nextStudent?.groupId !== student.groupId);
                  
                  // Show group divider when group changes (and not in staged section)
                  const showGroupDivider = groupSortEnabled && hasGroups && isFirstInGroup && !isDirty && 
                    prevStudent && !drafts[prevStudent.userId]?.gradeDirty && !drafts[prevStudent.userId]?.commentDirty && !drafts[prevStudent.userId]?.statusDirty;
                  
                  return (
                    <div key={student.userId}>
                      {showGroupDivider && (
                        <div className="my-2 flex items-center gap-2">
                          <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800" />
                          <span className="text-[10px] text-blue-500 dark:text-blue-400 font-medium">{student.groupName}</span>
                          <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800" />
                        </div>
                      )}
                      <StudentRow
                        student={student}
                        draft={draft}
                        isActiveStudent={idx === computedActiveIndex}
                        activeField={idx === computedActiveIndex ? activeField : 'grade'}
                        onActivate={(field) => {
                          setActiveUserId(student.userId);
                          setActiveField(field);
                        }}
                        onGradeChange={(value) => handleGradeChange(student.userId, value)}
                        onCommentChange={(value) => handleCommentChange(student.userId, value)}
                        onClearStaged={() => handleClearStudentStaged(student.userId)}
                        onStatusChange={(status) => handleStatusChange(student.userId, status)}
                        showGroups={groupSortEnabled && hasGroups}
                        isInActiveGroup={isInActiveGroup}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        latePolicy={latePolicy}
                        pointsPossible={pointsPossible}
                      />
                      {showDivider && (
                        <div className="my-2 flex items-center gap-2">
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wide">Synced</span>
                          <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Resizable divider */}
        <div
          className={`resizable-divider ${isDragging ? 'dragging' : ''}`}
          onMouseDown={(e) => { e.preventDefault(); setIsDragging(true); }}
        >
          <span className="divider-icon material-symbols-outlined">drag_indicator</span>
        </div>

        {/* Right panel: PDF viewer or Assignment Details */}
        <div className="flex-1 flex flex-col min-w-0 pl-0">
          {/* ViewerHeader with student name and tabs */}
          <ViewerHeader
            studentName={activeStudent?.userName}
            groupName={groupSortEnabled && hasGroups ? activeStudent?.groupName : undefined}
            activeTab={rightPaneTab}
            onTabChange={setRightPaneTab}
          />
          <div className="panel flex-1 flex flex-col overflow-hidden opacity-80">
            {rightPaneTab === 'details' ? (
              <AssignmentDetails
                baseUrl={config?.baseUrl || ''}
                courseId={submissionsResponse?.courseId ?? config?.courseId ?? null}
                assignmentId={submissionsResponse?.assignmentId ?? config?.assignmentId ?? null}
                assignmentName={submissionsResponse?.assignmentName}
              />
            ) : activeStudent ? (
              activeStudent.hasSubmission ? (
                activePdf ? (
                  <PdfViewer
                    key={pdfUrl}
                    url={pdfUrl}
                    onDownload={() => window.open(pdfUrl, '_blank')}
                  />
                ) : (
                  <div className="flex-1 flex flex-col">
                    <div className="flex-1 flex items-center justify-center bg-slate-100 dark:bg-slate-900">
                      <div className="p-6 text-sm text-slate-700 dark:text-slate-300">
                        <div className="flex items-center gap-2 mb-4">
                          <span className="material-symbols-outlined text-[24px] text-slate-400 dark:text-slate-500">description</span>
                          <span>No PDF available. Download attachments:</span>
                        </div>
                        <ul className="space-y-2">
                          {nonPdf.map((att) => (
                            <li key={att.id}>
                              <a
                                href={buildAttachmentUrl(att.localViewUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 transition"
                              >
                                <span className="material-symbols-outlined text-[16px]">download</span>
                                {att.displayName}
                              </a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                )
              ) : (
                <div className="flex-1 relative">
                  <div className="flex flex-col items-center justify-center h-full bg-slate-100 dark:bg-slate-900 text-slate-400">
                    <span className="material-symbols-outlined text-[48px] mb-2">folder_off</span>
                    <span className="text-sm">No submission for this student</span>
                  </div>
                </div>
              )
            ) : (
              <div className="flex flex-col items-center justify-center h-full bg-slate-100 dark:bg-slate-900 text-slate-400">
                <span className="material-symbols-outlined text-[48px] mb-2">person_search</span>
                <span className="text-sm">Select a student to view their work</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

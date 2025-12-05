import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { fetchConfig, fetchSubmissions, fetchAssignments, saveConfig, syncSubmissions, createInitialDrafts, buildAttachmentUrl } from './api';
import { AssignmentDetails } from './components/AssignmentDetails';
import { AssignmentPicker } from './components/AssignmentPicker';
import { StudentRow } from './components/StudentRow';

// Lazy-load PdfViewer to reduce initial bundle size (~300KB savings)
const PdfViewer = lazy(() => import('./components/PdfViewer'));
import { RubricInfo } from './components/RubricInfo';
import { TopBar, type RightPaneTab } from './components/TopBar';
import { ViewerHeader } from './components/ViewerHeader';
import { HistoryModal } from './components/HistoryModal';
import { SettingsModal } from './components/SettingsModal';
import { GradingStats } from './components/GradingStats';
import { useKeyboardNavigation } from './hooks/useKeyboardNavigation';
import { useHistory } from './hooks/useHistory';
import { useAutoSave, loadAutoSave } from './hooks/useAutoSave';
import type { AssignmentInfo, DraftState, PublicConfig, SubmissionsResponse, UiSettings, GradingSessionStats } from './types';
import { DEFAULT_UI_SETTINGS } from './types';
import { generateMockSubmissions } from './mockData';
function App() {
  const [config, setConfig] = useState<PublicConfig | null>(null);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  // UI Settings with localStorage persistence
  const [uiSettings, setUiSettings] = useState<UiSettings>(() => {
    const saved = localStorage.getItem('grade-speeder-ui-settings');
    if (saved) {
      try {
        return { ...DEFAULT_UI_SETTINGS, ...JSON.parse(saved) };
      } catch {
        return DEFAULT_UI_SETTINGS;
      }
    }
    return DEFAULT_UI_SETTINGS;
  });

  // Grading session stats (not persisted) - timer starts automatically
  const [sessionStats, setSessionStats] = useState<GradingSessionStats>(() => ({
    sessionStartTime: Date.now(),
    totalGradingTimeMs: 0,
    studentsGradedThisSession: 0,
    isTimerRunning: true,
  }));

  // History and Auto-save
  const { history, addEntry, clearHistory } = useHistory(uiSettings.maxHistoryEntries);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

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

  // Save UI settings to localStorage
  const handleSaveUiSettings = useCallback((newSettings: UiSettings) => {
    setUiSettings(newSettings);
    localStorage.setItem('grade-speeder-ui-settings', JSON.stringify(newSettings));
  }, []);

  // Toggle grading timer
  const handleToggleTimer = useCallback(() => {
    setSessionStats(prev => {
      if (prev.isTimerRunning) {
        // Pause: add elapsed time to total
        const elapsed = prev.sessionStartTime ? Date.now() - prev.sessionStartTime : 0;
        return {
          ...prev,
          isTimerRunning: false,
          totalGradingTimeMs: prev.totalGradingTimeMs + elapsed,
          sessionStartTime: null,
        };
      } else {
        // Start/Resume
        return {
          ...prev,
          isTimerRunning: true,
          sessionStartTime: Date.now(),
        };
      }
    });
  }, []);

  // Track when a student is graded (for session stats) - will be wired up to grade changes
  const gradedThisSessionRef = useRef<Set<number>>(new Set());
  const incrementStudentsGraded = useCallback((userId: number, wasGraded: boolean, isNowGraded: boolean) => {
    // Only count when going from ungraded to graded for the first time this session
    if (!wasGraded && isNowGraded && !gradedThisSessionRef.current.has(userId)) {
      gradedThisSessionRef.current.add(userId);
      setSessionStats(prev => ({
        ...prev,
        studentsGradedThisSession: prev.studentsGradedThisSession + 1,
      }));
    }
  }, []);

  const [submissionsResponse, setSubmissionsResponse] = useState<SubmissionsResponse | null>(null);

  // Tab state for student list
  const [activeListTab, setActiveListTab] = useState<'all' | 'graded' | 'ungraded' | 'group' | 'staged'>('all');
  const [drafts, setDrafts] = useState<Record<number, DraftState>>({});
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Auto-dismiss toast messages based on toastDuration setting
  useEffect(() => {
    if ((message || error) && uiSettings.toastDuration > 0) {
      const timer = setTimeout(() => {
        setMessage(null);
        setError(null);
      }, uiSettings.toastDuration);
      return () => clearTimeout(timer);
    }
  }, [message, error, uiSettings.toastDuration]);

  const [activeUserId, setActiveUserId] = useState<number | null>(null);
  const [activeField, setActiveField] = useState<'grade' | 'comment'>('grade');

  // Session restoration (rememberSession setting)
  const sessionRestored = useRef(false);

  // Save session state whenever active user or assignment changes
  useEffect(() => {
    if (uiSettings.rememberSession && config?.assignmentId && activeUserId) {
      const sessionState = {
        assignmentId: config.assignmentId,
        courseId: config.courseId,
        activeUserId,
        activeField,
      };
      localStorage.setItem('grade-speeder-session', JSON.stringify(sessionState));
    }
  }, [uiSettings.rememberSession, config?.assignmentId, config?.courseId, activeUserId, activeField]);

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
  const [sortBy] = useState<'name' | 'submission-date' | 'score'>('name');
  // Commit confirmation modal state
  const [showCommitModal, setShowCommitModal] = useState(false);
  // Student search state
  const [searchQuery, setSearchQuery] = useState('');

  // Auto-save drafts
  useAutoSave(drafts);

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
      // Use mock data if demo mode is enabled
      const data = uiSettings.demoMode ? generateMockSubmissions() : await fetchSubmissions();
      setSubmissionsResponse(data);

      const initialDrafts = createInitialDrafts(data.submissions);

      // Restore auto-saved drafts
      const savedDrafts = loadAutoSave();
      if (savedDrafts) {
        let restoredCount = 0;
        Object.keys(savedDrafts).forEach((key) => {
          const userId = Number(key);
          if (initialDrafts[userId]) {
            // Only restore if dirty
            const saved = savedDrafts[userId];
            if (saved.gradeDirty || saved.commentDirty || saved.statusDirty || saved.rubricCommentsDirty) {
              initialDrafts[userId] = { ...initialDrafts[userId], ...saved };
              restoredCount++;
            }
          }
        });
        if (restoredCount > 0) {
          setMessage(`Restored unsaved drafts for ${restoredCount} students`);
        }
      }

      setDrafts(initialDrafts);

      // Restore session state if rememberSession is enabled and not yet restored
      let restoredActiveUser = false;
      if (uiSettings.rememberSession && !sessionRestored.current) {
        try {
          const savedSession = localStorage.getItem('grade-speeder-session');
          if (savedSession) {
            const session = JSON.parse(savedSession);
            // Only restore if it's the same assignment
            if (session.assignmentId === config?.assignmentId) {
              const userExists = data.submissions.some(s => s.userId === session.activeUserId);
              if (userExists) {
                setActiveUserId(session.activeUserId);
                setActiveField(session.activeField || 'grade');
                restoredActiveUser = true;
                sessionRestored.current = true;
              }
            }
          }
        } catch {
          // Ignore parse errors
        }
      }

      // Set active to first student if not restored
      if (!restoredActiveUser) {
        setActiveUserId(data.submissions[0]?.userId ?? null);
        setActiveField('grade');
      }
      setLastSyncTime(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to fetch submissions');
    } finally {
      setLoadingSubmissions(false);
    }
  }, [uiSettings.demoMode]);

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
    // In demo mode, skip config validation and load mock data
    if (uiSettings.demoMode) {
      loadSubmissions();
      return;
    }
    if (!config) return;
    if (!config.baseUrl || !config.courseId || !config.assignmentId) return;
    loadSubmissions();
  }, [config, loadSubmissions, uiSettings.demoMode]);

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

  // Sort students based on active tab and sort criteria
  const sortedSubmissions = useMemo(() => {
    const getLastName = (name: string) => {
      const parts = name.trim().split(/\s+/);
      return parts.length > 1 ? parts[parts.length - 1] : parts[0];
    };

    let sorted = [...submissions];

    // Apply search filter first
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      sorted = sorted.filter(s =>
        s.userName.toLowerCase().includes(query) ||
        s.groupName?.toLowerCase().includes(query)
      );
    }

    // Filter based on activeListTab
    if (activeListTab === 'graded') {
      sorted = sorted.filter(s => drafts[s.userId]?.grade !== null);
    } else if (activeListTab === 'ungraded') {
      sorted = sorted.filter(s => s.hasSubmission && drafts[s.userId]?.grade === null);
    } else if (activeListTab === 'staged') {
      sorted = sorted.filter(s => drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty || drafts[s.userId]?.rubricCommentsDirty);
    }

    // Apply sorting
    if (sortBy === 'submission-date') {
      sorted.sort((a, b) => {
        if (!a.submittedAt && !b.submittedAt) return 0;
        if (!a.submittedAt) return 1;
        if (!b.submittedAt) return -1;
        return new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime();
      });
    } else if (sortBy === 'score') {
      sorted.sort((a, b) => {
        const scoreA = drafts[a.userId]?.grade ?? -1;
        const scoreB = drafts[b.userId]?.grade ?? -1;
        return scoreB - scoreA;
      });
    } else if (activeListTab === 'group' && hasGroups) {
      // Sort by group name first, then by last name within group
      sorted.sort((a, b) => {
        const groupA = a.groupName || 'zzz'; // No group goes last
        const groupB = b.groupName || 'zzz';
        if (groupA !== groupB) {
          // Try to extract numbers for numeric sorting of groups (e.g. "Group 1", "Group 10", "Group 2")
          const numA = parseInt(groupA.replace(/\D/g, ''), 10);
          const numB = parseInt(groupB.replace(/\D/g, ''), 10);

          if (!isNaN(numA) && !isNaN(numB) && numA !== numB) {
            return numA - numB;
          }
          return groupA.localeCompare(groupB, undefined, { numeric: true, sensitivity: 'base' });
        }
        return getLastName(a.userName).localeCompare(getLastName(b.userName));
      });
    } else {
      sorted.sort((a, b) => {
        return getLastName(a.userName).localeCompare(getLastName(b.userName));
      });
    }

    return sorted;
  }, [submissions, drafts, activeListTab, hasGroups, activeUserId, sortBy, searchQuery]);

  // Calculate Rubric Stats
  const rubricStats = useMemo(() => {
    const stats: Record<string, Record<string, number>> = {};

    submissions.forEach(sub => {
      if (sub.rubricAssessments) {
        Object.entries(sub.rubricAssessments).forEach(([critId, assessment]) => {
          if (assessment.rating_id) {
            if (!stats[critId]) stats[critId] = {};
            stats[critId][assessment.rating_id] = (stats[critId][assessment.rating_id] || 0) + 1;
          }
        });
      }
    });

    return stats;
  }, [submissions]);

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

  const updateDraft = useCallback((userId: number, changes: Partial<DraftState>) => {
    setDrafts((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const next = { ...current, ...changes };
      next.gradeDirty = next.grade !== current.baseGrade;
      next.commentDirty = next.comment !== current.baseComment;
      next.synced = !(next.gradeDirty || next.commentDirty);
      return { ...prev, [userId]: next };
    });
  }, []);

  const handleGradeChange = useCallback((userId: number, value: string) => {
    const num = value === '' ? null : Number(value);
    if (value !== '' && Number.isNaN(num)) return;

    // Track for session stats
    setDrafts(prev => {
      const wasGraded = prev[userId]?.grade !== null;
      const isNowGraded = num !== null;
      incrementStudentsGraded(userId, wasGraded, isNowGraded);
      return prev;
    });

    updateDraft(userId, { grade: num });
  }, [updateDraft, incrementStudentsGraded]);

  const handleCommentChange = useCallback((userId: number, value: string) => {
    updateDraft(userId, { comment: value });
  }, [updateDraft]);

  const handleRubricCommentChange = useCallback((userId: number, criterionId: string, value: string) => {
    setDrafts((prev) => {
      const current = prev[userId];
      if (!current) return prev;

      const newRubricComments = { ...current.rubricComments, [criterionId]: value };
      const next = {
        ...current,
        rubricComments: newRubricComments,
        rubricCommentsDirty: true // Mark as dirty if any rubric comment changes
      };

      // Check if it matches base
      // Note: This simple check might need refinement if we want per-field dirty tracking
      next.synced = !(next.gradeDirty || next.commentDirty || next.statusDirty || next.rubricCommentsDirty);

      return { ...prev, [userId]: next };
    });
  }, []);

  const handleCopyToGroup = useCallback((userId: number, comment: string) => {
    if (!submissionsResponse?.submissions) return;

    // Find the student's group
    const student = submissionsResponse.submissions.find(s => s.userId === userId);
    if (!student || !student.groupId) return;

    // Find all other students in the same group
    const groupMembers = submissionsResponse.submissions.filter(s => s.groupId === student.groupId && s.userId !== userId);

    setDrafts(prev => {
      const next = { ...prev };
      let changed = false;

      groupMembers.forEach(member => {
        const current = next[member.userId];
        if (current) {
          next[member.userId] = {
            ...current,
            comment: comment,
            commentDirty: true,
            synced: false
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [submissionsResponse?.submissions]);

  const handleCopyGradeToGroup = useCallback((userId: number, grade: number | null) => {
    if (!submissionsResponse?.submissions || grade === null) return;

    // Find the student's group
    const student = submissionsResponse.submissions.find(s => s.userId === userId);
    if (!student || !student.groupId) return;

    // Find all other students in the same group
    const groupMembers = submissionsResponse.submissions.filter(s => s.groupId === student.groupId && s.userId !== userId);

    setDrafts(prev => {
      const next = { ...prev };
      let changed = false;

      groupMembers.forEach(member => {
        const current = next[member.userId];
        if (current) {
          next[member.userId] = {
            ...current,
            grade: grade,
            gradeDirty: grade !== current.baseGrade,
            synced: false
          };
          changed = true;
        }
      });

      return changed ? next : prev;
    });
  }, [submissionsResponse?.submissions]);

  const handleStatusChange = useCallback((userId: number, status: import('./types').SubmissionStatus) => {
    setDrafts((prev) => {
      const current = prev[userId];
      if (!current) return prev;
      const next = { ...current, status, statusDirty: status !== current.baseStatus };
      next.synced = !(next.gradeDirty || next.commentDirty || next.statusDirty);
      return { ...prev, [userId]: next };
    });
  }, []);

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
    // Apply autoFocusField setting when navigating to next student
    if (uiSettings.autoFocusField !== 'none') {
      setActiveField(uiSettings.autoFocusField);
    }
  }, [computedActiveIndex, sortedSubmissions, uiSettings.autoFocusField]);

  const prevStudentSameField = useCallback(() => {
    if (sortedSubmissions.length === 0) return;
    const prevIdx = Math.max(computedActiveIndex - 1, 0);
    setActiveUserId(sortedSubmissions[prevIdx]?.userId ?? null);
    // Apply autoFocusField setting when navigating to previous student
    if (uiSettings.autoFocusField !== 'none') {
      setActiveField(uiSettings.autoFocusField);
    }
  }, [computedActiveIndex, sortedSubmissions, uiSettings.autoFocusField]);

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
    const total = submissions.length;
    const withSubmission = submissions.filter((s) => s.hasSubmission).length;
    const graded = submissions.filter((s) => drafts[s.userId]?.grade !== null).length;
    const dirty = submissions.filter((s) => drafts[s.userId]?.gradeDirty || drafts[s.userId]?.commentDirty || drafts[s.userId]?.statusDirty || drafts[s.userId]?.rubricCommentsDirty).length;
    return { total, withSubmission, graded, dirty };
  }, [drafts, submissions]);

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
          rubricCommentsChanged: draft.rubricCommentsDirty,
          newRubricComments: draft.rubricComments,
        };
      })
      .filter(Boolean) as any[];

    const toSend = updates.filter((u) => u.gradeChanged || u.commentChanged || u.rubricCommentsChanged);
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
            statusDirty: false,
            rubricCommentsDirty: false,
            synced: true,
          };
        });
        return next;
      });
      const failures = result.results.filter((r) => !r.success);

      // Record history for successes
      if (successIds.length > 0) {
        const changes = successIds.map(id => {
          const draft = drafts[id];
          const student = submissions.find(s => s.userId === id);
          return {
            userId: id,
            studentName: student?.userName || 'Unknown',
            oldGrade: draft.baseGrade,
            newGrade: draft.grade,
            oldComment: draft.baseComment,
            newComment: draft.comment,
          };
        });

        addEntry({
          summary: `Pushed grades for ${successIds.length} student${successIds.length !== 1 ? 's' : ''}`,
          changes
        });
      }

      if (failures.length) {
        setError(`Synced ${successIds.length} students. ${failures.length} failed.`);
      } else {
        setMessage(`Synced ${successIds.length} students. View History to review.`);
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

  // Format last sync time (returns { display, full } for tooltip support)
  const formatSyncTime = (date: Date | null): { display: string; full: string } => {
    if (!date) return { display: '', full: '' };
    const full = date.toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
    });
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return { display: 'just now', full };
    if (mins < 60) return { display: `${mins}m ago`, full };
    const hours = Math.floor(mins / 60);
    if (hours < 24) return { display: `${hours}h ago`, full };
    return { display: date.toLocaleDateString(), full };
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
  const handleClearAllStaged = useCallback(() => {
    setDrafts((prev) => {
      const next: Record<number, DraftState> = {};
      Object.entries(prev).forEach(([key, draft]) => {
        next[Number(key)] = {
          ...draft,
          grade: draft.baseGrade,
          comment: draft.baseComment,
          status: draft.baseStatus,
          rubricCommentsDirty: false,
          gradeDirty: false,
          commentDirty: false,
          statusDirty: false,
          synced: true,
        };
      });
      return next;
    });
    setMessage('Cleared all staged changes');
  }, []);

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
          rubricCommentsDirty: false,
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
      {/* Demo Mode Banner */}
      {uiSettings.demoMode && (
        <div className="mb-2 px-4 py-2 rounded-lg bg-amber-500 text-white text-sm font-medium flex items-center justify-center gap-2 shadow-md">
          <span className="material-symbols-outlined text-[18px]">science</span>
          Demo Mode Active — Viewing mock data. Changes will not sync to Canvas.
          <button
            onClick={() => handleSaveUiSettings({ ...uiSettings, demoMode: false })}
            className="ml-4 px-2 py-0.5 rounded bg-amber-600 hover:bg-amber-700 text-xs font-bold transition"
          >
            Exit Demo
          </button>
        </div>
      )}
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
              onShowHistory={() => setShowHistoryModal(true)}
              onOpenSettings={() => setShowSettingsModal(true)}
            />
            {(message || error) && (
              <div
                className={`mt-2 rounded-lg border px-3 py-2 text-xs ${error
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
              {/* Header bar - reorganized layout */}
              <div className="px-3 py-3 border-b border-slate-100 dark:border-slate-700 flex flex-col gap-3">
                {/* Top Row: Assignment Title & Assignment Picker */}
                <div className="flex items-center justify-between">
                  <div className="relative flex-1 min-w-0">
                    <button
                      onClick={() => setShowAssignmentPicker(!showAssignmentPicker)}
                      className="flex items-center gap-2 text-left max-w-full hover:opacity-80 transition group"
                    >
                      <div className="min-w-0">
                        <div className="text-[14px] font-bold text-slate-800 dark:text-slate-200 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition" title={submissionsResponse?.assignmentName || 'Select Assignment'}>
                          {submissionsResponse?.assignmentName || (config?.assignmentId ? `Assignment #${config.assignmentId}` : 'Select Assignment')}
                        </div>
                        {submissionsResponse?.dueAt && (
                          <div className="text-[10px] text-slate-500 dark:text-slate-400">
                            Due: {new Date(submissionsResponse.dueAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                          </div>
                        )}
                      </div>
                      <span className="material-symbols-outlined text-[16px] text-slate-400 group-hover:text-blue-500 transition flex-shrink-0">
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

                  {/* Sync/Fetch Button */}
                  <button
                    className="flex items-center gap-1.5 px-2 py-1 rounded text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition disabled:opacity-50"
                    onClick={loadSubmissions}
                    disabled={loadingSubmissions}
                    title={lastSyncTime ? `Last synced: ${formatSyncTime(lastSyncTime).full}` : 'Download submissions from Canvas'}
                  >
                    <span className={`material-symbols-outlined text-[18px] ${loadingSubmissions ? 'animate-spin' : ''}`}>
                      {loadingSubmissions ? 'progress_activity' : 'download'}
                    </span>
                    <span className="text-[10px] font-medium">
                      {lastSyncTime ? formatSyncTime(lastSyncTime).display : 'Fetch'}
                    </span>
                  </button>
                </div>

                {/* Middle Row: Tabs */}
                <div className="flex items-center gap-1 border-b border-slate-100 dark:border-slate-700 pb-0">
                  {[
                    { id: 'all', label: 'Show All', count: stats.total },
                    { id: 'graded', label: 'Graded', count: stats.graded },
                    { id: 'ungraded', label: 'Ungraded', count: stats.withSubmission - stats.graded },
                    { id: 'group', label: 'Group View', count: null },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveListTab(tab.id as any)}
                      className={`relative px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 ${activeListTab === tab.id
                        ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                        : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
                        }`}
                    >
                      {tab.label}
                      {tab.count !== null && (
                        <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeListTab === tab.id
                          ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                          : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                          }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}

                  {/* Staged Tab - Only visible if dirty > 0 */}
                  {stats.dirty > 0 && (
                    <button
                      onClick={() => setActiveListTab('staged')}
                      className={`relative px-3 py-1.5 text-xs font-medium transition-colors border-b-2 -mb-[1px] flex items-center gap-1.5 ml-auto ${activeListTab === 'staged'
                        ? 'border-purple-500 text-purple-600 dark:text-purple-400 bg-purple-200 dark:bg-purple-900/20 rounded'
                        : 'border-transparent text-purple-500 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 rounded'
                        }`}
                    >
                      Staged Updates
                      <span className={`px-1.5 py-0.5 rounded-full text-[9px] ${activeListTab === 'staged'
                        ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                        : 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400'
                        }`}>
                        {stats.dirty}
                      </span>
                    </button>
                  )}
                </div>

                {/* Bottom Row: Actions */}
                <div className="flex items-center justify-between gap-2">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-[200px]">
                    <span className="material-symbols-outlined text-[16px] text-slate-400 absolute left-2 top-1/2 -translate-y-1/2">search</span>
                    <input
                      type="text"
                      placeholder="Search students..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-7 pr-2 py-1 text-xs rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/20"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Clear All Button (Only in Staged tab) */}
                    {activeListTab === 'staged' && stats.dirty > 0 && (
                      <button
                        className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 transition"
                        onClick={handleClearAllStaged}
                        title="Clear all staged changes"
                      >
                        <span className="material-symbols-outlined text-[14px]">clear_all</span>
                        Clear All
                      </button>
                    )}

                    {/* Commit Button (Only in Staged tab) */}
                    {activeListTab === 'staged' && stats.dirty > 0 && (
                      <button
                        className={`flex items-center gap-1 px-1 py-1 rounded-full text-white text-lg font-bold transition shadow-sm disabled:opacity-50 ${uiSettings.demoMode ? 'bg-slate-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'}`}
                        onClick={() => !uiSettings.demoMode && setShowCommitModal(true)}
                        disabled={syncing || uiSettings.demoMode}
                        title={uiSettings.demoMode ? 'Disabled in Demo Mode' : 'Review and commit changes'}
                      >
                        <span className="material-symbols-outlined text-[25px] truncate">commit</span>
                        Review ({stats.dirty})

                      </button>
                    )}
                  </div>
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
                    rubricComments: {},
                    rubricCommentsDirty: false,
                  };

                  // Group-related calculations
                  const activeStudentGroupId = activeStudent?.groupId;
                  const isInActiveGroup = activeListTab === 'group' && hasGroups && student.groupId != null && student.groupId === activeStudentGroupId;

                  // For group dividers - check if this is first/last in their group
                  const prevStudent = idx > 0 ? sortedSubmissions[idx - 1] : null;
                  const nextStudent = idx < sortedSubmissions.length - 1 ? sortedSubmissions[idx + 1] : null;
                  const isFirstInGroup = activeListTab === 'group' && hasGroups && student.groupId != null &&
                    (prevStudent?.groupId !== student.groupId);
                  const isLastInGroup = activeListTab === 'group' && hasGroups && student.groupId != null &&
                    (nextStudent?.groupId !== student.groupId);

                  // Show group divider when group changes
                  const showGroupDivider = activeListTab === 'group' && hasGroups && isFirstInGroup;

                  return (
                    <div key={student.userId}>
                      {showGroupDivider && (
                        <div className="my-2 flex items-center gap-2">
                          <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800" />
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 flex items-center justify-center rounded bg-blue-100 dark:bg-blue-900/50 text-[10px] font-bold text-blue-600 dark:text-blue-300">
                              {student.groupName ? student.groupName.replace(/\D/g, '') || '#' : '-'}
                            </div>
                            <span className="text-[12px] text-blue-500 dark:text-blue-400 font-medium">{student.groupName}</span>
                          </div>
                          <div className="flex-1 h-px bg-blue-200 dark:bg-blue-800" />
                        </div>
                      )}
                      <StudentRow
                        student={student}
                        index={idx + 1}
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
                        showGroups={activeListTab === 'group' && hasGroups}
                        isInActiveGroup={isInActiveGroup}
                        isFirstInGroup={isFirstInGroup}
                        isLastInGroup={isLastInGroup}
                        latePolicy={latePolicy}
                        dueDate={submissionsResponse?.dueAt}
                        pointsPossible={pointsPossible}
                        rubric={submissionsResponse?.rubric}
                        onRubricCommentChange={(criterionId, value) => handleRubricCommentChange(student.userId, criterionId, value)}
                        onCopyToGroup={(comment) => handleCopyToGroup(student.userId, comment)}
                        onCopyGradeToGroup={(grade) => handleCopyGradeToGroup(student.userId, grade)}
                        uiSettings={uiSettings}
                      />
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
          {/* Grading Stats - top right corner */}
          <div className="absolute top-2 right-14 z-10">
            <GradingStats
              uiSettings={uiSettings}
              gradedCount={stats.graded}
              totalCount={stats.total}
              sessionStats={sessionStats}
              onToggleTimer={handleToggleTimer}
            />
          </div>
          {/* ViewerHeader with student name and tabs */}
          <ViewerHeader
            studentName={activeStudent?.userName}
            groupName={activeListTab === 'group' && hasGroups ? activeStudent?.groupName : undefined}
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
            ) : rightPaneTab === 'rubric' ? (
              <div className="flex-1 overflow-y-auto p-4">
                {submissionsResponse?.rubric ? (
                  <RubricInfo rubric={submissionsResponse.rubric} stats={rubricStats} />
                ) : (
                  <div className="text-center text-slate-500 mt-10">No rubric available for this assignment</div>
                )}
              </div>
            ) : activeStudent ? (
              activeStudent.hasSubmission ? (
                activePdf ? (
                  <Suspense fallback={
                    <div className="flex-1 flex items-center justify-center bg-slate-200 dark:bg-slate-900">
                      <div className="flex flex-col items-center gap-3">
                        <span className="material-symbols-outlined text-[32px] text-blue-500 animate-spin">progress_activity</span>
                        <span className="text-sm text-slate-600 dark:text-slate-400">Loading PDF viewer...</span>
                      </div>
                    </div>
                  }>
                    <PdfViewer
                      key={pdfUrl}
                      url={pdfUrl}
                      onDownload={() => window.open(pdfUrl, '_blank')}
                      defaultZoom={uiSettings.defaultPdfZoom}
                    />
                  </Suspense>
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

      <HistoryModal
        open={showHistoryModal}
        history={history}
        onClose={() => setShowHistoryModal(false)}
        onClearHistory={clearHistory}
      />

      <SettingsModal
        open={showSettingsModal}
        config={config}
        saving={settingsSaving}
        onClose={() => setShowSettingsModal(false)}
        onSave={handleSaveConfig}
        uiSettings={uiSettings}
        onSaveUiSettings={handleSaveUiSettings}
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(prev => !prev)}
      />

      {/* Commit Confirmation Modal */}
      {showCommitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-700 w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-purple-600 dark:text-purple-400">commit</span>
                <h3 className="font-semibold text-slate-800 dark:text-slate-200">Commit Changes</h3>
              </div>
              <button
                onClick={() => setShowCommitModal(false)}
                className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Content */}
            <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
                The following changes will be pushed to Canvas:
              </p>
              <div className="space-y-2">
                {sortedSubmissions
                  .filter((s) => {
                    const d = drafts[s.userId];
                    return d?.gradeDirty || d?.commentDirty || d?.statusDirty || d?.rubricCommentsDirty;
                  })
                  .map((student) => {
                    const d = drafts[student.userId];
                    return (
                      <div
                        key={student.userId}
                        className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600"
                      >
                        <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
                          {student.userName}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {d?.gradeDirty && (
                            <span
                              className="flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300"
                              title="Grade changed"
                            >
                              <span className="material-symbols-outlined text-[12px]">grade</span>
                              {d.grade ?? '—'}
                            </span>
                          )}
                          {d?.commentDirty && (
                            <span
                              className="flex items-center text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300"
                              title="Comment changed"
                            >
                              <span className="material-symbols-outlined text-[12px]">comment</span>
                            </span>
                          )}
                          {d?.rubricCommentsDirty && (
                            <span
                              className="flex items-center text-[10px] px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300"
                              title="Rubric comments changed"
                            >
                              <span className="material-symbols-outlined text-[12px]">fact_check</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-700 flex items-center justify-end gap-2">
              <button
                onClick={() => setShowCommitModal(false)}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowCommitModal(false);
                  handleSync();
                }}
                disabled={syncing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition disabled:opacity-50"
              >
                <span className={`material-symbols-outlined text-[16px] ${syncing ? 'animate-spin' : ''}`}>
                  {syncing ? 'progress_activity' : 'cloud_upload'}
                </span>
                Push {stats.dirty} Change{stats.dirty !== 1 ? 's' : ''}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;

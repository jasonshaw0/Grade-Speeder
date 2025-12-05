import type { ReactNode } from 'react';

export type KeybindingAction =
  | 'NEXT_FIELD'
  | 'PREV_FIELD'
  | 'NEXT_STUDENT_SAME_FIELD'
  | 'PREV_STUDENT_SAME_FIELD';

export type KeybindingsConfig = Record<KeybindingAction, string[]>;

export type SubmissionStatus = 'none' | 'late' | 'missing' | 'excused';

export interface PublicConfig {
  baseUrl: string;
  courseId: number | null;
  assignmentId: number | null;
  keybindings: KeybindingsConfig;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
  tokenPresent: boolean;
}

export interface StudentAttachment {
  id: number;
  displayName: string;
  contentType: string;
  size: number;
  isPdf: boolean;
  localViewUrl?: string;
}

export interface SubmissionComment {
  id: number;
  authorId: number;
  authorName: string;
  comment: string;
  createdAt: string;
}

export interface StudentSubmission {
  draftChangesCount: ReactNode;
  userId: number;
  userName: string;
  visibleName?: string; // e.g., "John Doe" without group
  groupId?: number | null;
  groupName?: string | null;
  sortableName?: string;
  hasSubmission: boolean;
  submittedAt?: string | null;
  late?: boolean;
  missing?: boolean;
  excused?: boolean;
  secondsLate?: number;
  score?: number | null;
  grade?: string | null;
  attachments: StudentAttachment[];
  existingComments: SubmissionComment[];
  rubricAssessments?: Record<string, { rating_id: string; comments: string; points: number }>;
}

export interface RubricRating {
  id: string;
  description: string;
  long_description?: string;
  points: number;
}

export interface RubricCriterion {
  id: string;
  description: string;
  short_description?: string;
  long_description?: string;
  points: number;
  ratings?: RubricRating[];
}

export interface SubmissionsResponse {
  submissions: StudentSubmission[];
  assignmentName?: string;
  courseName?: string;
  courseCode?: string;
  courseId: number | null;
  assignmentId: number | null;
  dueAt?: string | null;
  pointsPossible?: number | null;
  latePolicy?: {
    lateSubmissionDeductionEnabled: boolean;
    lateSubmissionDeduction: number; // percentage per interval
    lateSubmissionInterval: 'day' | 'hour';
    lateSubmissionMinimumPercent: number;
  } | null;
  hasGroups?: boolean;
  rubric?: RubricCriterion[] | null;
}

export interface DraftState {
  grade: number | null;
  comment: string;
  baseGrade: number | null;
  baseComment: string;
  gradeDirty: boolean;
  commentDirty: boolean;
  synced: boolean;
  status: SubmissionStatus;
  baseStatus: SubmissionStatus;
  statusDirty: boolean;
  rubricComments: Record<string, string>; // criterionId -> comment
  rubricCommentsDirty: boolean;
}

export interface SubmissionUpdate {
  userId: number;
  gradeChanged: boolean;
  newGrade?: number | null;
  commentChanged: boolean;
  newComment?: string | null;
  statusChanged?: boolean;
  newStatus?: SubmissionStatus;
  rubricCommentsChanged?: boolean;
  newRubricComments?: Record<string, string>;
}

export interface SyncResult {
  userId: number;
  success: boolean;
  errors?: string[];
}

export interface AssignmentInfo {
  id: number;
  name: string;
  dueAt: string | null;
  pointsPossible: number | null;
  moduleName: string | null;
  submissionCount: number;
  gradedCount: number;
}

export interface AssignmentsResponse {
  assignments: AssignmentInfo[];
  courseId: number | null;
}

// ============================================================================
// UI Settings Types
// ============================================================================

export interface CommentSnippet {
  id: string;
  label: string;
  text: string;
}

export interface UiSettings {
  // Workflow
  rememberSession: boolean;
  defaultPdfZoom: 'fit-width' | '75' | '100' | '125' | '150';
  autoFocusField: 'grade' | 'comment' | 'none';

  // Display
  studentNameFormat: 'first-last' | 'last-first';
  showScorePercentage: boolean;
  commentBoxHeight: 'small' | 'medium' | 'large';

  // Notifications
  toastDuration: number; // 0 = off, otherwise ms

  // Grading Stats (top-right panel)
  showGradingTimer: boolean;
  showProgressBar: boolean;
  showAvgTimePerStudent: boolean;
  showGradingSpeed: boolean; // students per hour

  // Data
  maxHistoryEntries: number;

  // Comment Library
  commentSnippets: CommentSnippet[];

  // Demo Mode
  demoMode: boolean;
}

export const DEFAULT_UI_SETTINGS: UiSettings = {
  rememberSession: true,
  defaultPdfZoom: '100',
  autoFocusField: 'grade',
  studentNameFormat: 'first-last',
  showScorePercentage: true,
  commentBoxHeight: 'medium',
  toastDuration: 5000,
  showGradingTimer: true,
  showProgressBar: true,
  showAvgTimePerStudent: true,
  showGradingSpeed: true,
  maxHistoryEntries: 50,
  commentSnippets: [],
  demoMode: false,
};

// Grading session stats (computed at runtime, not persisted)
export interface GradingSessionStats {
  sessionStartTime: number | null; // timestamp when grading started
  totalGradingTimeMs: number; // accumulated grading time
  studentsGradedThisSession: number;
  isTimerRunning: boolean;
}

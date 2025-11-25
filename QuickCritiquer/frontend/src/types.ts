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
  authorName: string;
  comment: string;
  createdAt: string;
}

export interface StudentSubmission {
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
}

export interface SubmissionUpdate {
  userId: number;
  gradeChanged: boolean;
  newGrade?: number | null;
  commentChanged: boolean;
  newComment?: string | null;
  statusChanged?: boolean;
  newStatus?: SubmissionStatus;
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

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export type KeybindingAction =
  | 'NEXT_FIELD'
  | 'PREV_FIELD'
  | 'NEXT_STUDENT_SAME_FIELD'
  | 'PREV_STUDENT_SAME_FIELD';

export type KeybindingsConfig = Record<KeybindingAction, string[]>;

export type SubmissionStatus = 'none' | 'late' | 'missing' | 'excused';

export interface PrivateConfig {
  baseUrl: string;
  courseId: number | null;
  assignmentId: number | null;
  accessToken?: string;
  keybindings: KeybindingsConfig;
  logLevel: LogLevel;
}

export interface PublicConfig {
  baseUrl: string;
  courseId: number | null;
  assignmentId: number | null;
  keybindings: KeybindingsConfig;
  logLevel: LogLevel;
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

export interface LatePolicy {
  lateSubmissionDeductionEnabled: boolean;
  lateSubmissionDeduction: number;
  lateSubmissionInterval: 'day' | 'hour';
  lateSubmissionMinimumPercent: number;
}

export interface StudentSubmission {
  userId: number;
  userName: string;
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

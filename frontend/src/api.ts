import type { AssignmentsResponse, DraftState, PublicConfig, SubmissionUpdate, SubmissionsResponse, SyncResult } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Request failed');
  }

  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function fetchConfig(): Promise<PublicConfig> {
  return request<PublicConfig>('/api/config');
}

export function saveConfig(payload: Partial<PublicConfig> & { accessToken?: string | null }): Promise<PublicConfig> {
  return request<PublicConfig>('/api/config', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export function fetchSubmissions(): Promise<SubmissionsResponse> {
  return request<SubmissionsResponse>('/api/submissions');
}

export function syncSubmissions(updates: SubmissionUpdate[]): Promise<{ results: SyncResult[] }> {
  return request<{ results: SyncResult[] }>('/api/submissions/sync', {
    method: 'POST',
    body: JSON.stringify({ updates }),
  });
}

export function fetchAssignments(): Promise<AssignmentsResponse> {
  return request<AssignmentsResponse>('/api/assignments');
}

export function buildAttachmentUrl(localViewUrl?: string) {
  if (!localViewUrl) return '';
  if (localViewUrl.startsWith('http')) return localViewUrl;
  return `${API_BASE}${localViewUrl}`;
}

export function createInitialDrafts(submissions: SubmissionsResponse['submissions']): Record<number, DraftState> {
  const drafts: Record<number, DraftState> = {};
  submissions.forEach((sub) => {
    // Determine initial status
    let status: 'none' | 'late' | 'missing' | 'excused' = 'none';
    if (sub.excused) status = 'excused';
    else if (sub.missing) status = 'missing';
    else if (sub.late) status = 'late';

    drafts[sub.userId] = {
      grade: sub.score ?? null,
      comment: '',
      baseGrade: sub.score ?? null,
      baseComment: '',
      gradeDirty: false,
      commentDirty: false,
      synced: true,
      status,
      baseStatus: status,
      statusDirty: false,
      rubricComments: sub.rubricAssessments
        ? Object.entries(sub.rubricAssessments).reduce((acc, [key, val]) => ({ ...acc, [key]: val.comments || '' }), {})
        : {},
      rubricCommentsDirty: false,
    };
  });

  return drafts;
}

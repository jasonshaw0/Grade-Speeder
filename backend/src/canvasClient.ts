import axios, { AxiosInstance } from 'axios';
import { LatePolicy, PrivateConfig, StudentSubmission, SubmissionUpdate, SyncResult, RubricCriterion } from './types';
import { log } from './logger';
import qs from 'qs';

function createClient(config: PrivateConfig): AxiosInstance {
  const baseURL = config.baseUrl.replace(/\/$/, '');
  return axios.create({
    baseURL,
    headers: {
      Authorization: `Bearer ${config.accessToken}`,
    },
  });
}

function isPdfAttachment(contentType?: string, displayName?: string): boolean {
  if (!contentType && !displayName) return false;
  if (contentType && contentType.toLowerCase().includes('pdf')) return true;
  if (displayName && displayName.toLowerCase().endsWith('.pdf')) return true;
  return false;
}

function extractNextLink(linkHeader?: string): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(',');
  for (const part of parts) {
    const [urlPart, relPart] = part.split(';').map((p) => p.trim());
    if (relPart && relPart.includes('rel="next"')) {
      return urlPart.replace(/[<>]/g, '');
    }
  }
  return null;
}

async function fetchAllPages<T>(client: AxiosInstance, url: string, params?: Record<string, unknown>): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = url;
  let nextParams: Record<string, unknown> | undefined = params;

  while (nextUrl) {
    const response = await client.get<T[]>(nextUrl, { params: nextParams });
    results.push(...response.data);
    const linkHeader = response.headers['link'] as string | undefined;
    const next = extractNextLink(linkHeader);
    if (next) {
      nextUrl = next;
      nextParams = undefined;
    } else {
      nextUrl = null;
    }
  }

  return results;
}

function normalizeSubmission(
  submission: any,
  groupMap?: Record<number, { id: number; name: string }>,
  userToGroupMap?: Record<number, { groupId: number; groupName: string }>
): StudentSubmission {
  const attachments = Array.isArray(submission.attachments) ? submission.attachments : [];
  const normalizedAttachments = attachments.map((att: any) => ({
    id: att.id,
    displayName: att.display_name || att.filename || 'Attachment',
    contentType: att.content_type || '',
    size: att.size || 0,
    isPdf: isPdfAttachment(att.content_type, att.display_name || att.filename),
    localViewUrl: `/api/submissions/${submission.user_id}/file/${att.id}`,
  }));

  const hasSubmission =
    submission.workflow_state !== 'unsubmitted' ||
    Boolean(submission.submitted_at) ||
    normalizedAttachments.length > 0;

  const comments = Array.isArray(submission.submission_comments) ? submission.submission_comments : [];

  // Get group info - prioritize submission.group (for group assignments), 
  // then fall back to userToGroupMap (for course-level groups)
  const submissionGroupId = submission.group?.id;
  const groupInfo = submissionGroupId && groupMap ? groupMap[submissionGroupId] : null;

  // If no group from submission, check userToGroupMap
  const userGroupInfo = userToGroupMap ? userToGroupMap[submission.user_id] : null;

  const finalGroupId = groupInfo?.id ?? userGroupInfo?.groupId ?? null;
  const finalGroupName = groupInfo?.name ?? submission.group?.name ?? userGroupInfo?.groupName ?? null;

  return {
    userId: submission.user_id,
    userName: submission.user?.name || 'Unknown Student',
    sortableName: submission.user?.sortable_name,
    groupId: finalGroupId,
    groupName: finalGroupName,
    hasSubmission,
    submittedAt: submission.submitted_at,
    late: Boolean(submission.late),
    missing: Boolean(submission.missing),
    excused: Boolean(submission.excused),
    secondsLate: submission.seconds_late || 0,
    score: submission.score,
    grade: submission.grade,
    attachments: normalizedAttachments,
    existingComments: comments.map((c: any) => ({
      id: c.id,
      authorId: c.author_id || 0,
      authorName: c.author_name || 'Unknown',
      comment: c.comment || '',
      createdAt: c.created_at,
    })),
    rubricAssessments: submission.rubric_assessment || {},
  };
}

export async function fetchSubmissions(config: PrivateConfig): Promise<{
  submissions: StudentSubmission[];
  assignmentName?: string;
  courseName?: string;
  courseCode?: string;
  dueAt?: string | null;
  pointsPossible?: number | null;
  latePolicy?: LatePolicy | null;
  hasGroups?: boolean;
  rubric?: RubricCriterion[] | null;
}> {
  const client = createClient(config);
  const path = `/courses/${config.courseId}/assignments/${config.assignmentId}/submissions`;
  const params = {
    per_page: 100,
    include: ['user', 'submission_comments', 'group', 'rubric_assessment'],
    student_ids: ['all'],
  };

  const submissions = await fetchAllPages<any>(client, path, params);

  // Fetch assignment details for due date and points
  let assignmentName: string | undefined;
  let dueAt: string | null = null;
  let pointsPossible: number | null = null;
  let groupCategoryId: number | null = null;
  let rubric: RubricCriterion[] | null = null;

  try {
    const assignmentResp = await client.get(`/courses/${config.courseId}/assignments/${config.assignmentId}`);
    assignmentName = assignmentResp.data?.name;
    dueAt = assignmentResp.data?.due_at || null;
    pointsPossible = assignmentResp.data?.points_possible || null;
    groupCategoryId = assignmentResp.data?.group_category_id || null;
    rubric = assignmentResp.data?.rubric || null;
  } catch (err) {
    log('debug', 'Could not fetch assignment details', {});
  }

  // Fetch late policy and course info
  let latePolicy: LatePolicy | null = null;
  let courseName: string | undefined;
  let courseCode: string | undefined;
  try {
    const courseResp = await client.get(`/courses/${config.courseId}`, {
      params: { include: ['late_policy'] }
    });
    courseName = courseResp.data?.name;
    courseCode = courseResp.data?.course_code;
    const policy = courseResp.data?.late_policy;
    if (policy && policy.late_submission_deduction_enabled) {
      latePolicy = {
        lateSubmissionDeductionEnabled: policy.late_submission_deduction_enabled,
        lateSubmissionDeduction: parseFloat(policy.late_submission_deduction) || 0,
        lateSubmissionInterval: policy.late_submission_interval || 'day',
        lateSubmissionMinimumPercent: parseFloat(policy.late_submission_minimum_percent) || 0,
      };
    }
  } catch (err) {
    log('debug', 'Could not fetch late policy', {});
  }

  // Fetch groups from course level using the direct course groups endpoint
  let groupMap: Record<number, { id: number; name: string }> = {};
  let userToGroupMap: Record<number, { groupId: number; groupName: string }> = {};
  let hasGroups = false;

  try {
    // Use the direct /courses/:course_id/groups endpoint (includes users by default)
    const groups = await fetchAllPages<any>(client, `/courses/${config.courseId}/groups`, {
      per_page: 100,
      include: ['users'],
    });

    for (const group of groups) {
      groupMap[group.id] = { id: group.id, name: group.name };

      // Map each user in the group to their group
      if (group.users && Array.isArray(group.users)) {
        for (const user of group.users) {
          userToGroupMap[user.id] = { groupId: group.id, groupName: group.name };
        }
      }
    }

    hasGroups = Object.keys(groupMap).length > 0;
  } catch (err) {
    log('debug', 'Could not fetch course groups', {});
  }

  const normalized = submissions.map((s) => normalizeSubmission(s, groupMap, userToGroupMap));

  return { submissions: normalized, assignmentName, courseName, courseCode, dueAt, pointsPossible, latePolicy, hasGroups, rubric };
}

export async function fetchFileStream(config: PrivateConfig, fileId: number) {
  const client = createClient(config);
  const fileResp = await client.get(`/files/${fileId}`);
  const downloadUrl: string = fileResp.data?.url;
  if (!downloadUrl) {
    throw new Error('File URL missing from Canvas response');
  }

  // Canvas file URLs are typically pre-signed and don't need auth headers
  // Following redirects and not sending auth to avoid issues
  const streamResp = await axios.get(downloadUrl, {
    responseType: 'stream',
    maxRedirects: 5,
    // Don't send auth header - Canvas URLs are pre-signed
  });

  return {
    stream: streamResp.data,
    contentType: streamResp.headers['content-type'] as string | undefined,
    contentLength: streamResp.headers['content-length'] as string | undefined,
    fileName: fileResp.data?.display_name || fileResp.data?.filename,
  };
}

export async function pushSubmissionUpdates(config: PrivateConfig, updates: SubmissionUpdate[]): Promise<SyncResult[]> {
  const client = createClient(config);
  const results: SyncResult[] = [];

  for (const update of updates) {
    if (!update.gradeChanged && !update.commentChanged && !update.rubricCommentsChanged) {
      results.push({ userId: update.userId, success: true });
      continue;
    }

    const payload: Record<string, any> = {};
    if (update.gradeChanged) {
      payload['submission[posted_grade]'] = update.newGrade === null || update.newGrade === undefined ? null : update.newGrade;
    }
    if (update.commentChanged) {
      payload['comment[text_comment]'] = update.newComment ?? null;
    }
    if (update.rubricCommentsChanged && update.newRubricComments) {
      Object.entries(update.newRubricComments).forEach(([criterionId, comment]) => {
        payload[`rubric_assessment[${criterionId}][comments]`] = comment;
      });
    }

    try {
      const body = qs.stringify(payload);
      await client.put(
        `/courses/${config.courseId}/assignments/${config.assignmentId}/submissions/${update.userId}`,
        body,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
      );
      results.push({ userId: update.userId, success: true });
    } catch (err: any) {
      log('warn', 'Failed to sync submission', { userId: update.userId, status: err?.response?.status });
      results.push({ userId: update.userId, success: false, errors: ['Failed to sync with Canvas'] });
    }
  }

  return results;
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

export async function fetchAssignments(config: PrivateConfig): Promise<AssignmentInfo[]> {
  const client = createClient(config);

  // Fetch all assignments
  const assignments = await fetchAllPages<any>(client, `/courses/${config.courseId}/assignments`, {
    per_page: 100,
    include: ['submission'],
  });

  // Fetch modules to map assignments to module names
  let moduleMap: Record<number, string> = {};
  try {
    const modules = await fetchAllPages<any>(client, `/courses/${config.courseId}/modules`, {
      per_page: 100,
      include: ['items'],
    });

    for (const mod of modules) {
      if (mod.items) {
        for (const item of mod.items) {
          if (item.type === 'Assignment' && item.content_id) {
            moduleMap[item.content_id] = mod.name;
          }
        }
      }
    }
  } catch (err) {
    log('debug', 'Could not fetch modules', {});
  }

  // Fetch submission summaries for each assignment to get counts
  const assignmentsWithStats: AssignmentInfo[] = [];

  for (const assignment of assignments) {
    let submissionCount = 0;
    let gradedCount = 0;

    try {
      // Use submission_summary endpoint if available, otherwise estimate from assignment data
      const summaryResp = await client.get(`/courses/${config.courseId}/assignments/${assignment.id}/submission_summary`);
      submissionCount = summaryResp.data?.graded || 0;
      gradedCount = summaryResp.data?.graded || 0;
      submissionCount = (summaryResp.data?.graded || 0) + (summaryResp.data?.ungraded || 0);
    } catch (err) {
      // Fallback - just use 0s
      log('debug', 'Could not fetch submission summary', { assignmentId: assignment.id });
    }

    assignmentsWithStats.push({
      id: assignment.id,
      name: assignment.name,
      dueAt: assignment.due_at,
      pointsPossible: assignment.points_possible,
      moduleName: moduleMap[assignment.id] || null,
      submissionCount,
      gradedCount,
    });
  }

  // Sort by due date, latest first (null dates at the end)
  assignmentsWithStats.sort((a, b) => {
    if (!a.dueAt && !b.dueAt) return 0;
    if (!a.dueAt) return 1;
    if (!b.dueAt) return -1;
    return new Date(b.dueAt).getTime() - new Date(a.dueAt).getTime();
  });

  return assignmentsWithStats;
}

export interface AssignmentDetails {
  id: number;
  name: string;
  description: string | null;
  dueAt: string | null;
  pointsPossible: number | null;
  rubric: Array<{
    id: string;
    description: string;
    points: number;
    ratings?: Array<{
      id: string;
      description: string;
      points: number;
    }>;
  }> | null;
  submissionTypes: string[];
}

export async function fetchAssignmentDetails(config: PrivateConfig): Promise<AssignmentDetails> {
  const client = createClient(config);

  const response = await client.get(`/courses/${config.courseId}/assignments/${config.assignmentId}`);
  const assignment = response.data;

  return {
    id: assignment.id,
    name: assignment.name,
    description: assignment.description || null,
    dueAt: assignment.due_at || null,
    pointsPossible: assignment.points_possible || null,
    rubric: assignment.rubric || null,
    submissionTypes: assignment.submission_types || [],
  };
}

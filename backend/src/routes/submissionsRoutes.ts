import { Router } from 'express';
import { fetchFileStream, fetchSubmissions, pushSubmissionUpdates, fetchAssignments, fetchAssignmentDetails } from '../canvasClient';
import { requireConfig, requireCourseConfig } from '../config';
import { log } from '../logger';
import { SubmissionUpdate } from '../types';

const router = Router();

router.get('/assignments', async (_req, res) => {
  try {
    const config = requireCourseConfig();
    const assignments = await fetchAssignments(config);
    res.json({ assignments, courseId: config.courseId });
  } catch (err: any) {
    log('warn', 'Failed to fetch assignments', { status: err?.response?.status });
    res.status(400).json({ error: err?.message || 'Failed to fetch assignments' });
  }
});

router.get('/assignment-details', async (_req, res) => {
  try {
    const config = requireConfig();
    const details = await fetchAssignmentDetails(config);
    res.json(details);
  } catch (err: any) {
    log('warn', 'Failed to fetch assignment details', { status: err?.response?.status });
    res.status(400).json({ error: err?.message || 'Failed to fetch assignment details' });
  }
});

router.get('/submissions', async (_req, res) => {
  try {
    const config = requireConfig();
    const { submissions, assignmentName, courseName, courseCode, dueAt, pointsPossible, latePolicy, hasGroups, rubric } = await fetchSubmissions(config);
    res.json({
      submissions,
      assignmentName,
      courseName,
      courseCode,
      courseId: config.courseId,
      assignmentId: config.assignmentId,
      dueAt,
      pointsPossible,
      latePolicy,
      hasGroups,
      rubric,
    });
  } catch (err: any) {
    log('warn', 'Failed to fetch submissions', { status: err?.response?.status });
    res.status(400).json({ error: err?.message || 'Failed to fetch submissions' });
  }
});

router.get('/submissions/:userId/file/:fileId', async (req, res) => {
  const fileId = Number(req.params.fileId);
  if (Number.isNaN(fileId)) {
    return res.status(400).json({ error: 'Invalid file id' });
  }

  try {
    const config = requireConfig();
    const { stream, contentType, contentLength, fileName } = await fetchFileStream(config, fileId);
    
    // Set content type, with explicit PDF handling
    if (contentType) {
      res.setHeader('Content-Type', contentType);
    } else if (fileName?.toLowerCase().endsWith('.pdf')) {
      res.setHeader('Content-Type', 'application/pdf');
    }
    
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (fileName) res.setHeader('Content-Disposition', `inline; filename="${fileName}"`);
    
    // Add headers to allow embedding
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    
    stream.pipe(res);
  } catch (err: any) {
    log('warn', 'Failed to stream file', { fileId });
    res.status(400).json({ error: err?.message || 'Failed to fetch file' });
  }
});

router.post('/submissions/sync', async (req, res) => {
  const updates = (req.body?.updates || req.body) as SubmissionUpdate[];
  if (!Array.isArray(updates)) {
    return res.status(400).json({ error: 'Expected an array of updates' });
  }

  try {
    const config = requireConfig();
    const results = await pushSubmissionUpdates(config, updates);
    res.json({ results });
  } catch (err: any) {
    log('error', 'Failed to sync submissions', {});
    res.status(500).json({ error: err?.message || 'Failed to sync submissions' });
  }
});

export default router;

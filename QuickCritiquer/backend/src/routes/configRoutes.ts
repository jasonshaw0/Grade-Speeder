import { Router } from 'express';
import { getPublicConfig, updateConfig } from '../config';
import { setLogLevel } from '../logger';
import { LogLevel, PrivateConfig } from '../types';

const router = Router();

router.get('/config', (_req, res) => {
  const config = getPublicConfig();
  res.json(config);
});

router.post('/config', (req, res) => {
  const body = req.body as Partial<PrivateConfig> & { accessToken?: string | null };
  
  // Build sanitized object, only including keys that were actually provided
  const sanitized: Partial<PrivateConfig> & { accessToken?: string | null } = {};
  
  if (typeof body.baseUrl === 'string') {
    sanitized.baseUrl = body.baseUrl.trim();
  }
  
  // Handle courseId: null means clear, number means set, undefined means not provided
  if ('courseId' in body) {
    sanitized.courseId = body.courseId === null ? null : (typeof body.courseId === 'number' ? body.courseId : Number(body.courseId));
  }
  
  // Handle assignmentId: null means clear, number means set, undefined means not provided
  if ('assignmentId' in body) {
    sanitized.assignmentId = body.assignmentId === null ? null : (typeof body.assignmentId === 'number' ? body.assignmentId : Number(body.assignmentId));
  }
  
  if (body.keybindings) {
    sanitized.keybindings = body.keybindings;
  }
  
  if (body.accessToken !== undefined) {
    sanitized.accessToken = body.accessToken;
  }
  
  if (body.logLevel) {
    sanitized.logLevel = body.logLevel as LogLevel;
  }

  const publicConfig = updateConfig(sanitized);
  setLogLevel(publicConfig.logLevel);
  res.json(publicConfig);
});

export default router;

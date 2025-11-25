import fs from 'fs';
import path from 'path';
import { KeybindingsConfig, LogLevel, PrivateConfig, PublicConfig } from './types';

const CONFIG_PATH = path.join(__dirname, '..', 'config.json');

export const defaultKeybindings: KeybindingsConfig = {
  NEXT_FIELD: ['Tab', 'ArrowDown'],
  PREV_FIELD: ['Shift+Tab', 'ArrowUp'],
  NEXT_STUDENT_SAME_FIELD: ['ArrowRight'],
  PREV_STUDENT_SAME_FIELD: ['ArrowLeft'],
};

const envLogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

const defaultConfig: PrivateConfig = {
  baseUrl: '',
  courseId: null,
  assignmentId: null,
  accessToken: undefined,
  keybindings: defaultKeybindings,
  logLevel: envLogLevel,
};

let cachedConfig: PrivateConfig | null = null;

function loadConfigFromDisk(): PrivateConfig {
  if (cachedConfig) {
    return cachedConfig;
  }

  if (!fs.existsSync(CONFIG_PATH)) {
    cachedConfig = { ...defaultConfig };
    return cachedConfig;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<PrivateConfig>;
    cachedConfig = normalizeConfig(parsed);
  } catch (err) {
    cachedConfig = { ...defaultConfig };
  }

  return cachedConfig;
}

function normalizeConfig(input: Partial<PrivateConfig>): PrivateConfig {
  const mergedKeybindings: KeybindingsConfig = {
    ...defaultKeybindings,
    ...(input.keybindings || {}),
  };

  const merged: PrivateConfig = {
    ...defaultConfig,
    ...input,
    keybindings: mergedKeybindings,
  };

  // If LOG_LEVEL env is set, prefer it over file contents to keep safe default.
  merged.logLevel = envLogLevel || merged.logLevel || 'info';
  return merged;
}

export function getConfig(): PrivateConfig {
  return { ...loadConfigFromDisk() };
}

export function getPublicConfig(): PublicConfig {
  const config = loadConfigFromDisk();
  return {
    baseUrl: config.baseUrl,
    courseId: config.courseId,
    assignmentId: config.assignmentId,
    keybindings: config.keybindings,
    logLevel: config.logLevel,
    tokenPresent: Boolean(config.accessToken),
  };
}

export function updateConfig(update: Partial<PrivateConfig> & { accessToken?: string | null }): PublicConfig {
  const existing = loadConfigFromDisk();

  const next: PrivateConfig = {
    ...existing,
    keybindings: update.keybindings
      ? {
          ...defaultKeybindings,
          ...existing.keybindings,
          ...update.keybindings,
        }
      : existing.keybindings,
    logLevel: update.logLevel || existing.logLevel || envLogLevel,
    accessToken:
      update.accessToken === undefined
        ? existing.accessToken
        : update.accessToken === null || update.accessToken === ''
          ? undefined
          : update.accessToken,
  };

  // Apply baseUrl if provided
  if ('baseUrl' in update) {
    next.baseUrl = update.baseUrl ?? existing.baseUrl;
  }
  
  // Apply courseId if provided (including null to clear it)
  if ('courseId' in update) {
    next.courseId = update.courseId ?? null;
  }
  
  // Apply assignmentId if provided (including null to clear it)
  if ('assignmentId' in update) {
    next.assignmentId = update.assignmentId ?? null;
  }

  cachedConfig = next;
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(next, null, 2), { encoding: 'utf-8' });

  return getPublicConfig();
}

export function requireConfig(): PrivateConfig {
  const cfg = loadConfigFromDisk();
  if (!cfg.baseUrl || !cfg.courseId || !cfg.assignmentId || !cfg.accessToken) {
    throw new Error('Missing Canvas configuration. Please set baseUrl, courseId, assignmentId, and access token.');
  }

  return cfg;
}

/**
 * Requires config with baseUrl, courseId, and accessToken (but not assignmentId).
 * Use this for routes that operate at the course level, like fetching assignments.
 */
export function requireCourseConfig(): PrivateConfig {
  const cfg = loadConfigFromDisk();
  if (!cfg.baseUrl || !cfg.courseId || !cfg.accessToken) {
    throw new Error('Missing Canvas configuration. Please set baseUrl, courseId, and access token.');
  }

  return cfg;
}

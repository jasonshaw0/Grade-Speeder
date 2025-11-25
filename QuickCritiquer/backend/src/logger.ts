import { LogLevel } from './types';

const levelOrder: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

let currentLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'info';

export function setLogLevel(level: LogLevel) {
  currentLevel = level;
}

export function log(level: LogLevel, message: string, meta?: Record<string, unknown>) {
  if (levelOrder[level] < levelOrder[currentLevel]) return;
  const payload = meta && Object.keys(meta).length > 0 ? ` ${JSON.stringify(meta)}` : '';
  // Avoid logging PII; only include redacted or aggregate meta when necessary.
  // eslint-disable-next-line no-console
  console.log(`[${level.toUpperCase()}] ${message}${payload}`);
}

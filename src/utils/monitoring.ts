type LogLevel = 'info' | 'warn' | 'error';

type LogPayload = {
  scope: string;
  message: string;
  level?: LogLevel;
  metadata?: Record<string, unknown>;
};

export function logRusdiEvent(payload: LogPayload) {
  const entry = {
    ts: new Date().toISOString(),
    level: payload.level || 'info',
    scope: payload.scope,
    message: payload.message,
    metadata: payload.metadata || {}
  };

  if (entry.level === 'error') {
    console.error('[YDA LAW OFFICE & Partners]', entry);
    return;
  }
  if (entry.level === 'warn') {
    console.warn('[YDA LAW OFFICE & Partners]', entry);
    return;
  }
  console.info('[YDA LAW OFFICE & Partners]', entry);
}

export function trackRusdiError(scope: string, error: unknown, metadata?: Record<string, unknown>) {
  logRusdiEvent({
    scope,
    level: 'error',
    message: error instanceof Error ? error.message : String(error),
    metadata: {
      ...metadata,
      stack: error instanceof Error ? error.stack : undefined
    }
  });
}

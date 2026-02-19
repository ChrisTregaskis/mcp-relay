// Structured JSON logger — writes to stderr (stdout reserved for MCP protocol in stdio transport)

type LogLevel = 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  toolName?: string;
  operation?: string;
  correlationId?: string;
  durationMs?: number;
  error?: string;
  [key: string]: unknown;
}

/**
 * Field names that must never appear in log output (OWASP).
 * Matched case-insensitively against object keys at any nesting depth.
 */
const SENSITIVE_KEYS = new Set([
  'apitoken',
  'api_token',
  'apikey',
  'api_key',
  'accesskeyid',
  'access_key_id',
  'secretaccesskey',
  'secret_access_key',
  'password',
  'secret',
  'token',
  'authorization',
  'cookie',
]);

function sanitise(value: unknown): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(sanitise);

  const result: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
    if (SENSITIVE_KEYS.has(key.toLowerCase())) {
      result[key] = '[REDACTED]';
    } else {
      result[key] = sanitise(val);
    }
  }
  return result;
}

export function log(entry: LogEntry): void {
  const output = sanitise({
    timestamp: new Date().toISOString(),
    ...entry,
  });

  console.error(JSON.stringify(output));
}

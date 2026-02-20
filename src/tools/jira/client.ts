// Jira REST API client — centralises auth, headers, and common HTTP error handling
//
// S1 Spike: Basic Auth with email:apiToken, API v3, ~100 req/min rate limit.
// Auth header built here (single point of credential handling — OWASP).
// Known HTTP errors (401/403/404) return MCP error responses directly.
// Unknown errors throw ExternalServiceError for the handler's catch-all.

import { ExternalServiceError } from '../../shared/errors.js';
import { httpRequest } from '../../shared/http-client.js';
import { log } from '../../shared/logger.js';

import type { ErrorMetadata } from '../../shared/errors.js';

interface JiraConfig {
  baseUrl: string;
  userEmail: string;
  apiToken: string;
}

interface JiraRequestOptions {
  config: JiraConfig;
  path: string;
  method?: string;
  body?: string;
  metadata: ErrorMetadata;
  /** Custom message for 404 responses. Defaults to generic "not found" message. */
  notFoundMessage?: string;
}

/** MCP tool error response shape. */
interface McpErrorResponse {
  isError: true;
  content: [{ type: 'text'; text: string }];
}

export type JiraResult = { ok: true; data: unknown } | { ok: false; mcpResponse: McpErrorResponse };

/**
 * Sends an authenticated request to the Jira REST API v3.
 *
 * Handles:
 * - Basic Auth header construction from config credentials
 * - Common headers (Accept, Content-Type for requests with body)
 * - 401 → authentication failed (generic, OWASP-safe)
 * - 403 → permission denied (generic, OWASP-safe)
 * - 404 → not found (customisable via notFoundMessage)
 * - Other non-2xx → throws ExternalServiceError
 * - JSON parsing with error wrapping
 *
 * Returns a discriminated union — callers check `result.ok` before proceeding.
 */
export async function jiraRequest(options: JiraRequestOptions): Promise<JiraResult> {
  const { config, path, method = 'GET', body, metadata, notFoundMessage } = options;

  const url = `${config.baseUrl}${path}`;
  const authToken = Buffer.from(`${config.userEmail}:${config.apiToken}`).toString('base64');

  const response = await httpRequest({
    url,
    method,
    headers: {
      Authorization: `Basic ${authToken}`,
      Accept: 'application/json',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body } : {}),
    metadata,
  });

  // 401 — authentication failed
  if (response.status === 401) {
    log({ level: 'error', message: 'Jira authentication failed', ...metadata });

    return {
      ok: false,
      mcpResponse: {
        isError: true,
        content: [
          { type: 'text', text: 'Jira authentication failed. Check the configured credentials.' },
        ],
      },
    };
  }

  // 403 — permission denied
  if (response.status === 403) {
    log({ level: 'error', message: 'Jira permission denied', ...metadata });

    return {
      ok: false,
      mcpResponse: {
        isError: true,
        content: [
          {
            type: 'text',
            text: 'Permission denied when accessing Jira. The configured user may lack access.',
          },
        ],
      },
    };
  }

  // 404 — not found (tool-specific message via notFoundMessage)
  if (response.status === 404) {
    const message =
      notFoundMessage ??
      'The requested Jira resource was not found. Check the identifier and try again.';
    log({ level: 'warn', message: 'Jira resource not found', ...metadata });

    return {
      ok: false,
      mcpResponse: {
        isError: true,
        content: [{ type: 'text', text: message }],
      },
    };
  }

  // Unexpected non-2xx — throw for handler catch-all
  if (response.status < 200 || response.status >= 300) {
    throw new ExternalServiceError(
      `Jira API returned unexpected status ${response.status}`,
      metadata,
      response.status
    );
  }

  // Parse JSON
  let data: unknown;
  try {
    data = JSON.parse(response.body);
  } catch {
    throw new ExternalServiceError('Failed to parse Jira API response as JSON', metadata);
  }

  return { ok: true, data };
}

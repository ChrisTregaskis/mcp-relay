// jira_search_issues — search Jira issues via JQL (REST API v3)
import crypto from 'node:crypto';

import { z } from 'zod';

import type { ErrorMetadata } from '../../shared/errors.js';
import { ExternalServiceError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import type { RateLimitConfig } from '../../shared/rate-limit.js';
import { parseResponse } from '../../shared/validation.js';
import type { ToolContext } from '../../types.js';

import { jiraRequest } from './client.js';
import { JiraSearchResponseSchema, formatJiraSearchResults } from './schemas.js';

const TOOL_NAME = 'jira_search_issues';

/** Rate limit config — Atlassian Cloud allows ~100 req/min. Enforcement deferred to Phase 2. */
export const RATE_LIMIT: RateLimitConfig = {
  maxRequests: 60,
  windowMs: 60_000,
};

/** Fields requested from the Jira API — keeps response lean (avoids 200+ field bloat). */
const JIRA_FIELDS = [
  'summary',
  'status',
  'assignee',
  'priority',
  'issuetype',
  'description',
  'created',
  'updated',
];

export function registerSearchIssues(context: ToolContext): void {
  context.server.registerTool(
    TOOL_NAME,
    {
      description: 'Search for Jira issues using a JQL query string',
      inputSchema: {
        jql: z.string().describe('A JQL query string (e.g. "project = PROJ AND status = Open")'),
        maxResults: z
          .number()
          .min(1)
          .max(100)
          .optional()
          .default(50)
          .describe('Maximum number of results to return (1–100)'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
        idempotentHint: true,
      },
    },
    async (args) => {
      const { jql, maxResults } = args;
      const correlationId = crypto.randomUUID();
      const startTime = Date.now();

      const metadata: ErrorMetadata = {
        toolName: TOOL_NAME,
        operation: 'searchIssues',
        correlationId,
      };

      log({
        level: 'info',
        message: `Searching Jira issues with JQL`,
        ...metadata,
      });

      try {
        const requestBody = {
          jql,
          maxResults,
          fields: JIRA_FIELDS,
        };

        const result = await jiraRequest({
          config: context.config.jira,
          path: '/rest/api/3/search/jql',
          method: 'POST',
          body: JSON.stringify(requestBody),
          metadata,
        });

        const durationMs = Date.now() - startTime;

        if (!result.ok) {
          log({
            level: 'warn',
            message: 'Jira search request failed',
            durationMs,
            ...metadata,
          });

          return result.mcpResponse;
        }

        const validated = parseResponse(JiraSearchResponseSchema, result.data, metadata);
        const formattedText = formatJiraSearchResults(validated);

        log({
          level: 'info',
          message: `Search returned ${validated.issues.length} issue(s)`,
          durationMs,
          ...metadata,
        });

        return {
          content: [{ type: 'text' as const, text: formattedText }],
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;

        // Invalid JQL returns 400 from Jira — surface a specific message
        if (error instanceof ExternalServiceError && error.statusCode === 400) {
          log({
            level: 'warn',
            message: 'Invalid JQL query',
            error: error.message,
            durationMs,
            ...metadata,
          });

          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Invalid JQL query. Check the syntax and field names, then try again.',
              },
            ],
          };
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        log({
          level: 'error',
          message: 'Failed to search Jira issues',
          error: errorMessage,
          durationMs,
          ...metadata,
        });

        // OWASP: generic message to client, detailed error logged server-side above
        return {
          isError: true,
          content: [
            {
              type: 'text' as const,
              text: 'An error occurred while searching Jira issues. Check server logs for details.',
            },
          ],
        };
      }
    }
  );
}

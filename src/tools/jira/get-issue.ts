// jira_get_issue — fetch a Jira issue by key via REST API v3
import crypto from 'node:crypto';

import { z } from 'zod';

import type { ErrorMetadata } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import { parseResponse } from '../../shared/validation.js';
import type { ToolContext } from '../../types.js';

import { jiraRequest } from './client.js';
import {
  JIRA_ISSUE_KEY_ERROR,
  JIRA_ISSUE_KEY_PATTERN,
  JiraIssueResponseSchema,
  formatJiraIssue,
} from './schemas.js';

const TOOL_NAME = 'jira_get_issue';

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
].join(',');

export function registerGetIssue(context: ToolContext): void {
  context.server.registerTool(
    TOOL_NAME,
    {
      description:
        'Fetch a Jira issue by its key, returning summary, status, assignee, priority, type, description, and timestamps',
      inputSchema: {
        issueKey: z
          .string()
          .regex(JIRA_ISSUE_KEY_PATTERN, JIRA_ISSUE_KEY_ERROR)
          .describe('The Jira issue key (e.g. "PROJ-123")'),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        openWorldHint: true,
        idempotentHint: true,
      },
    },
    async (args) => {
      const { issueKey } = args;
      const correlationId = crypto.randomUUID();
      const startTime = Date.now();

      const metadata: ErrorMetadata = {
        toolName: TOOL_NAME,
        operation: 'getIssue',
        correlationId,
      };

      log({
        level: 'info',
        message: `Fetching Jira issue ${issueKey}`,
        ...metadata,
      });

      try {
        const params = new URLSearchParams({ fields: JIRA_FIELDS });
        const result = await jiraRequest({
          config: context.config.jira,
          path: `/rest/api/3/issue/${encodeURIComponent(issueKey)}?${params.toString()}`,
          metadata,
          notFoundMessage: `Jira issue ${issueKey} was not found. Check the issue key and try again.`,
        });

        const durationMs = Date.now() - startTime;

        if (!result.ok) {
          log({
            level: 'warn',
            message: `Jira request failed for ${issueKey}`,
            durationMs,
            ...metadata,
          });

          return result.mcpResponse;
        }

        const validated = parseResponse(JiraIssueResponseSchema, result.data, metadata);
        const formattedText = formatJiraIssue(validated);

        log({ level: 'info', message: `Fetched issue ${issueKey}`, durationMs, ...metadata });

        return {
          content: [{ type: 'text' as const, text: formattedText }],
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        log({
          level: 'error',
          message: `Failed to fetch issue ${issueKey}`,
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
              text: `An error occurred while fetching Jira issue ${issueKey}. Check server logs for details.`,
            },
          ],
        };
      }
    }
  );
}

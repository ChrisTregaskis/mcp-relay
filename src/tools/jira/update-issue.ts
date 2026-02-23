import crypto from 'node:crypto';

import { z } from 'zod';

import type { ErrorMetadata } from '../../shared/errors.js';
import { ExternalServiceError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import type { ToolContext } from '../../types.js';

import { jiraRequest } from './client.js';
import { JIRA_ISSUE_KEY_ERROR, JIRA_ISSUE_KEY_PATTERN, textToAdf } from './schemas.js';

const TOOL_NAME = 'jira_update_issue';

export function registerUpdateIssue(context: ToolContext): void {
  context.server.registerTool(
    TOOL_NAME,
    {
      description: 'Update fields on an existing Jira issue',
      inputSchema: {
        issueKey: z
          .string()
          .regex(JIRA_ISSUE_KEY_PATTERN, JIRA_ISSUE_KEY_ERROR)
          .describe('The Jira issue key to update (e.g. "PROJ-123")'),
        fields: z
          .record(z.unknown())
          .describe(
            'A map of Jira field names to new values. Common fields: "summary" (string), "description" (string — converted to ADF automatically), "priority" (e.g. { "name": "High" }), "assignee" (e.g. { "accountId": "abc123" }). Example: { "summary": "Updated title", "priority": { "name": "High" } }'
          ),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
        idempotentHint: true,
      },
    },
    async (args) => {
      const { issueKey, fields } = args;
      const correlationId = crypto.randomUUID();
      const startTime = Date.now();

      const metadata: ErrorMetadata = {
        toolName: TOOL_NAME,
        operation: 'updateIssue',
        correlationId,
      };

      log({
        level: 'info',
        message: `Updating Jira issue ${issueKey}`,
        ...metadata,
      });

      try {
        // Convert plain-text description to ADF if provided as a string
        const processedFields: Record<string, unknown> = { ...fields };

        if (typeof processedFields['description'] === 'string') {
          processedFields['description'] = textToAdf(processedFields['description'] as string);
        }

        const result = await jiraRequest({
          config: context.config.jira,
          path: `/rest/api/3/issue/${encodeURIComponent(issueKey)}`,
          method: 'PUT',
          body: JSON.stringify({ fields: processedFields }),
          metadata,
          notFoundMessage: `Issue ${issueKey} was not found. Check the issue key and try again.`,
        });

        const durationMs = Date.now() - startTime;

        if (!result.ok) {
          log({
            level: 'warn',
            message: `Jira update request failed for ${issueKey}`,
            durationMs,
            ...metadata,
          });

          return result.mcpResponse;
        }

        // Jira returns 204 No Content on successful update — no response body to validate
        const updatedFieldNames = Object.keys(processedFields).join(', ');

        log({
          level: 'info',
          message: `Updated issue ${issueKey}`,
          durationMs,
          ...metadata,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: `Updated ${issueKey}\n\nFields changed: ${updatedFieldNames}`,
            },
          ],
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;

        // Invalid field names or values return 400 from Jira
        if (error instanceof ExternalServiceError && error.statusCode === 400) {
          log({
            level: 'warn',
            message: 'Invalid field names or values in update request',
            error: error.message,
            durationMs,
            ...metadata,
          });

          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Failed to update issue. Check the field names and values are valid, then try again.',
              },
            ],
          };
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        log({
          level: 'error',
          message: 'Failed to update Jira issue',
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
              text: 'An error occurred while updating the Jira issue. Check server logs for details.',
            },
          ],
        };
      }
    }
  );
}

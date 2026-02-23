import crypto from 'node:crypto';

import { z } from 'zod';

import type { ErrorMetadata } from '../../shared/errors.js';
import { ExternalServiceError } from '../../shared/errors.js';
import { log } from '../../shared/logger.js';
import { parseResponse } from '../../shared/validation.js';
import type { ToolContext } from '../../types.js';

import { jiraRequest } from './client.js';
import { JiraCreateIssueResponseSchema, textToAdf } from './schemas.js';

const TOOL_NAME = 'jira_create_issue';

export function registerCreateIssue(context: ToolContext): void {
  context.server.registerTool(
    TOOL_NAME,
    {
      description: 'Create a new Jira issue in the specified project',
      inputSchema: {
        project: z
          .string()
          .regex(
            /^[A-Z][A-Z0-9_]*$/,
            'Invalid Jira project key format. Expected uppercase pattern like "PROJ".'
          )
          .describe('The Jira project key (e.g. "PROJ")'),
        summary: z
          .string()
          .min(1, 'Summary must not be empty')
          .describe('A brief summary of the issue (e.g. "Login button unresponsive on mobile")'),
        issueType: z
          .string()
          .min(1, 'Issue type must not be empty')
          .describe('The issue type name (e.g. "Task", "Bug", "Story")'),
        description: z
          .string()
          .optional()
          .describe('Detailed description of the issue in plain text'),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        openWorldHint: true,
        idempotentHint: false,
      },
    },
    async (args) => {
      const { project, summary, issueType, description } = args;
      const correlationId = crypto.randomUUID();
      const startTime = Date.now();

      const metadata: ErrorMetadata = {
        toolName: TOOL_NAME,
        operation: 'createIssue',
        correlationId,
      };

      log({
        level: 'info',
        message: `Creating Jira issue in project ${project}`,
        ...metadata,
      });

      try {
        const fields: Record<string, unknown> = {
          project: { key: project },
          summary,
          issuetype: { name: issueType },
        };

        if (description !== undefined) {
          fields['description'] = textToAdf(description);
        }

        const result = await jiraRequest({
          config: context.config.jira,
          path: '/rest/api/3/issue',
          method: 'POST',
          body: JSON.stringify({ fields }),
          metadata,
          notFoundMessage: 'Failed to create issue. The project or issue type may not exist.',
        });

        const durationMs = Date.now() - startTime;

        if (!result.ok) {
          log({
            level: 'warn',
            message: `Jira create request failed for project ${project}`,
            durationMs,
            ...metadata,
          });

          return result.mcpResponse;
        }

        const validated = parseResponse(JiraCreateIssueResponseSchema, result.data, metadata);

        log({
          level: 'info',
          message: `Created issue ${validated.key}`,
          durationMs,
          ...metadata,
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: `Created ${validated.key}: ${summary}\n\nType: ${issueType}\nProject: ${project}`,
            },
          ],
        };
      } catch (error) {
        const durationMs = Date.now() - startTime;

        // Invalid project key or issue type returns 400 from Jira
        if (error instanceof ExternalServiceError && error.statusCode === 400) {
          log({
            level: 'warn',
            message: 'Invalid project key or issue type',
            error: error.message,
            durationMs,
            ...metadata,
          });

          return {
            isError: true,
            content: [
              {
                type: 'text' as const,
                text: 'Failed to create issue. Check the project key and issue type are valid, then try again.',
              },
            ],
          };
        }

        const errorMessage = error instanceof Error ? error.message : 'Unknown error';

        log({
          level: 'error',
          message: 'Failed to create Jira issue',
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
              text: 'An error occurred while creating the Jira issue. Check server logs for details.',
            },
          ],
        };
      }
    }
  );
}

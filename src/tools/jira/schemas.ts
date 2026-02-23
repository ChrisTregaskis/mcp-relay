import { z } from 'zod';

// Shared validation patterns
/** Matches Jira issue keys like "PROJ-123". Case-insensitive — Jira normalises to uppercase. */
export const JIRA_ISSUE_KEY_PATTERN = /^[A-Z][A-Z0-9_]*-\d+$/i;
export const JIRA_ISSUE_KEY_ERROR =
  'Invalid Jira issue key format. Expected pattern like "PROJ-123".';

// Zod schemas and helpers for Jira API response validation based on API version: v3
export const JiraIssueResponseSchema = z.object({
  key: z.string(),
  fields: z.object({
    summary: z.string(),
    status: z.object({
      name: z.string(),
    }),
    issuetype: z.object({
      name: z.string(),
    }),
    priority: z
      .object({
        name: z.string(),
      })
      .nullable(),
    assignee: z
      .object({
        displayName: z.string(),
        emailAddress: z.string().optional(),
      })
      .nullable(),
    description: z.unknown().nullable(),
    created: z.string(),
    updated: z.string(),
  }),
});

export type JiraIssueResponse = z.infer<typeof JiraIssueResponseSchema>;

export const JiraSearchResponseSchema = z.object({
  issues: z.array(JiraIssueResponseSchema),
  total: z.number().optional(),
  isLast: z.boolean().optional(),
});

export type JiraSearchResponse = z.infer<typeof JiraSearchResponseSchema>;

export const JiraCreateIssueResponseSchema = z.object({
  id: z.string(),
  key: z.string(),
  self: z.string().url(),
});

export type JiraCreateIssueResponse = z.infer<typeof JiraCreateIssueResponseSchema>;

/**
 * Wraps a plain text string in an Atlassian Document Format (ADF)
 * document node suitable for the Jira REST API v3 description field.
 * Splits on double-newlines to produce separate paragraph nodes.
 */
export function textToAdf(text: string): Record<string, unknown> {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => ({
      type: 'paragraph',
      content: [{ type: 'text', text: block }],
    }));

  return {
    type: 'doc',
    version: 1,
    content:
      paragraphs.length > 0
        ? paragraphs
        : [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
  };
}

/**
 * Recursively walks an Atlassian Document Format (ADF) node tree and
 * concatenates all text content into a plain string.
 *
 * Handles: doc, paragraph, heading, text, hardBreak, bulletList,
 * orderedList, listItem, codeBlock, blockquote.
 * Degrades gracefully for unknown node types by recursing into children.
 */
export function extractTextFromAdf(node: unknown): string {
  if (node === null || node === undefined) {
    return '';
  }

  if (typeof node !== 'object') {
    return '';
  }

  const record = node as Record<string, unknown>;
  const type = record['type'];

  if (typeof type !== 'string') {
    return '';
  }

  // Leaf node — plain text
  if (type === 'text') {
    return typeof record['text'] === 'string' ? record['text'] : '';
  }

  // Leaf node — line break
  if (type === 'hardBreak') {
    return '\n';
  }

  // Container nodes — recurse into content array
  const content = record['content'];

  if (!Array.isArray(content)) {
    return '';
  }

  const childTexts = content.map(extractTextFromAdf);

  switch (type) {
    case 'doc':
      return childTexts.join('\n\n');
    case 'paragraph':
    case 'heading':
      return childTexts.join('');
    case 'bulletList':
      return childTexts.join('\n');
    case 'orderedList':
      return content
        .map((child, index) => {
          const text = extractTextFromAdf(child);

          // Replace the leading "- " from listItem with a numbered prefix
          return text.startsWith('- ') ? `${index + 1}. ${text.slice(2)}` : `${index + 1}. ${text}`;
        })
        .join('\n');
    case 'listItem':
      return `- ${childTexts.join('')}`;
    case 'codeBlock':
      return childTexts.join('');
    case 'blockquote':
      return childTexts
        .join('')
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    default:
      // Unknown node type — best-effort: recurse into children
      return childTexts.join('');
  }
}

/**
 * Formats a validated Jira issue response into a human-readable text block.
 * Null-safe: displays "None", "Unassigned", or "No description provided."
 * for missing optional fields.
 */
export function formatJiraIssue(issue: JiraIssueResponse): string {
  const { key, fields } = issue;

  const priority = fields.priority?.name ?? 'None';
  const assignee = fields.assignee?.displayName ?? 'Unassigned';

  const descriptionText = fields.description ? extractTextFromAdf(fields.description) : '';
  const description = descriptionText.trim() || 'No description provided.';

  const lines = [
    `${key}: ${fields.summary}`,
    '',
    `Type:     ${fields.issuetype.name}`,
    `Status:   ${fields.status.name}`,
    `Priority: ${priority}`,
    `Assignee: ${assignee}`,
    '',
    `Created:  ${fields.created}`,
    `Updated:  ${fields.updated}`,
    '',
    'Description:',
    description,
  ];

  return lines.join('\n');
}

/**
 * Formats a validated Jira search response into a human-readable text block.
 * Each issue is a compact one-liner; includes a summary count line.
 */
export function formatJiraSearchResults(response: JiraSearchResponse): string {
  const { issues, total, isLast } = response;

  if (issues.length === 0) {
    return 'No issues found matching the query.';
  }

  const lines: string[] = [];

  // isLast can be: true (last page), false (more pages), undefined (field absent)
  const moreAvailable = isLast === false;

  if (moreAvailable) {
    const totalInfo = total !== undefined ? ` of ${total}` : '';
    lines.push(`Showing ${issues.length}${totalInfo} issue(s) (more results available).`);
  } else {
    lines.push(`Found ${issues.length} issue(s).`);
  }

  lines.push('');

  for (const issue of issues) {
    const { key, fields } = issue;
    const priority = fields.priority?.name ?? 'None';
    const assignee = fields.assignee?.displayName ?? 'Unassigned';

    lines.push(
      `${key}  [${fields.issuetype.name}]  ${fields.status.name}  P:${priority}  @${assignee}  — ${fields.summary}`
    );
  }

  return lines.join('\n');
}

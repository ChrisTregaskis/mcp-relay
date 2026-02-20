import type { z } from 'zod';

import { ValidationError } from './errors.js';

import type { ErrorMetadata } from './errors.js';

/**
 * Validates unknown data against a Zod schema, throwing a structured
 * ValidationError on mismatch. Used at API response boundaries to
 * ensure external data conforms to expected shapes.
 */
export function parseResponse<T>(schema: z.ZodType<T>, data: unknown, metadata: ErrorMetadata): T {
  const result = schema.safeParse(data);

  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);

  throw new ValidationError('API response did not match expected schema', metadata, issues);
}

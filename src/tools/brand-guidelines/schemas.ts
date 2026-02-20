import { z } from 'zod';

export const BrandGuidelinesConfigSchema = z.object({
  projectId: z.string(),
  guidelines: z.record(z.unknown()),
});

export type BrandGuidelinesConfig = z.infer<typeof BrandGuidelinesConfigSchema>;

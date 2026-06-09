import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import type { ZodSchema } from 'zod';

const formatErrors = (
  issues: Array<{ path: (string | number)[]; message: string }>,
  fallback: string,
) => issues.map((i) => `${i.path.join('.') || fallback}: ${i.message}`).join('; ');

export const validateJson = <T extends ZodSchema>(schema: T) =>
  zValidator('json', schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: formatErrors(result.error.issues, 'body') }, 400);
    }
  });

export const validateParams = <T extends ZodSchema>(schema: T) =>
  zValidator('param', schema, (result, c) => {
    if (!result.success) {
      return c.json({ error: formatErrors(result.error.issues, 'param') }, 400);
    }
  });

export const idParam = z.object({ id: z.string().uuid() });

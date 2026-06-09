import { createMiddleware } from 'hono/factory';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { organisations } from '../db/schema.js';

export type AuthEnv = {
  Variables: {
    org: typeof organisations.$inferSelect;
  };
};

export const requireApiKey = createMiddleware<AuthEnv>(async (c, next) => {
  const apiKey = c.req.header('X-API-Key');
  if (!apiKey) return c.json({ error: 'Missing API key' }, 401);

  const [org] = await db.select().from(organisations).where(eq(organisations.apiKey, apiKey));
  if (!org) return c.json({ error: 'Invalid API key' }, 401);

  c.set('org', org);
  await next();
});

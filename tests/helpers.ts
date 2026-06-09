import { randomUUID } from 'crypto';
import type { Hono } from 'hono';
import { db } from '../src/db/index.js';
import { organisations, conferences, speakers, talks, talkSpeakers } from '../src/db/schema.js';

export async function clearDb() {
  await db.delete(talkSpeakers);
  await db.delete(talks);
  await db.delete(speakers);
  await db.delete(conferences);
  await db.delete(organisations);
}

export async function createOrg(name = 'Test Org') {
  const apiKey = randomUUID();
  const [org] = await db.insert(organisations).values({ name, apiKey }).returning();
  return { org, apiKey };
}

export function req(
  app: Hono,
  path: string,
  options: { method?: string; body?: unknown; apiKey?: string } = {},
) {
  const { method = 'GET', body, apiKey } = options;
  const headers: Record<string, string> = {};
  if (apiKey) headers['X-API-Key'] = apiKey;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  return app.request(path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
}

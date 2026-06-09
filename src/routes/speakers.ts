import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { speakers } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';
import { validateJson, validateParams, idParam } from '../middleware/validate.js';

const speakerBody = z.object({
  name: z.string().min(1).optional(),
  bio: z.string().optional().nullable(),
  avatarUrl: z.string().url().optional().nullable(),
  websiteUrl: z.string().url().optional().nullable(),
});

const createSpeakerBody = speakerBody.required({ name: true });

export const speakersRouter = new Hono<AuthEnv>();

speakersRouter.get('/', async (c) => {
  const org = c.get('org');
  const rows = await db.select().from(speakers).where(eq(speakers.organisationId, org.id));
  return c.json(rows);
});

speakersRouter.post('/', validateJson(createSpeakerBody), async (c) => {
  const org = c.get('org');
  const body = c.req.valid('json');
  const [speaker] = await db
    .insert(speakers)
    .values({
      organisationId: org.id,
      name: body.name,
      bio: body.bio,
      avatarUrl: body.avatarUrl,
      websiteUrl: body.websiteUrl,
    })
    .returning();
  return c.json(speaker, 201);
});

speakersRouter.get('/:id', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const [speaker] = await db
    .select()
    .from(speakers)
    .where(and(eq(speakers.id, id), eq(speakers.organisationId, org.id)));
  if (!speaker) return c.json({ error: 'Not found' }, 404);
  return c.json(speaker);
});

speakersRouter.patch('/:id', validateParams(idParam), validateJson(speakerBody), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [existing] = await db
    .select()
    .from(speakers)
    .where(and(eq(speakers.id, id), eq(speakers.organisationId, org.id)));
  if (!existing) return c.json({ error: 'Not found' }, 404);

  const updates: Partial<typeof speakers.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.avatarUrl !== undefined) updates.avatarUrl = body.avatarUrl;
  if (body.websiteUrl !== undefined) updates.websiteUrl = body.websiteUrl;
  if (Object.keys(updates).length === 0) return c.json(existing);

  const [updated] = await db
    .update(speakers)
    .set(updates)
    .where(and(eq(speakers.id, id), eq(speakers.organisationId, org.id)))
    .returning();
  return c.json(updated);
});

speakersRouter.delete('/:id', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const deleted = await db
    .delete(speakers)
    .where(and(eq(speakers.id, id), eq(speakers.organisationId, org.id)))
    .returning({ id: speakers.id });
  if (deleted.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.body(null, 204);
});

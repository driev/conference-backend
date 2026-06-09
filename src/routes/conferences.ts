import { Hono } from 'hono';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conferences, talks } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';
import { validateJson, validateParams, idParam } from '../middleware/validate.js';
import {
  getTalkWithSpeakers,
  validateSpeakers,
  replaceTalkSpeakers,
  isUniqueViolation,
  createTalkBody,
} from '../lib/talks.js';

const conferenceBody = z.object({
  name: z.string().min(1).optional(),
  slug: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
  status: z.enum(['draft', 'published', 'cancelled']).optional(),
});

const createConferenceBody = conferenceBody.required({ name: true, slug: true });

export const conferencesRouter = new Hono<AuthEnv>();

conferencesRouter.get('/', async (c) => {
  const org = c.get('org');
  const rows = await db.select().from(conferences).where(eq(conferences.organisationId, org.id));
  return c.json(rows);
});

conferencesRouter.post('/', validateJson(createConferenceBody), async (c) => {
  const org = c.get('org');
  const body = c.req.valid('json');
  try {
    const [conference] = await db
      .insert(conferences)
      .values({
        organisationId: org.id,
        name: body.name,
        slug: body.slug,
        description: body.description,
        location: body.location,
        startDate: body.startDate,
        endDate: body.endDate,
        status: body.status ?? 'draft',
      })
      .returning();
    return c.json(conference, 201);
  } catch (err) {
    if (isUniqueViolation(err)) return c.json({ error: 'Slug already in use' }, 409);
    throw err;
  }
});

conferencesRouter.get('/:id', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const [conference] = await db
    .select()
    .from(conferences)
    .where(and(eq(conferences.id, id), eq(conferences.organisationId, org.id)));
  if (!conference) return c.json({ error: 'Not found' }, 404);
  return c.json(conference);
});

conferencesRouter.patch('/:id', validateParams(idParam), validateJson(conferenceBody), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [existing] = await db
    .select()
    .from(conferences)
    .where(and(eq(conferences.id, id), eq(conferences.organisationId, org.id)));
  if (!existing) return c.json({ error: 'Not found' }, 404);
  if (body.slug !== undefined && existing.status !== 'draft') {
    return c.json({ error: 'Slug cannot be changed on a published or cancelled conference' }, 400);
  }

  const updates: Partial<typeof conferences.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name;
  if (body.slug !== undefined) updates.slug = body.slug;
  if (body.description !== undefined) updates.description = body.description;
  if (body.location !== undefined) updates.location = body.location;
  if (body.startDate !== undefined) updates.startDate = body.startDate;
  if (body.endDate !== undefined) updates.endDate = body.endDate;
  if (body.status !== undefined) updates.status = body.status;
  if (Object.keys(updates).length === 0) return c.json(existing);

  try {
    const [updated] = await db
      .update(conferences)
      .set(updates)
      .where(and(eq(conferences.id, id), eq(conferences.organisationId, org.id)))
      .returning();
    return c.json(updated);
  } catch (err) {
    if (isUniqueViolation(err)) return c.json({ error: 'Slug already in use' }, 409);
    throw err;
  }
});

conferencesRouter.delete('/:id', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const deleted = await db
    .delete(conferences)
    .where(and(eq(conferences.id, id), eq(conferences.organisationId, org.id)))
    .returning({ id: conferences.id });
  if (deleted.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.body(null, 204);
});

conferencesRouter.get('/:id/talks', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const [conference] = await db
    .select()
    .from(conferences)
    .where(and(eq(conferences.id, id), eq(conferences.organisationId, org.id)));
  if (!conference) return c.json({ error: 'Not found' }, 404);

  const rows = await db.query.talks.findMany({
    where: eq(talks.conferenceId, id),
    with: { talkSpeakers: { with: { speaker: true } } },
    orderBy: (t, { asc }) => [asc(t.startsAt)],
  });

  return c.json(rows.map(({ talkSpeakers: ts, ...t }) => ({ ...t, speakers: ts.map((r) => r.speaker) })));
});

conferencesRouter.post('/:id/talks', validateParams(idParam), validateJson(createTalkBody), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [conference] = await db
    .select()
    .from(conferences)
    .where(and(eq(conferences.id, id), eq(conferences.organisationId, org.id)));
  if (!conference) return c.json({ error: 'Not found' }, 404);

  const speakerIds = body.speakerIds ?? [];
  if (!(await validateSpeakers(speakerIds, org.id))) {
    return c.json({ error: 'One or more speaker IDs are invalid' }, 400);
  }

  const talk = await db.transaction(async (tx) => {
    const [inserted] = await tx
      .insert(talks)
      .values({
        conferenceId: id,
        title: body.title,
        description: body.description,
        startsAt: body.startsAt ? new Date(body.startsAt) : null,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        room: body.room,
      })
      .returning();
    await replaceTalkSpeakers(tx, inserted.id, speakerIds);
    return inserted;
  });

  return c.json(await getTalkWithSpeakers(talk.id), 201);
});

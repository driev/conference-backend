import { Hono } from 'hono';
import { eq, and, inArray } from 'drizzle-orm';
import { db } from '../db/index.js';
import { talks, conferences } from '../db/schema.js';
import type { AuthEnv } from '../middleware/auth.js';
import { validateJson, validateParams, idParam } from '../middleware/validate.js';
import { getTalkWithSpeakers, validateSpeakers, replaceTalkSpeakers, talkBody } from '../lib/talks.js';

const orgConferenceIds = (orgId: string) =>
  db.select({ id: conferences.id }).from(conferences).where(eq(conferences.organisationId, orgId));

export const talksRouter = new Hono<AuthEnv>();

talksRouter.get('/:id', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();

  const talk = await db.query.talks.findFirst({
    where: eq(talks.id, id),
    with: {
      conference: { columns: { organisationId: true } },
      talkSpeakers: { with: { speaker: true } },
    },
  });

  if (!talk || talk.conference.organisationId !== org.id) {
    return c.json({ error: 'Not found' }, 404);
  }

  const { talkSpeakers: ts, conference: _conference, ...rest } = talk;
  return c.json({ ...rest, speakers: ts.map((r) => r.speaker) });
});

talksRouter.patch('/:id', validateParams(idParam), validateJson(talkBody), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();
  const body = c.req.valid('json');

  const [row] = await db
    .select({ id: talks.id })
    .from(talks)
    .innerJoin(conferences, eq(talks.conferenceId, conferences.id))
    .where(and(eq(talks.id, id), eq(conferences.organisationId, org.id)));

  if (!row) return c.json({ error: 'Not found' }, 404);

  if (body.speakerIds !== undefined && !(await validateSpeakers(body.speakerIds, org.id))) {
    return c.json({ error: 'One or more speaker IDs are invalid' }, 400);
  }

  const updates: Partial<typeof talks.$inferInsert> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.startsAt !== undefined) updates.startsAt = body.startsAt ? new Date(body.startsAt) : null;
  if (body.endsAt !== undefined) updates.endsAt = body.endsAt ? new Date(body.endsAt) : null;
  if (body.room !== undefined) updates.room = body.room;

  await db.transaction(async (tx) => {
    if (Object.keys(updates).length > 0) {
      await tx
        .update(talks)
        .set(updates)
        .where(and(eq(talks.id, id), inArray(talks.conferenceId, orgConferenceIds(org.id))));
    }
    if (body.speakerIds !== undefined) {
      await replaceTalkSpeakers(tx, id, body.speakerIds);
    }
  });

  return c.json(await getTalkWithSpeakers(id));
});

talksRouter.delete('/:id', validateParams(idParam), async (c) => {
  const org = c.get('org');
  const { id } = c.req.param();

  const deleted = await db
    .delete(talks)
    .where(and(eq(talks.id, id), inArray(talks.conferenceId, orgConferenceIds(org.id))))
    .returning({ id: talks.id });

  if (deleted.length === 0) return c.json({ error: 'Not found' }, 404);
  return c.body(null, 204);
});

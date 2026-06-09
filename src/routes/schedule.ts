import { Hono } from 'hono';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/index.js';
import { conferences, talks } from '../db/schema.js';

export const scheduleRouter = new Hono();

scheduleRouter.get('/:slug', async (c) => {
  const { slug } = c.req.param();

  const [conference] = await db
    .select()
    .from(conferences)
    .where(and(eq(conferences.slug, slug), eq(conferences.status, 'published')));

  if (!conference) return c.json({ error: 'Not found' }, 404);

  const rows = await db.query.talks.findMany({
    where: eq(talks.conferenceId, conference.id),
    with: { talkSpeakers: { with: { speaker: true } } },
    orderBy: (t, { asc }) => [asc(t.startsAt)],
  });

  return c.json({
    conference: {
      name: conference.name,
      description: conference.description,
      location: conference.location,
      startDate: conference.startDate,
      endDate: conference.endDate,
    },
    talks: rows.map(({ talkSpeakers: ts, ...t }) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      startsAt: t.startsAt,
      endsAt: t.endsAt,
      room: t.room,
      speakers: ts.map(({ speaker: s }) => ({
        name: s.name,
        bio: s.bio,
        avatarUrl: s.avatarUrl,
        websiteUrl: s.websiteUrl,
      })),
    })),
  });
});

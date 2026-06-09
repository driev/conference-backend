import { eq, and, inArray } from 'drizzle-orm';
import { z } from 'zod';
import { db } from '../db/index.js';
import { talks, talkSpeakers, speakers } from '../db/schema.js';

type Executor = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

export const talkBody = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  speakerIds: z.array(z.string().uuid()).optional(),
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  room: z.string().optional().nullable(),
});

export const createTalkBody = talkBody.required({ title: true });

export async function getTalkWithSpeakers(talkId: string) {
  const talk = await db.query.talks.findFirst({
    where: eq(talks.id, talkId),
    with: { talkSpeakers: { with: { speaker: true } } },
  });
  if (!talk) throw new Error(`Talk ${talkId} not found`);
  const { talkSpeakers: ts, ...rest } = talk;
  return { ...rest, speakers: ts.map((r) => r.speaker) };
}

export async function validateSpeakers(speakerIds: string[], orgId: string): Promise<boolean> {
  if (speakerIds.length === 0) return true;
  const found = await db
    .select({ id: speakers.id })
    .from(speakers)
    .where(and(inArray(speakers.id, speakerIds), eq(speakers.organisationId, orgId)));
  return found.length === speakerIds.length;
}

export async function replaceTalkSpeakers(tx: Executor, talkId: string, speakerIds: string[]) {
  await tx.delete(talkSpeakers).where(eq(talkSpeakers.talkId, talkId));
  if (speakerIds.length > 0) {
    await tx.insert(talkSpeakers).values(speakerIds.map((speakerId) => ({ talkId, speakerId })));
  }
}

export function isUniqueViolation(err: unknown): boolean {
  if (typeof err !== 'object' || err === null) return false;
  const e = err as Record<string, unknown>;
  if (e.code === '23505') return true;
  if (typeof e.cause === 'object' && e.cause !== null) {
    return (e.cause as Record<string, unknown>).code === '23505';
  }
  return false;
}

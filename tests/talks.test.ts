import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { clearDb, createOrg, req } from './helpers.js';

const app = createApp();

async function setup() {
  const { apiKey } = await createOrg();
  const conf = await (
    await req(app, '/conferences', { method: 'POST', apiKey, body: { name: 'Conf', slug: 'conf' } })
  ).json();
  const speaker = await (
    await req(app, '/speakers', { method: 'POST', apiKey, body: { name: 'Ada' } })
  ).json();
  return { apiKey, conf, speaker };
}

describe('talks', () => {
  beforeEach(clearDb);

  it('creates a talk with no speakers', async () => {
    const { apiKey, conf } = await setup();
    const res = await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey,
      body: { title: 'The Event Loop', startsAt: '2026-09-10T10:00:00Z', endsAt: '2026-09-10T10:45:00Z' },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.title).toBe('The Event Loop');
    expect(data.speakers).toEqual([]);
  });

  it('creates a talk with speakers', async () => {
    const { apiKey, conf, speaker } = await setup();
    const res = await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey,
      body: { title: 'Keynote', speakerIds: [speaker.id] },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.speakers).toHaveLength(1);
    expect(data.speakers[0].id).toBe(speaker.id);
  });

  it('rejects speakerIds from another org', async () => {
    const { apiKey: keyA, conf } = await setup();
    const { apiKey: keyB } = await createOrg('Org B');
    const otherSpeaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey: keyB, body: { name: 'Grace' } })
    ).json();

    const res = await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey: keyA,
      body: { title: 'Talk', speakerIds: [otherSpeaker.id] },
    });
    expect(res.status).toBe(400);
  });

  it('lists talks ordered by startsAt', async () => {
    const { apiKey, conf } = await setup();
    await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey,
      body: { title: 'Second', startsAt: '2026-09-10T14:00:00Z' },
    });
    await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey,
      body: { title: 'First', startsAt: '2026-09-10T09:00:00Z' },
    });

    const res = await req(app, `/conferences/${conf.id}/talks`, { apiKey });
    const data = await res.json();
    expect(data[0].title).toBe('First');
    expect(data[1].title).toBe('Second');
  });

  it('patches a talk and replaces speakers', async () => {
    const { apiKey, conf, speaker } = await setup();
    const talk = await (
      await req(app, `/conferences/${conf.id}/talks`, {
        method: 'POST',
        apiKey,
        body: { title: 'Original', speakerIds: [speaker.id] },
      })
    ).json();

    const res = await req(app, `/talks/${talk.id}`, {
      method: 'PATCH',
      apiKey,
      body: { title: 'Updated', speakerIds: [] },
    });
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.title).toBe('Updated');
    expect(data.speakers).toEqual([]);
  });

  it('returns 404 patching a talk from another org', async () => {
    const { apiKey: keyA, conf } = await setup();
    const { apiKey: keyB } = await createOrg('Org B');
    const talk = await (
      await req(app, `/conferences/${conf.id}/talks`, {
        method: 'POST',
        apiKey: keyA,
        body: { title: 'Talk' },
      })
    ).json();

    const res = await req(app, `/talks/${talk.id}`, {
      method: 'PATCH',
      apiKey: keyB,
      body: { title: 'Hijacked' },
    });
    expect(res.status).toBe(404);
  });

  it('deletes a talk', async () => {
    const { apiKey, conf } = await setup();
    const talk = await (
      await req(app, `/conferences/${conf.id}/talks`, {
        method: 'POST',
        apiKey,
        body: { title: 'Bye' },
      })
    ).json();

    expect((await req(app, `/talks/${talk.id}`, { method: 'DELETE', apiKey })).status).toBe(204);

    const list = await (await req(app, `/conferences/${conf.id}/talks`, { apiKey })).json();
    expect(list).toHaveLength(0);
  });
});

import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { clearDb, createOrg, req } from './helpers.js';

const app = createApp();

describe('schedule', () => {
  beforeEach(clearDb);

  it('returns 404 for an unknown slug', async () => {
    const res = await app.request('/schedule/no-such-conf');
    expect(res.status).toBe(404);
  });

  it('returns 404 for a draft conference', async () => {
    const { apiKey } = await createOrg();
    await req(app, '/conferences', {
      method: 'POST',
      apiKey,
      body: { name: 'Draft Conf', slug: 'draft-conf' },
    });

    const res = await app.request('/schedule/draft-conf');
    expect(res.status).toBe(404);
  });

  it('returns the full schedule for a published conference', async () => {
    const { apiKey } = await createOrg();
    const conf = await (
      await req(app, '/conferences', {
        method: 'POST',
        apiKey,
        body: { name: 'Live Conf', slug: 'live-conf', location: 'Berlin', status: 'published' },
      })
    ).json();
    const speaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey, body: { name: 'Ada Lovelace' } })
    ).json();
    await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey,
      body: {
        title: 'Keynote',
        startsAt: '2026-09-10T10:00:00Z',
        endsAt: '2026-09-10T10:45:00Z',
        room: 'Main Stage',
        speakerIds: [speaker.id],
      },
    });

    const res = await app.request('/schedule/live-conf');
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.conference.name).toBe('Live Conf');
    expect(data.conference.location).toBe('Berlin');
    expect(data.talks).toHaveLength(1);
    expect(data.talks[0].title).toBe('Keynote');
    expect(data.talks[0].speakers[0].name).toBe('Ada Lovelace');
  });

  it('returns talks ordered by startsAt', async () => {
    const { apiKey } = await createOrg();
    const conf = await (
      await req(app, '/conferences', {
        method: 'POST',
        apiKey,
        body: { name: 'Ordered', slug: 'ordered', status: 'published' },
      })
    ).json();
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

    const data = await (await app.request('/schedule/ordered')).json();
    expect(data.talks[0].title).toBe('First');
    expect(data.talks[1].title).toBe('Second');
  });
});

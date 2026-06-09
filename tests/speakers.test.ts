import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { clearDb, createOrg, req } from './helpers.js';

const app = createApp();

describe('speakers', () => {
  beforeEach(clearDb);

  it('returns 400 for a malformed avatarUrl', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/speakers', {
      method: 'POST',
      apiKey,
      body: { name: 'Ada', avatarUrl: 'not-a-url' },
    });
    expect(res.status).toBe(400);
  });

  it('returns 400 when name is empty', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/speakers', { method: 'POST', apiKey, body: { name: '' } });
    expect(res.status).toBe(400);
  });

  it('creates a speaker', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/speakers', {
      method: 'POST',
      apiKey,
      body: { name: 'Ada Lovelace', bio: 'Mathematician', avatarUrl: 'https://example.com/ada.jpg' },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.name).toBe('Ada Lovelace');
    expect(data.avatarUrl).toBe('https://example.com/ada.jpg');
  });

  it('lists only own org speakers', async () => {
    const { apiKey: keyA } = await createOrg('Org A');
    const { apiKey: keyB } = await createOrg('Org B');
    await req(app, '/speakers', { method: 'POST', apiKey: keyA, body: { name: 'Ada' } });
    await req(app, '/speakers', { method: 'POST', apiKey: keyB, body: { name: 'Grace' } });

    const res = await req(app, '/speakers', { apiKey: keyA });
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].name).toBe('Ada');
  });

  it('gets a speaker by id', async () => {
    const { apiKey } = await createOrg();
    const speaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey, body: { name: 'Ada' } })
    ).json();

    const res = await req(app, `/speakers/${speaker.id}`, { apiKey });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(speaker.id);
  });

  it('returns 404 for another org speaker', async () => {
    const { apiKey: keyA } = await createOrg('Org A');
    const { apiKey: keyB } = await createOrg('Org B');
    const speaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey: keyA, body: { name: 'Ada' } })
    ).json();

    const res = await req(app, `/speakers/${speaker.id}`, { apiKey: keyB });
    expect(res.status).toBe(404);
  });

  it('patches a speaker', async () => {
    const { apiKey } = await createOrg();
    const speaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey, body: { name: 'Ada' } })
    ).json();

    const res = await req(app, `/speakers/${speaker.id}`, {
      method: 'PATCH',
      apiKey,
      body: { bio: 'Pioneer of computing' },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).bio).toBe('Pioneer of computing');
  });

  it('returns 404 patching another org speaker', async () => {
    const { apiKey: keyA } = await createOrg('Org A');
    const { apiKey: keyB } = await createOrg('Org B');
    const speaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey: keyA, body: { name: 'Ada' } })
    ).json();

    const res = await req(app, `/speakers/${speaker.id}`, {
      method: 'PATCH',
      apiKey: keyB,
      body: { name: 'Hijacked' },
    });
    expect(res.status).toBe(404);
  });

  it('deletes a speaker', async () => {
    const { apiKey } = await createOrg();
    const speaker = await (
      await req(app, '/speakers', { method: 'POST', apiKey, body: { name: 'Ada' } })
    ).json();

    expect((await req(app, `/speakers/${speaker.id}`, { method: 'DELETE', apiKey })).status).toBe(204);
    expect((await req(app, `/speakers/${speaker.id}`, { apiKey })).status).toBe(404);
  });
});

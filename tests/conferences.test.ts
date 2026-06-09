import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app.js';
import { clearDb, createOrg, req } from './helpers.js';

const app = createApp();

describe('conferences', () => {
  beforeEach(clearDb);

  it('returns 400 for a malformed UUID in the path', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/conferences/not-a-uuid', { apiKey });
    expect(res.status).toBe(400);
  });

  it('returns 400 with documented error shape on validation failure', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/conferences', {
      method: 'POST',
      apiKey,
      body: { name: '' },
    });
    expect(res.status).toBe(400);
    const data = await res.json();
    expect(typeof data.error).toBe('string');
    expect(data.error.length).toBeGreaterThan(0);
  });

  it('returns 401 with no API key', async () => {
    const res = await req(app, '/conferences');
    expect(res.status).toBe(401);
  });

  it('creates a conference', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/conferences', {
      method: 'POST',
      apiKey,
      body: { name: 'JSConf EU', slug: 'jsconf-eu', startDate: '2026-09-10', endDate: '2026-09-11' },
    });
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.slug).toBe('jsconf-eu');
    expect(data.status).toBe('draft');
  });

  it('returns 409 on duplicate slug', async () => {
    const { apiKey } = await createOrg();
    const body = { name: 'JSConf EU', slug: 'jsconf-eu' };
    await req(app, '/conferences', { method: 'POST', apiKey, body });
    const res = await req(app, '/conferences', { method: 'POST', apiKey, body });
    expect(res.status).toBe(409);
  });

  it('returns 409 when PATCH would create a duplicate slug', async () => {
    const { apiKey } = await createOrg();
    await req(app, '/conferences', { method: 'POST', apiKey, body: { name: 'A', slug: 'a-slug' } });
    const b = await (
      await req(app, '/conferences', { method: 'POST', apiKey, body: { name: 'B', slug: 'b-slug' } })
    ).json();

    const res = await req(app, `/conferences/${b.id}`, {
      method: 'PATCH',
      apiKey,
      body: { slug: 'a-slug' },
    });
    expect(res.status).toBe(409);
  });

  it('returns 400 for an invalid status enum', async () => {
    const { apiKey } = await createOrg();
    const res = await req(app, '/conferences', {
      method: 'POST',
      apiKey,
      body: { name: 'C', slug: 'c', status: 'archived' },
    });
    expect(res.status).toBe(400);
  });

  it('lists only own org conferences', async () => {
    const { apiKey: keyA } = await createOrg('Org A');
    const { apiKey: keyB } = await createOrg('Org B');
    await req(app, '/conferences', { method: 'POST', apiKey: keyA, body: { name: 'A Conf', slug: 'a-conf' } });
    await req(app, '/conferences', { method: 'POST', apiKey: keyB, body: { name: 'B Conf', slug: 'b-conf' } });

    const res = await req(app, '/conferences', { apiKey: keyA });
    const data = await res.json();
    expect(data).toHaveLength(1);
    expect(data[0].slug).toBe('a-conf');
  });

  it('gets a conference by id', async () => {
    const { apiKey } = await createOrg();
    const created = await (
      await req(app, '/conferences', { method: 'POST', apiKey, body: { name: 'C', slug: 'c' } })
    ).json();

    const res = await req(app, `/conferences/${created.id}`, { apiKey });
    expect(res.status).toBe(200);
    expect((await res.json()).id).toBe(created.id);
  });

  it('returns 404 for another org conference', async () => {
    const { apiKey: keyA } = await createOrg('Org A');
    const { apiKey: keyB } = await createOrg('Org B');
    const conf = await (
      await req(app, '/conferences', { method: 'POST', apiKey: keyA, body: { name: 'A', slug: 'a' } })
    ).json();

    const res = await req(app, `/conferences/${conf.id}`, { apiKey: keyB });
    expect(res.status).toBe(404);
  });

  it('patches a draft conference including slug', async () => {
    const { apiKey } = await createOrg();
    const conf = await (
      await req(app, '/conferences', { method: 'POST', apiKey, body: { name: 'Old', slug: 'old-slug' } })
    ).json();

    const res = await req(app, `/conferences/${conf.id}`, {
      method: 'PATCH',
      apiKey,
      body: { slug: 'new-slug', status: 'published' },
    });
    expect(res.status).toBe(200);
    expect((await res.json()).slug).toBe('new-slug');
  });

  it('rejects slug change on a published conference', async () => {
    const { apiKey } = await createOrg();
    const conf = await (
      await req(app, '/conferences', {
        method: 'POST',
        apiKey,
        body: { name: 'Conf', slug: 'my-slug', status: 'published' },
      })
    ).json();

    const res = await req(app, `/conferences/${conf.id}`, {
      method: 'PATCH',
      apiKey,
      body: { slug: 'different-slug' },
    });
    expect(res.status).toBe(400);
  });

  it('returns 404 patching another org conference', async () => {
    const { apiKey: keyA } = await createOrg('Org A');
    const { apiKey: keyB } = await createOrg('Org B');
    const conf = await (
      await req(app, '/conferences', { method: 'POST', apiKey: keyA, body: { name: 'A', slug: 'a' } })
    ).json();

    const res = await req(app, `/conferences/${conf.id}`, {
      method: 'PATCH',
      apiKey: keyB,
      body: { name: 'Hijacked' },
    });
    expect(res.status).toBe(404);
  });

  it('deletes a conference and its talks', async () => {
    const { apiKey } = await createOrg();
    const conf = await (
      await req(app, '/conferences', { method: 'POST', apiKey, body: { name: 'Del', slug: 'del' } })
    ).json();
    await req(app, `/conferences/${conf.id}/talks`, {
      method: 'POST',
      apiKey,
      body: { title: 'A talk' },
    });

    const del = await req(app, `/conferences/${conf.id}`, { method: 'DELETE', apiKey });
    expect(del.status).toBe(204);

    const get = await req(app, `/conferences/${conf.id}`, { apiKey });
    expect(get.status).toBe(404);
  });
});

import { Hono } from 'hono';
import { requireApiKey } from './middleware/auth.js';
import type { AuthEnv } from './middleware/auth.js';
import { conferencesRouter } from './routes/conferences.js';
import { speakersRouter } from './routes/speakers.js';
import { talksRouter } from './routes/talks.js';
import { scheduleRouter } from './routes/schedule.js';

export function createApp() {
  const app = new Hono<AuthEnv>();

  app.use('/conferences', requireApiKey);
  app.use('/conferences/*', requireApiKey);
  app.use('/speakers', requireApiKey);
  app.use('/speakers/*', requireApiKey);
  app.use('/talks/*', requireApiKey);

  app.route('/conferences', conferencesRouter);
  app.route('/speakers', speakersRouter);
  app.route('/talks', talksRouter);
  app.route('/schedule', scheduleRouter);

  app.onError((err, c) => {
    console.error(err);
    return c.json({ error: 'Internal server error' }, 500);
  });

  return app;
}

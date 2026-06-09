import { execSync } from 'child_process';
import { existsSync, readdirSync } from 'fs';
import { resolve } from 'path';
import { TEST_DATABASE_URL } from './constants.js';

export async function setup() {
  const migrationsDir = resolve(process.cwd(), 'drizzle');
  const hasMigrations =
    existsSync(migrationsDir) && readdirSync(migrationsDir).some((f) => f.endsWith('.sql'));

  if (!hasMigrations) {
    execSync('npm run db:generate', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    });
  }

  const { default: postgres } = await import('postgres');
  const { drizzle } = await import('drizzle-orm/postgres-js');
  const { migrate } = await import('drizzle-orm/postgres-js/migrator');

  const client = postgres(TEST_DATABASE_URL);
  await migrate(drizzle(client), { migrationsFolder: migrationsDir });
  await client.end();
}

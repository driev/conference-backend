import 'dotenv/config';
import { randomUUID } from 'crypto';
import { db, client } from '../src/db/index.js';
import { organisations } from '../src/db/schema.js';

const name = process.argv[2];
if (!name) {
  console.error('Usage: npx tsx scripts/create-org.ts <name>');
  process.exit(1);
}

const apiKey = randomUUID();
const [org] = await db.insert(organisations).values({ name, apiKey }).returning();

console.log('Organisation created:');
console.log(`  ID:      ${org.id}`);
console.log(`  Name:    ${org.name}`);
console.log(`  API Key: ${apiKey}`);
console.log('\nSave the API key — it will not be shown again.');

await client.end();

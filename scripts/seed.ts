import 'dotenv/config';

const apiKey = process.argv[2];
const baseUrl = process.argv[3] ?? 'http://localhost:3000';

if (!apiKey) {
  console.error('Usage: npx tsx scripts/seed.ts <api-key> [base-url]');
  process.exit(1);
}

async function api(method: string, path: string, body?: unknown) {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`${method} ${path} → ${res.status}: ${JSON.stringify(err)}`);
  }
  return res.json();
}

const conference = await api('POST', '/conferences', {
  name: 'JSConf EU 2026',
  slug: 'jsconf-eu-2026',
  description: 'Europe\'s favourite JavaScript conference, back in Berlin.',
  location: 'Berlin, Germany',
  startDate: '2026-09-10',
  endDate: '2026-09-11',
  status: 'published',
});
console.log(`✓ Conference: ${conference.name} (${conference.slug})`);

const [ada, grace, brendan] = await Promise.all([
  api('POST', '/speakers', {
    name: 'Ada Lovelace',
    bio: 'Mathematician and writer, the world\'s first programmer.',
    avatarUrl: 'https://example.com/avatars/ada.jpg',
    websiteUrl: 'https://example.com/ada',
  }),
  api('POST', '/speakers', {
    name: 'Grace Hopper',
    bio: 'Pioneer of computer programming and inventor of the compiler.',
    avatarUrl: 'https://example.com/avatars/grace.jpg',
  }),
  api('POST', '/speakers', {
    name: 'Brendan Eich',
    bio: 'Creator of JavaScript.',
    avatarUrl: 'https://example.com/avatars/brendan.jpg',
    websiteUrl: 'https://example.com/brendan',
  }),
]);
console.log(`✓ Speakers: ${[ada, grace, brendan].map((s) => s.name).join(', ')}`);

const talks = [
  {
    title: 'Opening Keynote: The Next Decade of JavaScript',
    description: 'Where the language has been, and where it\'s headed.',
    speakerIds: [brendan.id],
    startsAt: '2026-09-10T09:30:00Z',
    endsAt: '2026-09-10T10:15:00Z',
    room: 'Main Stage',
  },
  {
    title: 'The Event Loop Demystified',
    description: 'A deep dive into how JavaScript\'s concurrency model actually works.',
    speakerIds: [ada.id],
    startsAt: '2026-09-10T10:30:00Z',
    endsAt: '2026-09-10T11:15:00Z',
    room: 'Main Stage',
  },
  {
    title: 'Compilers Don\'t Have to Be Magic',
    description: 'Building a toy compiler in JavaScript to understand how they work.',
    speakerIds: [grace.id],
    startsAt: '2026-09-10T11:30:00Z',
    endsAt: '2026-09-10T12:15:00Z',
    room: 'Main Stage',
  },
  {
    title: 'Panel: The Future of Web Standards',
    description: 'An open discussion on the TC39 process and what\'s next for the web.',
    speakerIds: [ada.id, grace.id, brendan.id],
    startsAt: '2026-09-10T14:00:00Z',
    endsAt: '2026-09-10T15:00:00Z',
    room: 'Main Stage',
  },
  {
    title: 'TBD — Lightning Talks',
    description: 'Five-minute talks from the community. Submit yours at the registration desk.',
    speakerIds: [],
    startsAt: '2026-09-10T15:30:00Z',
    endsAt: '2026-09-10T16:30:00Z',
    room: 'Workshop Room',
  },
];

const created = await Promise.all(
  talks.map((talk) => api('POST', `/conferences/${conference.id}/talks`, talk)),
);
for (const t of created) console.log(`✓ Talk: ${t.title}`);

console.log(`\nPublic schedule: ${baseUrl}/schedule/${conference.slug}`);

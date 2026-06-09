# conference-backend

A multi-tenant backend for managing developer conferences. Each tenant (organisation) can manage its own conferences, speakers, and talk schedules. A public endpoint serves the schedule for any published conference.

## Stack

- **Runtime**: Node.js (LTS) + TypeScript
- **Framework**: [Hono](https://hono.dev)
- **Database**: PostgreSQL (via Docker Compose)
- **ORM**: [Drizzle ORM](https://orm.drizzle.team)
- **Validation**: Zod via `@hono/zod-validator`
- **Tests**: Vitest (integration tests against a real database)

For the reasoning behind these choices see [`docs/tech.md`](docs/tech.md).

## Getting started

### Prerequisites

- Node.js 20+
- Docker

### Setup

```bash
npm install
cp .env.example .env

npm run docker:up      # start Postgres
npm run db:generate    # generate migrations from schema
npm run db:migrate     # apply migrations

npx tsx scripts/create-org.ts "My Org"   # prints API key once — save it

npm run dev            # http://localhost:3000

npx tsx scripts/seed.ts <api-key> http://localhost:3000 # create some dummy data

```

Set `PORT` in `.env` to change the default port.

### Running tests

Tests use a separate database on port 5433 and never touch dev data.

```bash
npm run docker:test:up
npm test
```

Migrations are applied to the test database automatically before the first run.

## Docs

- [`docs/api.md`](docs/api.md) — endpoint reference, auth, request/response shapes, error codes
- [`docs/db_schema.md`](docs/db_schema.md) — ER diagram, design rationale, schema notes
- [`docs/tech.md`](docs/tech.md) — framework and library choices, trade-offs, what was deliberately skipped

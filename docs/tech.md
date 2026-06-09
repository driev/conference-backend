# Tech and design choices

## Framework: Hono

Most of my recent TypeScript experience is with Next.js, which is overkill for a pure backend. Hono is a lightweight,
Express-like framework that runs on Node.js (and other runtimes). It has first-class TypeScript support, built-in Zod
integration for request validation, and a familiar routing API similar to Gin (Go) or FastAPI (Python).

## Database: PostgreSQL

Relational data with clear foreign-key relationships (organisations → conferences → talks, organisations → speakers) is
a natural fit for SQL. PostgreSQL is a safe production-realistic choice.

Running via Docker Compose so there's zero manual install — `npm run docker:up` starts the DB.

## ORM: Drizzle ORM

Drizzle gives us:

- Type-safe query builder with full TypeScript inference
- Schema-as-code (no separate migration files to maintain by hand)
- Lightweight — no "magic" ActiveRecord-style ORM overhead
- `drizzle-kit` for generating and running migrations

Alternative considered: Prisma. Rejected because Drizzle is more transparent (raw SQL close to the surface) and easier
to explain live without needing to understand Prisma's engine layer.

## Validation: Zod

Hono has a `@hono/zod-validator` middleware that ties Zod schemas directly to route handlers and produces typed request
bodies. Same schemas double as documentation.

## Runtime & tooling

- **Node.js** (LTS) + **npm**
- **TypeScript** compiled via `tsc` (or `tsx` for dev watch mode)
- **Docker Compose** for Postgres — `npm run docker:up` / `npm run docker:down`

## Super admin

Organisations are created via a local script (`scripts/create-org.ts`) rather than an HTTP endpoint. An open
`POST /organisations` route would let anyone register, which is unnecessary exposure for an infrequent admin operation.

The script accepts a name, inserts the organisation row, generates an API key, and prints it to stdout. The key is only
visible at creation time. Run it directly against the database:

```
npx tsx scripts/create-org.ts "JSConf EU"
```

## What I deliberately skipped

### Auth & multi-user

- **User accounts within an organisation** — currently one shared API key per org. A real product would have individual
  user accounts (admin, editor, viewer roles) so changes can be attributed.
- **Session cookies + browser login** — for a future admin UI. Would need login/logout endpoints and secure session
  cookies (`HttpOnly`, `SameSite=Lax`, `Secure`).
- **CSRF protection** — explicitly *not* needed today because auth is via the `X-API-Key` header, not cookies. Becomes
  load-bearing the moment cookie-based session auth is added.
- **OAuth / SSO** — Google/GitHub/Workspaces login for org members instead of a username/password store.
- **Secret hashing** — API keys are stored as plain UUIDs. In production they should be hashed (e.g. SHA-256 or argon2)
  with a timing-safe comparison on lookup, so a database leak doesn't immediately compromise every tenant.

### Production hardening

- **Observability** — structured request/response logs, metrics (request rate, latency, error rate), and distributed
  tracing. The current `console.error(err)` in `onError` is a stand-in.
- **Health checks** — `/healthz` (liveness) and `/readyz` (DB connectivity) for orchestrators and load balancers.
- **Graceful shutdown** — handle `SIGTERM` to stop accepting new connections, drain in-flight requests, and close the
  postgres pool before exiting.
- **Audit log** — record who changed what and when. Depends on user accounts existing.
- **API versioning** — `/v1/...` prefix or `Accept` headers so the contract can evolve without breaking integrators.
- **Rate limiting** — Hono middleware or an upstream proxy. Especially important on the public schedule and on any
  future login endpoints.
- **CORS** — not configured. Only matters once a browser-based frontend consumes `/schedule/:slug`; would add Hono's
  CORS middleware on just the public route at that point.
- **Pagination** — list endpoints return all results. Would add cursor-based pagination at scale.
- **Soft deletes** — hard deletes for now. Would use `deleted_at` timestamps at scale for audit and accidental-delete
  recovery.

### Other

- **Speaker deduplication across organisations** — speakers are organisation-scoped; cross-organisation speaker profiles
  are out of scope.
- **Timetable clash detection** — room-level overlap checks are straightforward, but speaker-level conflicts (same
  speaker in two simultaneous talks) are a more interesting constraint. Deciding which to enforce, and whether
  violations are hard errors or warnings, warrants a product decision before implementing.
- **Frontend** — out of scope per instructions.
- **Super admin endpoints** — organisation creation is handled via a local script for now. A real multi-tenant
  deployment would need a super admin interface for provisioning organisations without direct database access.

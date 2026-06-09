# API design

## Authentication

All admin endpoints require the header:

```
X-API-Key: <organisation api key>
```

The middleware resolves the organisation from the key and attaches it to the request context. A missing or unknown key
returns `401`. The public schedule endpoint has no auth requirement.

## Conferences

All routes scoped to the authenticated organisation.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/conferences` | List all conferences for the organisation |
| `POST` | `/conferences` | Create a conference |
| `GET` | `/conferences/:id` | Get a single conference |
| `PATCH` | `/conferences/:id` | Update a conference (partial update) |
| `DELETE` | `/conferences/:id` | Delete a conference (and cascade-delete its talks) |

### Conference body (POST / PATCH)

```json
{
  "name": "JSConf EU 2026",
  "slug": "jsconf-eu-2026",
  "description": "...",
  "location": "Berlin, Germany",
  "startDate": "2026-09-10",
  "endDate": "2026-09-11",
  "status": "draft"
}
```

`status` is one of `draft`, `published`, `cancelled`.

`slug` is only editable while `status = draft`. Attempting to change it on a published or cancelled conference returns
`400`.

## Speakers

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/speakers` | List all speakers for the organisation |
| `POST` | `/speakers` | Create a speaker |
| `GET` | `/speakers/:id` | Get a single speaker |
| `PATCH` | `/speakers/:id` | Update a speaker |
| `DELETE` | `/speakers/:id` | Delete a speaker |

### Speaker body

```json
{
  "name": "Ada Lovelace",
  "bio": "...",
  "avatarUrl": "https://...",
  "websiteUrl": "https://..."
}
```

## Talks

Talks live under a conference but are also addressable directly.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/conferences/:conferenceId/talks` | List all talks for a conference |
| `POST` | `/conferences/:conferenceId/talks` | Add a talk to a conference |
| `GET` | `/talks/:id` | Get a single talk |
| `PATCH` | `/talks/:id` | Update a talk |
| `DELETE` | `/talks/:id` | Delete a talk |

### Talk body

```json
{
  "title": "The Event Loop Demystified",
  "description": "...",
  "speakerIds": ["uuid", "uuid"],
  "startsAt": "2026-09-10T10:00:00Z",
  "endsAt": "2026-09-10T10:45:00Z",
  "room": "Main Stage"
}
```

`speakerIds` may be an empty array for TBD / panel sessions.

## Public schedule

No authentication required. Only returns conferences with `status = published`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/schedule/:slug` | Full schedule for a published conference |

### Response shape

```json
{
  "conference": {
    "name": "JSConf EU 2026",
    "description": "...",
    "location": "Berlin, Germany",
    "startDate": "2026-09-10",
    "endDate": "2026-09-11"
  },
  "talks": [
    {
      "id": "...",
      "title": "The Event Loop Demystified",
      "description": "...",
      "startsAt": "2026-09-10T10:00:00Z",
      "endsAt": "2026-09-10T10:45:00Z",
      "room": "Main Stage",
      "speakers": [
        {
          "name": "Ada Lovelace",
          "bio": "...",
          "avatarUrl": "https://...",
          "websiteUrl": "https://..."
        }
      ]
    }
  ]
}
```

Talks are ordered by `startsAt` ascending.

## Error responses

All errors return JSON with a consistent shape:

```json
{ "error": "human-readable message" }
```

| Status | When |
|--------|------|
| `400` | Validation failure (Zod) |
| `401` | Missing or invalid API key |
| `404` | Resource not found, or belongs to a different organisation |
| `409` | Unique constraint violation (e.g. duplicate slug) |

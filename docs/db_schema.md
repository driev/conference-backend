# Data model

## Design rationale

The core multi-tenancy unit is an **organisation** — a company or community that runs conferences. Every resource is
scoped to an organisation via a foreign key; the API key middleware ensures organisations only see their own data.

**Speakers** are organisation-level (not conference-level) so the same speaker profile can be reused across multiple
conferences without duplicating bio/avatar data.

**Talks** are the join between a conference and a speaker, plus the scheduling metadata (time, room). A talk can have a
null `speaker_id` to represent TBD or panel slots.

The `conferences.status` column (`draft` | `published` | `cancelled`) gates the public schedule endpoint — only
published conferences are visible without an API key.

## Entity-relationship diagram

```mermaid
erDiagram
    organisations {
        uuid id PK
        varchar name
        varchar api_key UK
        timestamp created_at
    }

    conferences {
        uuid id PK
        uuid organisation_id FK
        varchar name
        varchar slug UK
        text description
        varchar location
        date start_date
        date end_date
        varchar status
        timestamp created_at
        timestamp updated_at
    }

    speakers {
        uuid id PK
        uuid organisation_id FK
        varchar name
        text bio
        varchar avatar_url
        varchar website_url
        timestamp created_at
    }

    talks {
        uuid id PK
        uuid conference_id FK
        varchar title
        text description
        timestamp starts_at
        timestamp ends_at
        varchar room
        timestamp created_at
    }

    talk_speakers {
        uuid talk_id FK
        uuid speaker_id FK
    }

    organisations ||--o{ conferences : "owns"
    organisations ||--o{ speakers : "owns"
    conferences ||--o{ talks : "contains"
    talks ||--o{ talk_speakers : ""
    speakers ||--o{ talk_speakers : ""
```

## Notes

- `conferences.slug` is unique globally (not just per organisation) so it can be used in public URLs without leaking
  organisation structure.
- `api_key` is stored as a plain random string (e.g. `crypto.randomUUID()`). In production, store a hash and compare
  with a timing-safe function.
- `talk_speakers` is a join table — a talk can have zero or more speakers (zero supports TBD/panel sessions).
- No `tracks` table for now; a `room` string on talks is enough to power a schedule view. A tracks table would be a
  natural next addition.

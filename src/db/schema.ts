import {
  pgTable, pgEnum, uuid, varchar, text, date, timestamp, primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const conferenceStatus = pgEnum('conference_status', ['draft', 'published', 'cancelled']);

export const organisations = pgTable('organisations', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: varchar('name', { length: 255 }).notNull(),
  apiKey: varchar('api_key', { length: 255 }).notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const conferences = pgTable('conferences', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id')
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull().unique(),
  description: text('description'),
  location: varchar('location', { length: 255 }),
  startDate: date('start_date'),
  endDate: date('end_date'),
  status: conferenceStatus('status').notNull().default('draft'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow().$onUpdate(() => new Date()),
});

export const speakers = pgTable('speakers', {
  id: uuid('id').primaryKey().defaultRandom(),
  organisationId: uuid('organisation_id')
    .notNull()
    .references(() => organisations.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  bio: text('bio'),
  avatarUrl: varchar('avatar_url', { length: 1024 }),
  websiteUrl: varchar('website_url', { length: 1024 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const talks = pgTable('talks', {
  id: uuid('id').primaryKey().defaultRandom(),
  conferenceId: uuid('conference_id')
    .notNull()
    .references(() => conferences.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startsAt: timestamp('starts_at'),
  endsAt: timestamp('ends_at'),
  room: varchar('room', { length: 255 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const talkSpeakers = pgTable('talk_speakers', {
  talkId: uuid('talk_id')
    .notNull()
    .references(() => talks.id, { onDelete: 'cascade' }),
  speakerId: uuid('speaker_id')
    .notNull()
    .references(() => speakers.id, { onDelete: 'cascade' }),
}, (t) => [primaryKey({ columns: [t.talkId, t.speakerId] })]);

export const organisationsRelations = relations(organisations, ({ many }) => ({
  conferences: many(conferences),
  speakers: many(speakers),
}));

export const conferencesRelations = relations(conferences, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [conferences.organisationId],
    references: [organisations.id],
  }),
  talks: many(talks),
}));

export const speakersRelations = relations(speakers, ({ one, many }) => ({
  organisation: one(organisations, {
    fields: [speakers.organisationId],
    references: [organisations.id],
  }),
  talkSpeakers: many(talkSpeakers),
}));

export const talksRelations = relations(talks, ({ one, many }) => ({
  conference: one(conferences, {
    fields: [talks.conferenceId],
    references: [conferences.id],
  }),
  talkSpeakers: many(talkSpeakers),
}));

export const talkSpeakersRelations = relations(talkSpeakers, ({ one }) => ({
  talk: one(talks, { fields: [talkSpeakers.talkId], references: [talks.id] }),
  speaker: one(speakers, { fields: [talkSpeakers.speakerId], references: [speakers.id] }),
}));

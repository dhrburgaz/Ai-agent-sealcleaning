import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps } from './helpers';

export const appointments = sqliteTable('appointments', {
  id: idColumn(),
  leadId: text('lead_id'),
  jobId: text('job_id'),
  kind: text('kind').notNull().default('site_visit'), // site_visit | job
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }).notNull(),
  travelBufferMinutes: integer('travel_buffer_minutes').notNull().default(15),
  status: text('status').notNull().default('proposed'), // proposed | confirmed | cancelled | completed
  timezone: text('timezone').notNull().default('Europe/Amsterdam'),
  ...timestamps(),
});

export const calendarEvents = sqliteTable('calendar_events', {
  id: idColumn(),
  appointmentId: text('appointment_id'),
  kind: text('kind').notNull(), // site_visit | job | supplier_pickup | rental_pickup | rental_return | disposal_trip | private_block
  title: text('title').notNull(),
  startsAt: integer('starts_at', { mode: 'timestamp_ms' }).notNull(),
  endsAt: integer('ends_at', { mode: 'timestamp_ms' }).notNull(),
  crewMemberId: text('crew_member_id'),
  jobId: text('job_id'),
  icsUid: text('ics_uid'),
  ...timestamps(),
});

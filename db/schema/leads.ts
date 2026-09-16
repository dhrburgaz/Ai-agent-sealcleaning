import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps, boolInt } from './helpers';

export const LEAD_STATES = [
  'NEW',
  'REVIEWED',
  'NEEDS_INFO',
  'CONTACT_DRAFTED',
  'CONTACTED',
  'REPLIED',
  'QUALIFIED',
  'SITE_VISIT_PROPOSED',
  'SITE_VISIT_BOOKED',
  'ESTIMATE_IN_PROGRESS',
  'ESTIMATE_READY',
  'QUOTE_DRAFTED',
  'QUOTE_SENT',
  'NEGOTIATING',
  'WON',
  'SCHEDULED',
  'IN_PROGRESS',
  'COMPLETED',
  'INVOICED_REFERENCE',
  'REVIEW_REQUESTED',
  'LOST',
  'ARCHIVED',
] as const;
export type LeadState = (typeof LEAD_STATES)[number];

export const LEAD_PRIORITIES = [
  'hot',
  'warm',
  'cold',
  'insufficient_info',
  'probably_decline',
  'bundle_opportunity',
] as const;
export type LeadPriority = (typeof LEAD_PRIORITIES)[number];

export const leadSources = sqliteTable('lead_sources', {
  id: idColumn(),
  kind: text('kind').notNull(), // manual | facebook_paste | url | screenshot | email | referral | platform | google_business
  externalId: text('external_id'),
  url: text('url'),
  rawText: text('raw_text'),
  ...timestamps(),
});

export const customers = sqliteTable('customers', {
  id: idColumn(),
  name: text('name').notNull(),
  phone: text('phone'),
  email: text('email'),
  address: text('address'),
  postcode: text('postcode'),
  city: text('city'),
  consentChannel: text('consent_channel'),
  optedOut: integer('opted_out', boolInt).notNull().default(false),
  notes: text('notes'),
  ...timestamps(),
});

export const contactMethods = sqliteTable('contact_methods', {
  id: idColumn(),
  customerId: text('customer_id').notNull(),
  kind: text('kind').notNull(), // phone | email | whatsapp | facebook | other
  value: text('value').notNull(),
  isPrimary: integer('is_primary', boolInt).notNull().default(false),
  ...timestamps(),
});

export const leads = sqliteTable('leads', {
  id: idColumn(),
  customerId: text('customer_id'),
  leadSourceId: text('lead_source_id'),
  serviceCategory: text('service_category'),
  state: text('state').$type<LeadState>().notNull().default('NEW'),
  priority: text('priority').$type<LeadPriority>(),
  priorityScore: real('priority_score'),
  priorityReasons: text('priority_reasons', { mode: 'json' }).$type<string[]>().default([]),
  location: text('location'),
  postcode: text('postcode'),
  distanceKm: real('distance_km'),
  urgency: text('urgency'), // low | medium | high | unknown
  estimatedScale: text('estimated_scale'),
  budgetCues: text('budget_cues'),
  seeksCheapOnly: integer('seeks_cheap_only', boolInt),
  missingInfo: text('missing_info', { mode: 'json' }).$type<string[]>().default([]),
  dedupeKey: text('dedupe_key'),
  mergedIntoLeadId: text('merged_into_lead_id'),
  nextBestAction: text('next_best_action'),
  ...timestamps(),
});

export const leadEvents = sqliteTable('lead_events', {
  id: idColumn(),
  leadId: text('lead_id').notNull(),
  kind: text('kind').notNull(), // state_transition | note | dedupe_merge | agent_run | manual_edit
  fromState: text('from_state'),
  toState: text('to_state'),
  actor: text('actor').notNull().default('system'),
  detail: text('detail'),
  ...timestamps(),
});

export const messageThreads = sqliteTable('message_threads', {
  id: idColumn(),
  leadId: text('lead_id'),
  customerId: text('customer_id'),
  channel: text('channel').notNull().default('manual'),
  ...timestamps(),
});

export const messages = sqliteTable('messages', {
  id: idColumn(),
  threadId: text('thread_id').notNull(),
  direction: text('direction').notNull(), // inbound | outbound
  body: text('body').notNull(),
  templateKey: text('template_key'),
  language: text('language').notNull().default('nl'),
  status: text('status').notNull().default('draft'), // draft | approved | sent | failed
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const attachments = sqliteTable('attachments', {
  id: idColumn(),
  leadId: text('lead_id'),
  jobId: text('job_id'),
  kind: text('kind').notNull().default('photo'),
  originalFilename: text('original_filename').notNull(),
  storedFilename: text('stored_filename').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  sha256: text('sha256').notNull(),
  ...timestamps(),
});

export const photoAnalyses = sqliteTable('photo_analyses', {
  id: idColumn(),
  attachmentId: text('attachment_id').notNull(),
  imageHash: text('image_hash').notNull(),
  observations: text('observations', { mode: 'json' }).$type<string[]>().default([]),
  possibleScopeItems: text('possible_scope_items', { mode: 'json' }).$type<string[]>().default([]),
  hazardsOrRisks: text('hazards_or_risks', { mode: 'json' }).$type<string[]>().default([]),
  accessObservations: text('access_observations', { mode: 'json' }).$type<string[]>().default([]),
  measurementClaims: text('measurement_claims', { mode: 'json' }).$type<Record<string, unknown>>(),
  questionsToAsk: text('questions_to_ask', { mode: 'json' }).$type<string[]>().default([]),
  overallConfidence: real('overall_confidence'),
  ownerCorrection: text('owner_correction'),
  ...timestamps(),
});

export const followUps = sqliteTable('follow_ups', {
  id: idColumn(),
  leadId: text('lead_id').notNull(),
  sequenceStep: integer('sequence_step').notNull().default(1),
  scheduledAt: integer('scheduled_at', { mode: 'timestamp_ms' }).notNull(),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  status: text('status').notNull().default('scheduled'), // scheduled | sent | cancelled | opted_out
  ...timestamps(),
});

export const reviewRequests = sqliteTable('review_requests', {
  id: idColumn(),
  jobId: text('job_id').notNull(),
  status: text('status').notNull().default('draft'),
  draftText: text('draft_text'),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

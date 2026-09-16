import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps, boolInt } from './helpers';

export const quotes = sqliteTable('quotes', {
  id: idColumn(),
  leadId: text('lead_id').notNull(),
  estimateId: text('estimate_id').notNull(),
  quoteNumber: text('quote_number').notNull().unique(),
  status: text('status').notNull().default('draft'), // draft | approved | sent | accepted | declined | expired
  languageLevel: text('language_level').notNull().default('prijsindicatie'), // prijsindicatie | offerte
  validUntil: integer('valid_until', { mode: 'timestamp_ms' }),
  totalExVat: real('total_ex_vat').notNull(),
  vatAmount: real('vat_amount').notNull(),
  totalIncVat: real('total_inc_vat').notNull(),
  pdfPath: text('pdf_path'),
  demoStyle: integer('demo_style', boolInt).notNull().default(false),
  approvedBy: text('approved_by'),
  approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
  sentAt: integer('sent_at', { mode: 'timestamp_ms' }),
  currentVersion: integer('current_version').notNull().default(1),
  ...timestamps(),
});

export const quoteVersions = sqliteTable('quote_versions', {
  id: idColumn(),
  quoteId: text('quote_id').notNull(),
  version: integer('version').notNull(),
  totalExVat: real('total_ex_vat').notNull(),
  changedLines: text('changed_lines', { mode: 'json' }).$type<string[]>().default([]),
  reason: text('reason'),
  snapshot: text('snapshot', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  ...timestamps(),
});

export const jobs = sqliteTable('jobs', {
  id: idColumn(),
  leadId: text('lead_id').notNull(),
  quoteId: text('quote_id'),
  status: text('status').notNull().default('scheduled'), // scheduled | in_progress | completed
  scheduledStart: integer('scheduled_start', { mode: 'timestamp_ms' }),
  scheduledEnd: integer('scheduled_end', { mode: 'timestamp_ms' }),
  wonAt: integer('won_at', { mode: 'timestamp_ms' }),
  completedAt: integer('completed_at', { mode: 'timestamp_ms' }),
  lostReason: text('lost_reason'),
  ...timestamps(),
});

export const jobTasks = sqliteTable('job_tasks', {
  id: idColumn(),
  jobId: text('job_id').notNull(),
  label: text('label').notNull(),
  estimatedHours: real('estimated_hours'),
  actualHours: real('actual_hours'),
  crewMemberId: text('crew_member_id'),
  ...timestamps(),
});

export const actualCosts = sqliteTable('actual_costs', {
  id: idColumn(),
  jobId: text('job_id').notNull(),
  category: text('category').notNull(), // labour | materials | rental | disposal | travel | subcontractor | unexpected
  description: text('description'),
  amount: real('amount').notNull(),
  daysWorked: real('days_worked'),
  crewSize: integer('crew_size'),
  enteredVia: text('entered_via').notNull().default('form'), // form | voice_dictation
  rawDictation: text('raw_dictation'),
  confirmedAt: integer('confirmed_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const invoiceReferences = sqliteTable('invoice_references', {
  id: idColumn(),
  jobId: text('job_id').notNull(),
  reference: text('reference'),
  finalRevenue: real('final_revenue'),
  vatAmount: real('vat_amount'),
  ...timestamps(),
});

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps, boolInt } from './helpers';

/** Section 25/39: single business profile, service area, regulatory config. */
export const companyProfile = sqliteTable('company_profile', {
  id: idColumn(),
  companyName: text('company_name').notNull(),
  phone: text('phone'),
  email: text('email'),
  website: text('website'),
  kvkNumber: text('kvk_number'),
  vatNumber: text('vat_number'),
  address: text('address'),
  baseCity: text('base_city').notNull().default('Dordrecht'),
  province: text('province').notNull().default('Zuid-Holland'),
  serviceRadiusKm: integer('service_radius_km').notNull().default(35),
  enabledServiceCategories: text('enabled_service_categories', { mode: 'json' })
    .$type<string[]>()
    .notNull()
    .default([]),
  ownerLanguage: text('owner_language').notNull().default('tr'),
  customerLanguage: text('customer_language').notNull().default('nl'),
  vatRatePercent: real('vat_rate_percent').notNull().default(21),
  vatRuleSource: text('vat_rule_source'),
  vatRuleCheckedAt: integer('vat_rule_checked_at', { mode: 'timestamp_ms' }),
  defaultTargetMarginRate: real('default_target_margin_rate').notNull().default(0.3),
  defaultMinimumTargetGrossProfit: real('default_minimum_target_gross_profit').notNull().default(1200),
  defaultMinimumJobCharge: real('default_minimum_job_charge').notNull().default(150),
  approvalMode: text('approval_mode').notNull().default('smart_approval'),
  dataRetentionDays: integer('data_retention_days').notNull().default(730),
  setupCompleted: integer('setup_completed', boolInt).notNull().default(false),
  ...timestamps(),
});

/** Section 36: single-owner authentication. */
export const users = sqliteTable('users', {
  id: idColumn(),
  displayName: text('display_name').notNull(),
  passwordHash: text('password_hash').notNull(),
  pwaPin: text('pwa_pin'),
  idleTimeoutMinutes: integer('idle_timeout_minutes').notNull().default(30),
  ...timestamps(),
});

/** Section 9: per-agent configuration (each of the 20 logical agents). */
export const agentConfig = sqliteTable('agent_config', {
  id: idColumn(),
  agentKey: text('agent_key').notNull().unique(),
  displayName: text('display_name').notNull(),
  enabled: integer('enabled', boolInt).notNull().default(true),
  costTier: text('cost_tier').notNull().default('tier0'),
  cachePolicy: text('cache_policy'),
  approvalBoundary: text('approval_boundary'),
  fallbackBehavior: text('fallback_behavior'),
  notes: text('notes'),
  ...timestamps(),
});

/** Section 15: AI provider router config; requires explicit key + budget > 0 to activate. */
export const externalConnectors = sqliteTable('external_connectors', {
  id: idColumn(),
  kind: text('kind').notNull(),
  name: text('name').notNull(),
  enabled: integer('enabled', boolInt).notNull().default(false),
  config: text('config', { mode: 'json' }).$type<Record<string, unknown>>().default({}),
  lastHealthCheckAt: integer('last_health_check_at', { mode: 'timestamp_ms' }),
  lastHealthStatus: text('last_health_status'),
  ...timestamps(),
});

export const budgetPolicies = sqliteTable('budget_policies', {
  id: idColumn(),
  scope: text('scope').notNull().default('global'),
  monthlyCapEur: real('monthly_cap_eur').notNull().default(0),
  dailyCapEur: real('daily_cap_eur').notNull().default(0),
  spentThisMonthEur: real('spent_this_month_eur').notNull().default(0),
  spentTodayEur: real('spent_today_eur').notNull().default(0),
  periodResetAt: integer('period_reset_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const apiUsage = sqliteTable('api_usage', {
  id: idColumn(),
  provider: text('provider').notNull(),
  agentKey: text('agent_key'),
  tier: text('tier').notNull(),
  estimatedTokensIn: integer('estimated_tokens_in').default(0),
  estimatedTokensOut: integer('estimated_tokens_out').default(0),
  estimatedCostEur: real('estimated_cost_eur').default(0),
  actualCostEur: real('actual_cost_eur').default(0),
  cacheHit: integer('cache_hit', boolInt).notNull().default(false),
  blocked: integer('blocked', boolInt).notNull().default(false),
  blockedReason: text('blocked_reason'),
  ...timestamps(),
});

export const approvalRequests = sqliteTable('approval_requests', {
  id: idColumn(),
  kind: text('kind').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  status: text('status').notNull().default('pending'),
  summary: text('summary').notNull(),
  requestedByAgent: text('requested_by_agent'),
  decidedAt: integer('decided_at', { mode: 'timestamp_ms' }),
  decidedBy: text('decided_by'),
  decisionNote: text('decision_note'),
  ...timestamps(),
});

export const agentRuns = sqliteTable('agent_runs', {
  id: idColumn(),
  agentKey: text('agent_key').notNull(),
  triggeredBy: text('triggered_by'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  inputSummary: text('input_summary', { mode: 'json' }).$type<Record<string, unknown>>(),
  outputSummary: text('output_summary', { mode: 'json' }).$type<Record<string, unknown>>(),
  confidence: real('confidence'),
  provider: text('provider').notNull().default('deterministic'),
  modelCostEur: real('model_cost_eur').default(0),
  cacheHit: integer('cache_hit', boolInt).notNull().default(false),
  approvalRequestId: text('approval_request_id'),
  status: text('status').notNull().default('completed'),
  errorMessage: text('error_message'),
  ...timestamps(),
});

export const agentDecisions = sqliteTable('agent_decisions', {
  id: idColumn(),
  agentRunId: text('agent_run_id').notNull(),
  decision: text('decision').notNull(),
  reasons: text('reasons', { mode: 'json' }).$type<string[]>().default([]),
  ...timestamps(),
});

export const promptCache = sqliteTable('prompt_cache', {
  id: idColumn(),
  taskKey: text('task_key').notNull(),
  inputHash: text('input_hash').notNull(),
  output: text('output', { mode: 'json' }).$type<Record<string, unknown>>(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const contextPacks = sqliteTable('context_packs', {
  id: idColumn(),
  leadId: text('lead_id'),
  jobId: text('job_id'),
  data: text('data', { mode: 'json' }).$type<Record<string, unknown>>().notNull(),
  version: integer('version').notNull().default(1),
  ...timestamps(),
});

export const sourceEvidence = sqliteTable('source_evidence', {
  id: idColumn(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  kind: text('kind').notNull(),
  content: text('content'),
  url: text('url'),
  capturedAt: integer('captured_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const auditLogs = sqliteTable('audit_logs', {
  id: idColumn(),
  actor: text('actor').notNull(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  before: text('before', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  after: text('after', { mode: 'json' }).$type<Record<string, unknown> | null>(),
  reason: text('reason'),
  ...timestamps(),
});

export const systemNotifications = sqliteTable('system_notifications', {
  id: idColumn(),
  kind: text('kind').notNull(),
  severity: text('severity').notNull().default('info'),
  title: text('title').notNull(),
  body: text('body'),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  readAt: integer('read_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

/** Section 6: theme system. */
export const themeConfigs = sqliteTable('theme_configs', {
  id: idColumn(),
  activeTheme: text('active_theme').notNull().default('ay-yildiz-dark-red'),
  customerDemoMode: integer('customer_demo_mode', boolInt).notNull().default(false),
  ...timestamps(),
});

/** Section 28: voice interface config. */
export const voiceConfigs = sqliteTable('voice_configs', {
  id: idColumn(),
  preferredVoice: text('preferred_voice').default('tr-male'),
  pushToTalkEnabled: integer('push_to_talk_enabled', boolInt).notNull().default(true),
  ttsEnabled: integer('tts_enabled', boolInt).notNull().default(true),
  ...timestamps(),
});

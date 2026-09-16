import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps } from './helpers';

export const sites = sqliteTable('sites', {
  id: idColumn(),
  leadId: text('lead_id'),
  address: text('address'),
  postcode: text('postcode'),
  accessWidthCm: integer('access_width_cm'),
  rearAccess: text('rear_access'),
  carryingDistanceM: real('carrying_distance_m'),
  containerPlacementNote: text('container_placement_note'),
  ...timestamps(),
});

/**
 * "known" / "assumed" / "unknown" / "must_verify_on_site" per master spec Agent 07.
 * Each scope item and measurement carries this classification instead of a single
 * boolean, so pricing and QA can distinguish real facts from working assumptions.
 */
export const FACT_STATUSES = ['known', 'assumed', 'unknown', 'must_verify_on_site'] as const;
export type FactStatus = (typeof FACT_STATUSES)[number];

export const scopes = sqliteTable('scopes', {
  id: idColumn(),
  leadId: text('lead_id').notNull(),
  siteId: text('site_id'),
  templateKey: text('template_key'), // e.g. 'ceramic_terrace_40m2'
  materialSourcing: text('material_sourcing'), // customer_supplied | company_supplied | mixed
  status: text('status').notNull().default('draft'),
  ...timestamps(),
});

export const scopeItems = sqliteTable('scope_items', {
  id: idColumn(),
  scopeId: text('scope_id').notNull(),
  key: text('key').notNull(),
  label: text('label').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  status: text('status').$type<FactStatus>().notNull().default('unknown'),
  customerSupplied: integer('customer_supplied', { mode: 'boolean' }).notNull().default(false),
  notes: text('notes'),
  ...timestamps(),
});

export const measurements = sqliteTable('measurements', {
  id: idColumn(),
  scopeId: text('scope_id').notNull(),
  kind: text('kind').notNull(), // m2 | linear_m | m3 | quantity | weight_kg | travel_km | labour_hours | machine_hours
  value: real('value'),
  status: text('status').$type<FactStatus>().notNull().default('unknown'),
  derivedFromPhotoScale: integer('derived_from_photo_scale', { mode: 'boolean' })
    .notNull()
    .default(false),
  notes: text('notes'),
  ...timestamps(),
});

export const assumptions = sqliteTable('assumptions', {
  id: idColumn(),
  scopeId: text('scope_id').notNull(),
  description: text('description').notNull(),
  impactsPrice: integer('impacts_price', { mode: 'boolean' }).notNull().default(true),
  mustVerifyOnSite: integer('must_verify_on_site', { mode: 'boolean' }).notNull().default(false),
  ...timestamps(),
});

export const riskFlags = sqliteTable('risk_flags', {
  id: idColumn(),
  scopeId: text('scope_id'),
  jobId: text('job_id'),
  kind: text('kind').notNull(), // asbestos | utilities | gas_electric | contaminated_soil | unstable_structure | large_tree | permit | excavation | machine_access | hazardous_waste
  severity: text('severity').notNull().default('medium'),
  description: text('description'),
  blocksBindingQuote: integer('blocks_binding_quote', { mode: 'boolean' }).notNull().default(false),
  ...timestamps(),
});

import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps, boolInt } from './helpers';

/** Section 11: editable pricebook. Never seed fake "current market" prices. */
export const priceBookItems = sqliteTable('price_book_items', {
  id: idColumn(),
  category: text('category').notNull(),
  nameNl: text('name_nl').notNull(),
  unit: text('unit').notNull(),
  baseCost: real('base_cost').notNull().default(0),
  sellPriceRule: text('sell_price_rule'), // e.g. "cost * 1.4" description, informational only
  minQuantity: real('min_quantity'),
  source: text('source'),
  validFrom: integer('valid_from', { mode: 'timestamp_ms' }),
  verifiedAt: integer('verified_at', { mode: 'timestamp_ms' }),
  notes: text('notes'),
  active: integer('active', boolInt).notNull().default(true),
  confidence: text('confidence').notNull().default('low'),
  needsOwnerVerification: integer('needs_owner_verification', boolInt).notNull().default(true),
  ...timestamps(),
});

export const estimates = sqliteTable('estimates', {
  id: idColumn(),
  leadId: text('lead_id').notNull(),
  scopeId: text('scope_id'),
  status: text('status').notNull().default('draft'),
  directCost: real('direct_cost'),
  costWithOverhead: real('cost_with_overhead'),
  priceForMargin: real('price_for_margin'),
  priceForProfitFloor: real('price_for_profit_floor'),
  minimumJobCharge: real('minimum_job_charge'),
  recommendedExVat: real('recommended_ex_vat'),
  vatRatePercent: real('vat_rate_percent').notNull().default(21),
  targetMarginRate: real('target_margin_rate').notNull().default(0.3),
  minimumTargetGrossProfit: real('minimum_target_gross_profit').notNull().default(1200),
  breakEven: real('break_even'),
  grossProfit: real('gross_profit'),
  grossMargin: real('gross_margin'),
  profitPerLabourHour: real('profit_per_labour_hour'),
  lowEstimate: real('low_estimate'),
  expectedEstimate: real('expected_estimate'),
  highEstimate: real('high_estimate'),
  uncertaintyDrivers: text('uncertainty_drivers', { mode: 'json' }).$type<string[]>().default([]),
  quoteConfidence: real('quote_confidence'),
  commercialFit: text('commercial_fit'), // strong | acceptable | weak | below_floor
  ownerOverridePrice: real('owner_override_price'),
  ownerOverrideReason: text('owner_override_reason'),
  ownerOverrideAppliesToQuoteOnly: integer('owner_override_applies_to_quote_only', boolInt)
    .notNull()
    .default(true),
  qaBlocked: integer('qa_blocked', boolInt).notNull().default(false),
  qaBlockReasons: text('qa_block_reasons', { mode: 'json' }).$type<string[]>().default([]),
  ...timestamps(),
});

export const estimateLines = sqliteTable('estimate_lines', {
  id: idColumn(),
  estimateId: text('estimate_id').notNull(),
  category: text('category').notNull(), // labour | materials | rentals | waste | logistics | subcontractors | permits | consumables | overhead | risk
  label: text('label').notNull(),
  quantity: real('quantity'),
  unit: text('unit'),
  unitCost: real('unit_cost'),
  totalCost: real('total_cost').notNull(),
  source: text('source'), // pricebook | supplier_observation | manual | calculated
  sourceRefId: text('source_ref_id'),
  ...timestamps(),
});

export const materialRequirements = sqliteTable('material_requirements', {
  id: idColumn(),
  scopeId: text('scope_id').notNull(),
  label: text('label').notNull(),
  unit: text('unit').notNull(),
  netQuantity: real('net_quantity').notNull(),
  wastePercent: real('waste_percent').default(0),
  cuttingPercent: real('cutting_percent').default(0),
  breakagePercent: real('breakage_percent').default(0),
  sparePercent: real('spare_percent').default(0),
  packageRoundingUnit: real('package_rounding_unit'),
  finalQuantity: real('final_quantity').notNull(),
  suppliedBy: text('supplied_by').notNull().default('company'), // customer | company | rented | in_stock | optional
  ...timestamps(),
});

export const inventoryItems = sqliteTable('inventory_items', {
  id: idColumn(),
  label: text('label').notNull(),
  unit: text('unit').notNull(),
  quantityOnHand: real('quantity_on_hand').notNull().default(0),
  reorderThreshold: real('reorder_threshold'),
  notes: text('notes'),
  ...timestamps(),
});

export const equipmentItems = sqliteTable('equipment_items', {
  id: idColumn(),
  label: text('label').notNull(),
  ownership: text('ownership').notNull().default('rented'), // owned | rented | buy
  dailyRentalCost: real('daily_rental_cost'),
  fuelCostPerDay: real('fuel_cost_per_day'),
  transportCost: real('transport_cost'),
  depositCost: real('deposit_cost'),
  damageWaiverCost: real('damage_waiver_cost'),
  ...timestamps(),
});

export const rentalObservations = sqliteTable('rental_observations', {
  id: idColumn(),
  equipmentItemId: text('equipment_item_id').notNull(),
  supplierId: text('supplier_id'),
  dailyCost: real('daily_cost'),
  source: text('source'),
  sourceUrl: text('source_url'),
  observedAt: integer('observed_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const wasteTypes = sqliteTable('waste_types', {
  id: idColumn(),
  label: text('label').notNull(), // concrete_pavers | soil | sand | green_waste | timber | mixed_construction | unknown_hazardous
  isHazardous: integer('is_hazardous', boolInt).notNull().default(false),
  ...timestamps(),
});

export const disposalPriceObservations = sqliteTable('disposal_price_observations', {
  id: idColumn(),
  wasteTypeId: text('waste_type_id').notNull(),
  containerSize: text('container_size'),
  tippingFee: real('tipping_fee'),
  containerFee: real('container_fee'),
  source: text('source'),
  observedAt: integer('observed_at', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

export const crewMembers = sqliteTable('crew_members', {
  id: idColumn(),
  name: text('name').notNull(),
  kind: text('kind').notNull().default('employee'), // owner | employee | helper | subcontractor
  hourlyCost: real('hourly_cost').notNull(),
  employerBurdenPercent: real('employer_burden_percent').default(0),
  active: integer('active', boolInt).notNull().default(true),
  ...timestamps(),
});

export const labourRates = sqliteTable('labour_rates', {
  id: idColumn(),
  crewKind: text('crew_kind').notNull(),
  hourlyRate: real('hourly_rate').notNull(),
  ...timestamps(),
});

export const productionRates = sqliteTable('production_rates', {
  id: idColumn(),
  taskKey: text('task_key').notNull(),
  unit: text('unit').notNull(),
  unitsPerHour: real('units_per_hour').notNull(),
  sampleSize: integer('sample_size').notNull().default(0),
  lastCalibratedAt: integer('last_calibrated_at', { mode: 'timestamp_ms' }),
  pendingCalibrationSuggestion: real('pending_calibration_suggestion'),
  ...timestamps(),
});

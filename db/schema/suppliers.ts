import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { idColumn, timestamps, boolInt } from './helpers';

export const suppliers = sqliteTable('suppliers', {
  id: idColumn(),
  name: text('name').notNull(),
  category: text('category'),
  website: text('website'),
  preferred: integer('preferred', boolInt).notNull().default(false),
  ...timestamps(),
});

export const supplierProducts = sqliteTable('supplier_products', {
  id: idColumn(),
  supplierId: text('supplier_id').notNull(),
  material: text('material').notNull(),
  productUrl: text('product_url'),
  unit: text('unit').notNull(),
  packageQuantity: real('package_quantity'),
  minimumOrder: real('minimum_order'),
  ...timestamps(),
});

/** Section 10/13: live sourcing data, always timestamped and clearly sourced. */
export const supplierPriceObservations = sqliteTable('supplier_price_observations', {
  id: idColumn(),
  supplierProductId: text('supplier_product_id').notNull(),
  unitPrice: real('unit_price').notNull(),
  vatIncluded: integer('vat_included', boolInt).notNull().default(false),
  deliveryFee: real('delivery_fee'),
  pickupAvailable: integer('pickup_available', boolInt).default(false),
  discountLabel: text('discount_label'),
  discountEvidenceUrl: text('discount_evidence_url'),
  availability: text('availability'),
  mode: text('mode').notNull().default('manual_verification'), // watchlist | product_page_check | owner_pasted_url | browser_assisted | search_provider | manual_verification
  verificationConfidence: text('verification_confidence').notNull().default('unverified'),
  source: text('source'),
  sourceUrl: text('source_url'),
  observedAt: integer('observed_at', { mode: 'timestamp_ms' }).notNull(),
  staleAfter: integer('stale_after', { mode: 'timestamp_ms' }),
  ...timestamps(),
});

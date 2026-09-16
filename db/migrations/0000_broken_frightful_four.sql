CREATE TABLE `agent_config` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_key` text NOT NULL,
	`display_name` text NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`cost_tier` text DEFAULT 'tier0' NOT NULL,
	`cache_policy` text,
	`approval_boundary` text,
	`fallback_behavior` text,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agent_config_agent_key_unique` ON `agent_config` (`agent_key`);--> statement-breakpoint
CREATE TABLE `agent_decisions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_run_id` text NOT NULL,
	`decision` text NOT NULL,
	`reasons` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `agent_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_key` text NOT NULL,
	`triggered_by` text,
	`entity_type` text,
	`entity_id` text,
	`input_summary` text,
	`output_summary` text,
	`confidence` real,
	`provider` text DEFAULT 'deterministic' NOT NULL,
	`model_cost_eur` real DEFAULT 0,
	`cache_hit` integer DEFAULT false NOT NULL,
	`approval_request_id` text,
	`status` text DEFAULT 'completed' NOT NULL,
	`error_message` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `api_usage` (
	`id` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`agent_key` text,
	`tier` text NOT NULL,
	`estimated_tokens_in` integer DEFAULT 0,
	`estimated_tokens_out` integer DEFAULT 0,
	`estimated_cost_eur` real DEFAULT 0,
	`actual_cost_eur` real DEFAULT 0,
	`cache_hit` integer DEFAULT false NOT NULL,
	`blocked` integer DEFAULT false NOT NULL,
	`blocked_reason` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `approval_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`summary` text NOT NULL,
	`requested_by_agent` text,
	`decided_at` integer,
	`decided_by` text,
	`decision_note` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before` text,
	`after` text,
	`reason` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `budget_policies` (
	`id` text PRIMARY KEY NOT NULL,
	`scope` text DEFAULT 'global' NOT NULL,
	`monthly_cap_eur` real DEFAULT 0 NOT NULL,
	`daily_cap_eur` real DEFAULT 0 NOT NULL,
	`spent_this_month_eur` real DEFAULT 0 NOT NULL,
	`spent_today_eur` real DEFAULT 0 NOT NULL,
	`period_reset_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `company_profile` (
	`id` text PRIMARY KEY NOT NULL,
	`company_name` text NOT NULL,
	`phone` text,
	`email` text,
	`website` text,
	`kvk_number` text,
	`vat_number` text,
	`address` text,
	`base_city` text DEFAULT 'Dordrecht' NOT NULL,
	`province` text DEFAULT 'Zuid-Holland' NOT NULL,
	`service_radius_km` integer DEFAULT 35 NOT NULL,
	`enabled_service_categories` text DEFAULT '[]' NOT NULL,
	`owner_language` text DEFAULT 'tr' NOT NULL,
	`customer_language` text DEFAULT 'nl' NOT NULL,
	`vat_rate_percent` real DEFAULT 21 NOT NULL,
	`vat_rule_source` text,
	`vat_rule_checked_at` integer,
	`data_retention_days` integer DEFAULT 730 NOT NULL,
	`setup_completed` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `context_packs` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`job_id` text,
	`data` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `external_connectors` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`name` text NOT NULL,
	`enabled` integer DEFAULT false NOT NULL,
	`config` text DEFAULT '{}',
	`last_health_check_at` integer,
	`last_health_status` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `prompt_cache` (
	`id` text PRIMARY KEY NOT NULL,
	`task_key` text NOT NULL,
	`input_hash` text NOT NULL,
	`output` text,
	`expires_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `source_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`kind` text NOT NULL,
	`content` text,
	`url` text,
	`captured_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `system_notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`severity` text DEFAULT 'info' NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`entity_type` text,
	`entity_id` text,
	`read_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `theme_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`active_theme` text DEFAULT 'ay-yildiz-dark-red' NOT NULL,
	`customer_demo_mode` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`password_hash` text NOT NULL,
	`pwa_pin` text,
	`idle_timeout_minutes` integer DEFAULT 30 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `voice_configs` (
	`id` text PRIMARY KEY NOT NULL,
	`preferred_voice` text DEFAULT 'tr-male',
	`push_to_talk_enabled` integer DEFAULT true NOT NULL,
	`tts_enabled` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `attachments` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`job_id` text,
	`kind` text DEFAULT 'photo' NOT NULL,
	`original_filename` text NOT NULL,
	`stored_filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`size_bytes` integer NOT NULL,
	`sha256` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `contact_methods` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` text NOT NULL,
	`is_primary` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`address` text,
	`postcode` text,
	`city` text,
	`consent_channel` text,
	`opted_out` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `follow_ups` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`sequence_step` integer DEFAULT 1 NOT NULL,
	`scheduled_at` integer NOT NULL,
	`sent_at` integer,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_events` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`kind` text NOT NULL,
	`from_state` text,
	`to_state` text,
	`actor` text DEFAULT 'system' NOT NULL,
	`detail` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lead_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`external_id` text,
	`url` text,
	`raw_text` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `leads` (
	`id` text PRIMARY KEY NOT NULL,
	`customer_id` text,
	`lead_source_id` text,
	`service_category` text,
	`state` text DEFAULT 'NEW' NOT NULL,
	`priority` text,
	`priority_score` real,
	`priority_reasons` text DEFAULT '[]',
	`location` text,
	`postcode` text,
	`distance_km` real,
	`urgency` text,
	`estimated_scale` text,
	`budget_cues` text,
	`seeks_cheap_only` integer,
	`missing_info` text DEFAULT '[]',
	`dedupe_key` text,
	`merged_into_lead_id` text,
	`next_best_action` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `message_threads` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`customer_id` text,
	`channel` text DEFAULT 'manual' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`thread_id` text NOT NULL,
	`direction` text NOT NULL,
	`body` text NOT NULL,
	`template_key` text,
	`language` text DEFAULT 'nl' NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `photo_analyses` (
	`id` text PRIMARY KEY NOT NULL,
	`attachment_id` text NOT NULL,
	`image_hash` text NOT NULL,
	`observations` text DEFAULT '[]',
	`possible_scope_items` text DEFAULT '[]',
	`hazards_or_risks` text DEFAULT '[]',
	`access_observations` text DEFAULT '[]',
	`measurement_claims` text,
	`questions_to_ask` text DEFAULT '[]',
	`overall_confidence` real,
	`owner_correction` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `review_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`draft_text` text,
	`sent_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `assumptions` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`description` text NOT NULL,
	`impacts_price` integer DEFAULT true NOT NULL,
	`must_verify_on_site` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `measurements` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`kind` text NOT NULL,
	`value` real,
	`status` text DEFAULT 'unknown' NOT NULL,
	`derived_from_photo_scale` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `risk_flags` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text,
	`job_id` text,
	`kind` text NOT NULL,
	`severity` text DEFAULT 'medium' NOT NULL,
	`description` text,
	`blocks_binding_quote` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scope_items` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`key` text NOT NULL,
	`label` text NOT NULL,
	`quantity` real,
	`unit` text,
	`status` text DEFAULT 'unknown' NOT NULL,
	`customer_supplied` integer DEFAULT false NOT NULL,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `scopes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`site_id` text,
	`template_key` text,
	`material_sourcing` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sites` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`address` text,
	`postcode` text,
	`access_width_cm` integer,
	`rear_access` text,
	`carrying_distance_m` real,
	`container_placement_note` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `crew_members` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`kind` text DEFAULT 'employee' NOT NULL,
	`hourly_cost` real NOT NULL,
	`employer_burden_percent` real DEFAULT 0,
	`active` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `disposal_price_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`waste_type_id` text NOT NULL,
	`container_size` text,
	`tipping_fee` real,
	`container_fee` real,
	`source` text,
	`observed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `equipment_items` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`ownership` text DEFAULT 'rented' NOT NULL,
	`daily_rental_cost` real,
	`fuel_cost_per_day` real,
	`transport_cost` real,
	`deposit_cost` real,
	`damage_waiver_cost` real,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimate_lines` (
	`id` text PRIMARY KEY NOT NULL,
	`estimate_id` text NOT NULL,
	`category` text NOT NULL,
	`label` text NOT NULL,
	`quantity` real,
	`unit` text,
	`unit_cost` real,
	`total_cost` real NOT NULL,
	`source` text,
	`source_ref_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `estimates` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`scope_id` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`direct_cost` real,
	`cost_with_overhead` real,
	`price_for_margin` real,
	`price_for_profit_floor` real,
	`minimum_job_charge` real,
	`recommended_ex_vat` real,
	`vat_rate_percent` real DEFAULT 21 NOT NULL,
	`target_margin_rate` real DEFAULT 0.3 NOT NULL,
	`minimum_target_gross_profit` real DEFAULT 1200 NOT NULL,
	`break_even` real,
	`gross_profit` real,
	`gross_margin` real,
	`profit_per_labour_hour` real,
	`low_estimate` real,
	`expected_estimate` real,
	`high_estimate` real,
	`uncertainty_drivers` text DEFAULT '[]',
	`quote_confidence` real,
	`commercial_fit` text,
	`owner_override_price` real,
	`owner_override_reason` text,
	`owner_override_applies_to_quote_only` integer DEFAULT true NOT NULL,
	`qa_blocked` integer DEFAULT false NOT NULL,
	`qa_block_reasons` text DEFAULT '[]',
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `inventory_items` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`quantity_on_hand` real DEFAULT 0 NOT NULL,
	`reorder_threshold` real,
	`notes` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `labour_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`crew_kind` text NOT NULL,
	`hourly_rate` real NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `material_requirements` (
	`id` text PRIMARY KEY NOT NULL,
	`scope_id` text NOT NULL,
	`label` text NOT NULL,
	`unit` text NOT NULL,
	`net_quantity` real NOT NULL,
	`waste_percent` real DEFAULT 0,
	`cutting_percent` real DEFAULT 0,
	`breakage_percent` real DEFAULT 0,
	`spare_percent` real DEFAULT 0,
	`package_rounding_unit` real,
	`final_quantity` real NOT NULL,
	`supplied_by` text DEFAULT 'company' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `price_book_items` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`name_nl` text NOT NULL,
	`unit` text NOT NULL,
	`base_cost` real DEFAULT 0 NOT NULL,
	`sell_price_rule` text,
	`min_quantity` real,
	`source` text,
	`valid_from` integer,
	`verified_at` integer,
	`notes` text,
	`active` integer DEFAULT true NOT NULL,
	`confidence` text DEFAULT 'low' NOT NULL,
	`needs_owner_verification` integer DEFAULT true NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `production_rates` (
	`id` text PRIMARY KEY NOT NULL,
	`task_key` text NOT NULL,
	`unit` text NOT NULL,
	`units_per_hour` real NOT NULL,
	`sample_size` integer DEFAULT 0 NOT NULL,
	`last_calibrated_at` integer,
	`pending_calibration_suggestion` real,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `rental_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`equipment_item_id` text NOT NULL,
	`supplier_id` text,
	`daily_cost` real,
	`source` text,
	`source_url` text,
	`observed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `waste_types` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`is_hazardous` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplier_price_observations` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_product_id` text NOT NULL,
	`unit_price` real NOT NULL,
	`vat_included` integer DEFAULT false NOT NULL,
	`delivery_fee` real,
	`pickup_available` integer DEFAULT false,
	`discount_label` text,
	`discount_evidence_url` text,
	`availability` text,
	`mode` text DEFAULT 'manual_verification' NOT NULL,
	`verification_confidence` text DEFAULT 'unverified' NOT NULL,
	`source` text,
	`source_url` text,
	`observed_at` integer NOT NULL,
	`stale_after` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `supplier_products` (
	`id` text PRIMARY KEY NOT NULL,
	`supplier_id` text NOT NULL,
	`material` text NOT NULL,
	`product_url` text,
	`unit` text NOT NULL,
	`package_quantity` real,
	`minimum_order` real,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`category` text,
	`website` text,
	`preferred` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `appointments` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text,
	`job_id` text,
	`kind` text DEFAULT 'site_visit' NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`travel_buffer_minutes` integer DEFAULT 15 NOT NULL,
	`status` text DEFAULT 'proposed' NOT NULL,
	`timezone` text DEFAULT 'Europe/Amsterdam' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `calendar_events` (
	`id` text PRIMARY KEY NOT NULL,
	`appointment_id` text,
	`kind` text NOT NULL,
	`title` text NOT NULL,
	`starts_at` integer NOT NULL,
	`ends_at` integer NOT NULL,
	`crew_member_id` text,
	`job_id` text,
	`ics_uid` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `actual_costs` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`category` text NOT NULL,
	`description` text,
	`amount` real NOT NULL,
	`days_worked` real,
	`crew_size` integer,
	`entered_via` text DEFAULT 'form' NOT NULL,
	`raw_dictation` text,
	`confirmed_at` integer,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `invoice_references` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`reference` text,
	`final_revenue` real,
	`vat_amount` real,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `job_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`job_id` text NOT NULL,
	`label` text NOT NULL,
	`estimated_hours` real,
	`actual_hours` real,
	`crew_member_id` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`quote_id` text,
	`status` text DEFAULT 'scheduled' NOT NULL,
	`scheduled_start` integer,
	`scheduled_end` integer,
	`won_at` integer,
	`completed_at` integer,
	`lost_reason` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quote_versions` (
	`id` text PRIMARY KEY NOT NULL,
	`quote_id` text NOT NULL,
	`version` integer NOT NULL,
	`total_ex_vat` real NOT NULL,
	`changed_lines` text DEFAULT '[]',
	`reason` text,
	`snapshot` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` text PRIMARY KEY NOT NULL,
	`lead_id` text NOT NULL,
	`estimate_id` text NOT NULL,
	`quote_number` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`language_level` text DEFAULT 'prijsindicatie' NOT NULL,
	`valid_until` integer,
	`total_ex_vat` real NOT NULL,
	`vat_amount` real NOT NULL,
	`total_inc_vat` real NOT NULL,
	`pdf_path` text,
	`demo_style` integer DEFAULT false NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`sent_at` integer,
	`current_version` integer DEFAULT 1 NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `quotes_quote_number_unique` ON `quotes` (`quote_number`);
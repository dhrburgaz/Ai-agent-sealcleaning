ALTER TABLE `company_profile` ADD `default_target_margin_rate` real DEFAULT 0.3 NOT NULL;--> statement-breakpoint
ALTER TABLE `company_profile` ADD `default_minimum_target_gross_profit` real DEFAULT 1200 NOT NULL;--> statement-breakpoint
ALTER TABLE `company_profile` ADD `default_minimum_job_charge` real DEFAULT 150 NOT NULL;--> statement-breakpoint
ALTER TABLE `company_profile` ADD `approval_mode` text DEFAULT 'smart_approval' NOT NULL;
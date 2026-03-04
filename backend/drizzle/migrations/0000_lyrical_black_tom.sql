CREATE TABLE `admin_sessions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`admin_id` integer NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`admin_id`) REFERENCES `admins`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admin_sessions_token_hash_unique` ON `admin_sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `admin_sessions_expires_at_idx` ON `admin_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `admins` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`username` text NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `admins_username_unique` ON `admins` (`username`);--> statement-breakpoint
CREATE TABLE `guild_war_registrations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`role` text NOT NULL,
	`primary_class` text NOT NULL,
	`secondary_class` text,
	`primary_role` text NOT NULL,
	`secondary_role` text,
	`note` text,
	`time_slot` text NOT NULL,
	`day` text NOT NULL,
	`team_id` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`team_id`) REFERENCES `teams`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `registrations_day_idx` ON `guild_war_registrations` (`day`);--> statement-breakpoint
CREATE INDEX `registrations_day_team_idx` ON `guild_war_registrations` (`day`,`team_id`);--> statement-breakpoint
CREATE INDEX `registrations_time_slot_idx` ON `guild_war_registrations` (`time_slot`);--> statement-breakpoint
CREATE TABLE `registration_time_slots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`registration_id` integer NOT NULL,
	`time_slot` text NOT NULL,
	FOREIGN KEY (`registration_id`) REFERENCES `guild_war_registrations`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `registration_time_slots_registration_slot_unique` ON `registration_time_slots` (`registration_id`,`time_slot`);--> statement-breakpoint
CREATE INDEX `registration_time_slots_registration_idx` ON `registration_time_slots` (`registration_id`);--> statement-breakpoint
CREATE INDEX `registration_time_slots_slot_idx` ON `registration_time_slots` (`time_slot`);--> statement-breakpoint
CREATE TABLE `teams` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text NOT NULL,
	`name` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `teams_day_idx` ON `teams` (`day`);
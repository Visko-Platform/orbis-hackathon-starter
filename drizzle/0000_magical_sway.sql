CREATE TABLE `stories` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`template_id` text NOT NULL,
	`genre` text NOT NULL,
	`state` text NOT NULL,
	`version` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_stories_owner_updated` ON `stories` (`owner`,`updated_at`);--> statement-breakpoint
CREATE TABLE `usage` (
	`owner` text NOT NULL,
	`bucket` text NOT NULL,
	`count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`owner`, `bucket`)
);
--> statement-breakpoint
CREATE TABLE `viewers` (
	`story_id` text NOT NULL,
	`voter` text NOT NULL,
	`seen_at` integer NOT NULL,
	PRIMARY KEY(`story_id`, `voter`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_viewers_story_seen` ON `viewers` (`story_id`,`seen_at`);--> statement-breakpoint
CREATE TABLE `votes` (
	`story_id` text NOT NULL,
	`poll_id` text NOT NULL,
	`voter` text NOT NULL,
	`choice_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`story_id`, `poll_id`, `voter`),
	FOREIGN KEY (`story_id`) REFERENCES `stories`(`id`) ON UPDATE no action ON DELETE cascade
);

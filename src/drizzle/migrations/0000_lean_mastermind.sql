CREATE TABLE `hash` (
	`file_id` text(24) NOT NULL,
	`algorithm` text NOT NULL,
	`value` text NOT NULL,
	`validated_at` integer NOT NULL,
	`created_at` integer DEFAULT (datetime('now')) NOT NULL,
	`updated_at` integer DEFAULT (datetime('now')) NOT NULL,
	PRIMARY KEY(`algorithm`, `file_id`),
	FOREIGN KEY (`file_id`) REFERENCES `file`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `file` (
	`id` text(24) PRIMARY KEY NOT NULL,
	`path` text NOT NULL,
	`size` integer NOT NULL,
	`ctime` integer NOT NULL,
	`mtime` integer NOT NULL,
	`basename` text NOT NULL,
	`extension` text,
	`validated_at` integer NOT NULL,
	`make` text,
	`model` text,
	`width` integer,
	`height` integer,
	`exif_date` text,
	`live_photo_source` text,
	`live_photo_target` text,
	`latitude` real,
	`longitude` real,
	`created_at` integer DEFAULT (datetime('now')) NOT NULL,
	`updated_at` integer DEFAULT (datetime('now')) NOT NULL
);

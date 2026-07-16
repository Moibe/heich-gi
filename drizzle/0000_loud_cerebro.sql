CREATE TABLE `fixes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device` text NOT NULL,
	`lat` real NOT NULL,
	`lon` real NOT NULL,
	`accuracy` real,
	`altitude` real,
	`velocity` real,
	`battery` integer,
	`tst` integer NOT NULL,
	`received_at` integer NOT NULL,
	`raw` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_fixes_device_tst` ON `fixes` (`device`,`tst`);--> statement-breakpoint
CREATE INDEX `ix_fixes_tst` ON `fixes` (`tst`);
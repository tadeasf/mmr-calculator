CREATE TABLE `match_summaries` (
	`match_id` text PRIMARY KEY NOT NULL,
	`region` text NOT NULL,
	`queue` integer NOT NULL,
	`started_at` integer NOT NULL,
	`duration` integer NOT NULL,
	`participants_json` text NOT NULL,
	`fetched_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `matches_started_idx` ON `match_summaries` (`started_at`);--> statement-breakpoint
CREATE TABLE `mmr_estimates` (
	`puuid` text NOT NULL,
	`queue` text NOT NULL,
	`mmr_mu` real NOT NULL,
	`mmr_sigma` real NOT NULL,
	`tier1_mu` real,
	`tier1_sigma` real,
	`tier2_mu` real,
	`tier2_sigma` real,
	`lobbies_used` integer NOT NULL,
	`computed_at` integer NOT NULL,
	`result_json` text NOT NULL,
	PRIMARY KEY(`puuid`, `queue`)
);
--> statement-breakpoint
CREATE TABLE `mmr_snapshots` (
	`puuid` text NOT NULL,
	`queue` text NOT NULL,
	`day` text NOT NULL,
	`mmr_mu` real NOT NULL,
	`mmr_sigma` real NOT NULL,
	`tier` text NOT NULL,
	`division` text NOT NULL,
	`lp` integer NOT NULL,
	PRIMARY KEY(`puuid`, `queue`, `day`)
);
--> statement-breakpoint
CREATE INDEX `snapshots_timeline_idx` ON `mmr_snapshots` (`puuid`,`queue`,`day`);--> statement-breakpoint
CREATE TABLE `player_matches` (
	`puuid` text NOT NULL,
	`match_id` text NOT NULL,
	`started_at` integer NOT NULL,
	`win` integer NOT NULL,
	PRIMARY KEY(`puuid`, `match_id`)
);
--> statement-breakpoint
CREATE INDEX `player_matches_idx` ON `player_matches` (`puuid`,`started_at`);--> statement-breakpoint
CREATE TABLE `ranked_entries` (
	`puuid` text NOT NULL,
	`queue` text NOT NULL,
	`tier` text NOT NULL,
	`division` text NOT NULL,
	`lp` integer NOT NULL,
	`wins` integer NOT NULL,
	`losses` integer NOT NULL,
	`fetched_at` integer NOT NULL,
	PRIMARY KEY(`puuid`, `queue`)
);
--> statement-breakpoint
CREATE INDEX `ranked_fetched_idx` ON `ranked_entries` (`fetched_at`);--> statement-breakpoint
CREATE TABLE `summoners` (
	`puuid` text PRIMARY KEY NOT NULL,
	`region` text NOT NULL,
	`riot_id` text NOT NULL,
	`tag_line` text NOT NULL,
	`last_seen` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `summoners_riot_id_idx` ON `summoners` (`riot_id`,`tag_line`,`region`);--> statement-breakpoint
CREATE TABLE `tracked_accounts` (
	`puuid` text PRIMARY KEY NOT NULL,
	`added_at` integer NOT NULL,
	`last_estimated_at` integer,
	`check_count` integer DEFAULT 0 NOT NULL
);

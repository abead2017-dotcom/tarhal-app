CREATE TABLE `email_auth_limits` (
	`emailNormalized` varchar(320) NOT NULL,
	`action` enum('send','login') NOT NULL,
	`windowStartedAt` timestamp NOT NULL,
	`count` int NOT NULL DEFAULT 0,
	`lastSentAt` timestamp,
	CONSTRAINT `email_auth_limits_email_action_unique` UNIQUE(`emailNormalized`,`action`)
);
--> statement-breakpoint
CREATE TABLE `email_credentials` (
	`userId` int NOT NULL,
	`emailNormalized` varchar(320) NOT NULL,
	`passwordHash` varchar(128) NOT NULL,
	`passwordSalt` varchar(64) NOT NULL,
	`verifiedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `email_credentials_userId` PRIMARY KEY(`userId`),
	CONSTRAINT `email_credentials_email_unique` UNIQUE(`emailNormalized`)
);
--> statement-breakpoint
CREATE TABLE `email_otp_challenges` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`emailNormalized` varchar(320) NOT NULL,
	`purpose` enum('verify','reset','delete') NOT NULL,
	`otpHmac` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`attempts` int NOT NULL DEFAULT 0,
	`consumedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_otp_challenges_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `email_sessions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`tokenHmac` varchar(64) NOT NULL,
	`expiresAt` timestamp NOT NULL,
	`revokedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `email_sessions_id` PRIMARY KEY(`id`),
	CONSTRAINT `email_sessions_token_hmac_unique` UNIQUE(`tokenHmac`)
);
--> statement-breakpoint
ALTER TABLE `email_credentials` ADD CONSTRAINT `email_credentials_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_otp_challenges` ADD CONSTRAINT `email_otp_challenges_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `email_sessions` ADD CONSTRAINT `email_sessions_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `email_otp_email_purpose_idx` ON `email_otp_challenges` (`emailNormalized`,`purpose`,`createdAt`);--> statement-breakpoint
CREATE INDEX `email_otp_user_idx` ON `email_otp_challenges` (`userId`);--> statement-breakpoint
CREATE INDEX `email_sessions_user_idx` ON `email_sessions` (`userId`);
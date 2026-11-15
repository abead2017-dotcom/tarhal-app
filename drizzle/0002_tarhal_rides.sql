CREATE TABLE `driver_applications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`vehicleId` enum('economy','family','4x4','van','bus') NOT NULL,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`reviewedBy` int,
	`reviewedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `driver_applications_id` PRIMARY KEY(`id`),
	CONSTRAINT `driver_applications_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE TABLE `ride_locations` (
	`rideId` int NOT NULL,
	`driverId` int NOT NULL,
	`latitude` double NOT NULL,
	`longitude` double NOT NULL,
	`accuracy` double,
	`heading` double,
	`speed` double,
	`updatedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ride_locations_rideId` PRIMARY KEY(`rideId`)
);
--> statement-breakpoint
CREATE TABLE `rides` (
	`id` int AUTO_INCREMENT NOT NULL,
	`passengerId` int NOT NULL,
	`vehicleId` enum('economy','family','4x4','van','bus') NOT NULL,
	`origin` varchar(255) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`driverId` int,
	`status` enum('requested','accepted','in_progress','completed','cancelled') NOT NULL DEFAULT 'requested',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`acceptedAt` timestamp,
	`startedAt` timestamp,
	`completedAt` timestamp,
	`cancelledAt` timestamp,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `rides_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `driver_applications` ADD CONSTRAINT `driver_applications_userId_users_id_fk` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `driver_applications` ADD CONSTRAINT `driver_applications_reviewedBy_users_id_fk` FOREIGN KEY (`reviewedBy`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ride_locations` ADD CONSTRAINT `ride_locations_rideId_rides_id_fk` FOREIGN KEY (`rideId`) REFERENCES `rides`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `ride_locations` ADD CONSTRAINT `ride_locations_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_passengerId_users_id_fk` FOREIGN KEY (`passengerId`) REFERENCES `users`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `rides` ADD CONSTRAINT `rides_driverId_users_id_fk` FOREIGN KEY (`driverId`) REFERENCES `users`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `driver_applications_status_idx` ON `driver_applications` (`status`);--> statement-breakpoint
CREATE INDEX `ride_locations_driver_idx` ON `ride_locations` (`driverId`);--> statement-breakpoint
CREATE INDEX `rides_status_vehicle_idx` ON `rides` (`status`,`vehicleId`);--> statement-breakpoint
CREATE INDEX `rides_passenger_created_idx` ON `rides` (`passengerId`,`createdAt`);--> statement-breakpoint
CREATE INDEX `rides_driver_status_idx` ON `rides` (`driverId`,`status`);
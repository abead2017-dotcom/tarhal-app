CREATE TABLE `trip_requests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vehicleId` varchar(32) NOT NULL,
	`origin` varchar(255) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`requestMode` enum('demo') NOT NULL DEFAULT 'demo',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `trip_requests_id` PRIMARY KEY(`id`)
);

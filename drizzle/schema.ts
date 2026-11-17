import {
  double,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Demo-only ride requests. These records are not dispatched to a driver and do not represent bookings.
 */
export const tripRequests = mysqlTable("trip_requests", {
  id: int("id").autoincrement().primaryKey(),
  vehicleId: varchar("vehicleId", { length: 32 }).notNull(),
  origin: varchar("origin", { length: 255 }).notNull(),
  destination: varchar("destination", { length: 255 }).notNull(),
  requestMode: mysqlEnum("requestMode", ["demo"]).default("demo").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type TripRequest = typeof tripRequests.$inferSelect;
export type InsertTripRequest = typeof tripRequests.$inferInsert;

export const vehicleCategories = [
  "economy",
  "family",
  "4x4",
  "van",
  "bus",
] as const;
export type VehicleCategory = (typeof vehicleCategories)[number];
export const driverApplicationStatuses = [
  "pending",
  "approved",
  "rejected",
] as const;
export type DriverApplicationStatus =
  (typeof driverApplicationStatuses)[number];
export const rideStatuses = [
  "requested",
  "accepted",
  "in_progress",
  "completed",
  "cancelled",
] as const;
export type RideStatus = (typeof rideStatuses)[number];

export const driverApplications = mysqlTable(
  "driver_applications",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    vehicleId: mysqlEnum("vehicleId", vehicleCategories).notNull(),
    status: mysqlEnum("status", driverApplicationStatuses)
      .default("pending")
      .notNull(),
    reviewedBy: int("reviewedBy").references(() => users.id, {
      onDelete: "set null",
    }),
    reviewedAt: timestamp("reviewedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("driver_applications_userId_unique").on(table.userId),
    index("driver_applications_status_idx").on(table.status),
  ],
);
export type DriverApplication = typeof driverApplications.$inferSelect;

export const rides = mysqlTable(
  "rides",
  {
    id: int("id").autoincrement().primaryKey(),
    passengerId: int("passengerId")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    vehicleId: mysqlEnum("vehicleId", vehicleCategories).notNull(),
    origin: varchar("origin", { length: 255 }).notNull(),
    destination: varchar("destination", { length: 255 }).notNull(),
    driverId: int("driverId").references(() => users.id, {
      onDelete: "set null",
    }),
    status: mysqlEnum("status", rideStatuses).default("requested").notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    acceptedAt: timestamp("acceptedAt"),
    startedAt: timestamp("startedAt"),
    completedAt: timestamp("completedAt"),
    cancelledAt: timestamp("cancelledAt"),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("rides_status_vehicle_idx").on(table.status, table.vehicleId),
    index("rides_passenger_created_idx").on(table.passengerId, table.createdAt),
    index("rides_driver_status_idx").on(table.driverId, table.status),
  ],
);
export type Ride = typeof rides.$inferSelect;

/** Exactly one mutable live-position row per ride; no location history is retained. */
export const rideLocations = mysqlTable(
  "ride_locations",
  {
    rideId: int("rideId")
      .primaryKey()
      .references(() => rides.id, { onDelete: "cascade" }),
    driverId: int("driverId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    latitude: double("latitude").notNull(),
    longitude: double("longitude").notNull(),
    accuracy: double("accuracy"),
    heading: double("heading"),
    speed: double("speed"),
    updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  },
  (table) => [index("ride_locations_driver_idx").on(table.driverId)],
);
export type RideLocation = typeof rideLocations.$inferSelect;

/** Email identities remain separate from Manus OAuth identities. */
export const emailCredentials = mysqlTable(
  "email_credentials",
  {
    userId: int("userId")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    emailNormalized: varchar("emailNormalized", { length: 320 }).notNull(),
    passwordHash: varchar("passwordHash", { length: 128 }).notNull(),
    passwordSalt: varchar("passwordSalt", { length: 64 }).notNull(),
    verifiedAt: timestamp("verifiedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("email_credentials_email_unique").on(table.emailNormalized)],
);

export const emailOtpChallenges = mysqlTable(
  "email_otp_challenges",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId").references(() => users.id, { onDelete: "cascade" }),
    emailNormalized: varchar("emailNormalized", { length: 320 }).notNull(),
    purpose: mysqlEnum("purpose", ["verify", "reset", "delete"]).notNull(),
    otpHmac: varchar("otpHmac", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    attempts: int("attempts").default(0).notNull(),
    consumedAt: timestamp("consumedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    index("email_otp_email_purpose_idx").on(table.emailNormalized, table.purpose, table.createdAt),
    index("email_otp_user_idx").on(table.userId),
  ],
);

export const emailAuthLimits = mysqlTable(
  "email_auth_limits",
  {
    emailNormalized: varchar("emailNormalized", { length: 320 }).notNull(),
    action: mysqlEnum("action", ["send", "login"]).notNull(),
    windowStartedAt: timestamp("windowStartedAt").notNull(),
    count: int("count").default(0).notNull(),
    lastSentAt: timestamp("lastSentAt"),
  },
  (table) => [uniqueIndex("email_auth_limits_email_action_unique").on(table.emailNormalized, table.action)],
);

export const emailSessions = mysqlTable(
  "email_sessions",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHmac: varchar("tokenHmac", { length: 64 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    revokedAt: timestamp("revokedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("email_sessions_token_hmac_unique").on(table.tokenHmac),
    index("email_sessions_user_idx").on(table.userId),
  ],
);

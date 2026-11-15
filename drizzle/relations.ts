import { relations } from "drizzle-orm";
import { driverApplications, rideLocations, rides, users } from "./schema";

export const usersRelations = relations(users, ({ many }) => ({
  driverApplications: many(driverApplications, {
    relationName: "driverApplicant",
  }),
  reviewedDriverApplications: many(driverApplications, {
    relationName: "applicationReviewer",
  }),
  passengerRides: many(rides, { relationName: "ridePassenger" }),
  drivenRides: many(rides, { relationName: "rideDriver" }),
  rideLocations: many(rideLocations, { relationName: "locationDriver" }),
}));

export const driverApplicationsRelations = relations(
  driverApplications,
  ({ one }) => ({
    applicant: one(users, {
      fields: [driverApplications.userId],
      references: [users.id],
      relationName: "driverApplicant",
    }),
    reviewer: one(users, {
      fields: [driverApplications.reviewedBy],
      references: [users.id],
      relationName: "applicationReviewer",
    }),
  }),
);

export const ridesRelations = relations(rides, ({ one }) => ({
  passenger: one(users, {
    fields: [rides.passengerId],
    references: [users.id],
    relationName: "ridePassenger",
  }),
  driver: one(users, {
    fields: [rides.driverId],
    references: [users.id],
    relationName: "rideDriver",
  }),
}));

export const rideLocationsRelations = relations(rideLocations, ({ one }) => ({
  ride: one(rides, {
    fields: [rideLocations.rideId],
    references: [rides.id],
  }),
  driver: one(users, {
    fields: [rideLocations.driverId],
    references: [users.id],
    relationName: "locationDriver",
  }),
}));

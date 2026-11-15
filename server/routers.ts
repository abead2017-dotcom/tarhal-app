import { and, desc, eq, inArray, isNull, or } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieName, getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import {
  adminProcedure,
  protectedProcedure,
  publicProcedure,
  router,
} from "./_core/trpc";
import {
  driverApplications,
  rideLocations,
  rides,
  users,
  vehicleCategories,
} from "../drizzle/schema";
import { createDemoTripRequest, createRideRequest, getDb } from "./db";

const vehicleCategory = z.enum(vehicleCategories);
const tripRequestInput = z.object({
  vehicleId: vehicleCategory,
  origin: z.string().trim().min(1).max(255),
  destination: z.string().trim().min(1).max(255),
});
const rideIdInput = z.object({ rideId: z.number().int().positive() });
const applicationIdInput = z.object({
  applicationId: z.number().int().positive(),
});
const locationInput = rideIdInput.extend({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  accuracy: z.number().finite().min(0).max(100_000).optional(),
  heading: z.number().finite().min(0).max(360).optional(),
  speed: z.number().finite().min(0).max(100_000).optional(),
  recordedAt: z
    .union([z.date(), z.string().datetime({ offset: true })])
    .optional(),
});

function requireDatabase(db: Awaited<ReturnType<typeof getDb>>) {
  if (!db) {
    throw new TRPCError({
      code: "SERVICE_UNAVAILABLE",
      message: "قاعدة البيانات غير متاحة.",
    });
  }
  return db;
}

async function requireApprovedDriver(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  userId: number,
) {
  const [application] = await db
    .select()
    .from(driverApplications)
    .where(eq(driverApplications.userId, userId))
    .limit(1);
  if (!application || application.status !== "approved") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "يجب اعتماد حساب السائق أولًا.",
    });
  }
  return application;
}

async function getReadableRide(
  db: NonNullable<Awaited<ReturnType<typeof getDb>>>,
  rideId: number,
  user: { id: number },
) {
  const [ride] = await db
    .select()
    .from(rides)
    .where(
      and(
        eq(rides.id, rideId),
        or(eq(rides.passengerId, user.id), eq(rides.driverId, user.id)),
      ),
    )
    .limit(1);
  if (!ride) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "الرحلة غير موجودة أو لا تملك صلاحية عرضها.",
    });
  }
  return ride;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(getSessionCookieName(ctx.req), {
        ...cookieOptions,
        maxAge: -1,
      });
      return { success: true } as const;
    }),
  }),
  // Retain the legacy demo path without altering its table or behavior.
  tripRequest: router({
    submit: publicProcedure
      .input(tripRequestInput)
      .mutation(async ({ input }) => {
        try {
          const saved = await createDemoTripRequest(input);
          return { id: saved.id, requestMode: "demo" as const };
        } catch {
          console.error("[TripRequest] Failed to save demo request");
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              "تعذر حفظ الطلب التجريبي. تحقق من الاتصال ثم أعد المحاولة.",
          });
        }
      }),
  }),
  driver: router({
    applicationStatus: protectedProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const [application] = await db
        .select({
          id: driverApplications.id,
          status: driverApplications.status,
          vehicleId: driverApplications.vehicleId,
        })
        .from(driverApplications)
      .where(eq(driverApplications.userId, ctx.user.id))
      .limit(1);
      return application ?? null;
    }),
    submitApplication: protectedProcedure
      .input(z.object({ vehicleId: vehicleCategory }))
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const [existing] = await db
          .select()
          .from(driverApplications)
          .where(eq(driverApplications.userId, ctx.user.id))
          .limit(1);
        if (existing && existing.status !== "rejected") {
          throw new TRPCError({
            code: "CONFLICT",
            message: "لديك بالفعل طلب اعتماد قائم أو معتمد.",
          });
        }
        if (existing) {
          const [result] = await db
            .update(driverApplications)
            .set({
              vehicleId: input.vehicleId,
              status: "pending",
              reviewedBy: null,
              reviewedAt: null,
            })
            .where(
              and(
                eq(driverApplications.id, existing.id),
                eq(driverApplications.status, "rejected"),
              ),
            );
          if (result.affectedRows === 0) {
            throw new TRPCError({
              code: "CONFLICT",
              message: "تغيّرت حالة الطلب؛ أعد تحميل الصفحة.",
            });
          }
          return {
            id: existing.id,
            status: "pending" as const,
            vehicleId: input.vehicleId,
          };
        }
        try {
          const [created] = await db
            .insert(driverApplications)
            .values({
              userId: ctx.user.id,
              vehicleId: input.vehicleId,
              status: "pending",
            })
            .$returningId();
          return {
            id: created.id,
            status: "pending" as const,
            vehicleId: input.vehicleId,
          };
        } catch {
          throw new TRPCError({
            code: "CONFLICT",
            message: "يوجد طلب اعتماد مسجل لهذا الحساب.",
          });
        }
      }),
    availableRides: protectedProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      const application = await requireApprovedDriver(db, ctx.user.id);
      return db
        .select({
          id: rides.id,
          vehicleId: rides.vehicleId,
          origin: rides.origin,
          destination: rides.destination,
          createdAt: rides.createdAt,
        })
        .from(rides)
        .where(
          and(
            eq(rides.vehicleId, application.vehicleId),
            eq(rides.status, "requested"),
            isNull(rides.driverId),
          ),
        )
        .orderBy(rides.createdAt);
    }),
    currentRide: protectedProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      await requireApprovedDriver(db, ctx.user.id);
      const [ride] = await db
        .select({
          id: rides.id,
          status: rides.status,
          vehicleId: rides.vehicleId,
          origin: rides.origin,
          destination: rides.destination,
        })
        .from(rides)
        .where(
          and(
            eq(rides.driverId, ctx.user.id),
            inArray(rides.status, ["accepted", "in_progress"]),
          ),
        )
        .orderBy(desc(rides.updatedAt))
        .limit(1);
      return ride ?? null;
    }),
    acceptRide: protectedProcedure
      .input(rideIdInput)
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const assigned = await db.transaction(async (tx) => {
          const [application] = await tx
            .select()
            .from(driverApplications)
            .where(
              and(
                eq(driverApplications.userId, ctx.user.id),
                eq(driverApplications.status, "approved"),
              ),
            )
            .limit(1)
            .for("update");
          if (!application) return false;
          const [currentRide] = await tx
            .select({ id: rides.id })
            .from(rides)
            .where(
              and(
                eq(rides.driverId, ctx.user.id),
                inArray(rides.status, ["accepted", "in_progress"]),
              ),
            )
            .limit(1);
          if (currentRide) return false;
          const [result] = await tx
            .update(rides)
            .set({
              driverId: ctx.user.id,
              status: "accepted",
              acceptedAt: new Date(),
            })
            .where(
              and(
                eq(rides.id, input.rideId),
                eq(rides.vehicleId, application.vehicleId),
                eq(rides.status, "requested"),
                isNull(rides.driverId),
              ),
            );
          return result.affectedRows > 0;
        });
        if (!assigned) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "لم تعد الرحلة متاحة أو لديك رحلة أخرى قيد التنفيذ.",
          });
        }
        return { id: input.rideId, status: "accepted" as const };
      }),
    startRide: protectedProcedure
      .input(rideIdInput)
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const [result] = await db
          .update(rides)
          .set({ status: "in_progress", startedAt: new Date() })
          .where(
            and(
              eq(rides.id, input.rideId),
              eq(rides.driverId, ctx.user.id),
              eq(rides.status, "accepted"),
            ),
          );
        if (result.affectedRows === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "لا يمكن بدء هذه الرحلة بالحالة الحالية.",
          });
        }
        return { id: input.rideId, status: "in_progress" as const };
      }),
    completeRide: protectedProcedure
      .input(rideIdInput)
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const completed = await db.transaction(async (tx) => {
          const [result] = await tx
            .update(rides)
            .set({ status: "completed", completedAt: new Date() })
            .where(
              and(
                eq(rides.id, input.rideId),
                eq(rides.driverId, ctx.user.id),
                eq(rides.status, "in_progress"),
              ),
            );
          if (result.affectedRows === 0) return false;
          await tx
            .delete(rideLocations)
            .where(eq(rideLocations.rideId, input.rideId));
          return true;
        });
        if (!completed) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "لا يمكن إكمال هذه الرحلة بالحالة الحالية.",
          });
        }
        return { id: input.rideId, status: "completed" as const };
      }),
    updateLocation: protectedProcedure
      .input(locationInput)
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const updatedAt =
          input.recordedAt instanceof Date
            ? input.recordedAt
            : input.recordedAt
              ? new Date(input.recordedAt)
              : new Date();
        const observedAt = updatedAt.getTime();
        if (!Number.isFinite(observedAt) || observedAt > Date.now() + 30_000) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "وقت الموقع غير صالح؛ تحقق من ضبط ساعة الهاتف.",
          });
        }
        await db.transaction(async (tx) => {
          const [activeRide] = await tx
            .select({ id: rides.id, startedAt: rides.startedAt })
            .from(rides)
            .where(
              and(
                eq(rides.id, input.rideId),
                eq(rides.driverId, ctx.user.id),
                eq(rides.status, "in_progress"),
              ),
            )
            .limit(1)
            .for("update");
          if (!activeRide) {
            throw new TRPCError({
              code: "FORBIDDEN",
              message: "لا يمكن إرسال الموقع إلا للسائق المعيّن أثناء الرحلة.",
            });
          }
          if (activeRide.startedAt && observedAt < activeRide.startedAt.getTime() - 30_000) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "تجاهلنا نقطة موقع التُقطت قبل بدء الرحلة.",
            });
          }
          const [latestLocation] = await tx
            .select({ updatedAt: rideLocations.updatedAt })
            .from(rideLocations)
            .where(eq(rideLocations.rideId, input.rideId))
            .limit(1);
          if (
            latestLocation &&
            observedAt <= latestLocation.updatedAt.getTime()
          ) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "تجاهلنا نقطة موقع أقدم من آخر تحديث محفوظ.",
            });
          }
          await tx
            .insert(rideLocations)
            .values({
              rideId: input.rideId,
              driverId: ctx.user.id,
              latitude: input.latitude,
              longitude: input.longitude,
              accuracy: input.accuracy ?? null,
              heading: input.heading ?? null,
              speed: input.speed ?? null,
              updatedAt,
            })
            .onDuplicateKeyUpdate({
              set: {
                driverId: ctx.user.id,
                latitude: input.latitude,
                longitude: input.longitude,
                accuracy: input.accuracy ?? null,
                heading: input.heading ?? null,
                speed: input.speed ?? null,
                updatedAt,
              },
            });
        });
        return { rideId: input.rideId, updatedAt };
      }),
  }),
  admin: router({
    driverApplications: adminProcedure.query(async () => {
      const db = requireDatabase(await getDb());
      const results = await db
        .select({
          application: driverApplications,
          name: users.name,
          email: users.email,
        })
        .from(driverApplications)
        .innerJoin(users, eq(driverApplications.userId, users.id))
        .orderBy(driverApplications.createdAt);
      return results.map(({ application, name, email }) => ({
        ...application,
        name,
        email,
      }));
    }),
    reviewDriver: adminProcedure
      .input(
        applicationIdInput.extend({
          decision: z.enum(["approved", "rejected"]),
        }),
      )
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const [result] = await db
          .update(driverApplications)
          .set({
            status: input.decision,
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
          })
          .where(
            and(
              eq(driverApplications.id, input.applicationId),
              eq(driverApplications.status, "pending"),
            ),
          );
        if (result.affectedRows === 0) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "طلب الاعتماد غير موجود أو سبق مراجعته.",
          });
        }
        return { applicationId: input.applicationId, status: input.decision };
      }),
  }),
  ride: router({
    create: protectedProcedure
      .input(tripRequestInput)
      .mutation(async ({ ctx, input }) => {
        requireDatabase(await getDb());
        const created = await createRideRequest({
          passengerId: ctx.user.id,
          ...input,
        });
        return { id: created.id, status: "requested" as const };
      }),
    mine: protectedProcedure.query(async ({ ctx }) => {
      const db = requireDatabase(await getDb());
      return db
        .select()
        .from(rides)
        .where(eq(rides.passengerId, ctx.user.id))
        .orderBy(desc(rides.createdAt));
    }),
    get: protectedProcedure.input(rideIdInput).query(async ({ ctx, input }) => {
      const db = requireDatabase(await getDb());
      return getReadableRide(db, input.rideId, ctx.user);
    }),
    cancel: protectedProcedure
      .input(rideIdInput)
      .mutation(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const cancelled = await db.transaction(async (tx) => {
          const [result] = await tx
            .update(rides)
            .set({ status: "cancelled", cancelledAt: new Date() })
            .where(
              and(
                eq(rides.id, input.rideId),
                eq(rides.passengerId, ctx.user.id),
                inArray(rides.status, ["requested", "accepted"]),
              ),
            );
          if (result.affectedRows === 0) return false;
          await tx
            .delete(rideLocations)
            .where(eq(rideLocations.rideId, input.rideId));
          return true;
        });
        if (!cancelled) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "لا يمكن إلغاء الرحلة بعد بدء تنفيذها أو بعد انتهائها.",
          });
        }
        return { id: input.rideId, status: "cancelled" as const };
      }),
    liveState: protectedProcedure
      .input(rideIdInput)
      .query(async ({ ctx, input }) => {
        const db = requireDatabase(await getDb());
        const ride = await getReadableRide(db, input.rideId, ctx.user);
        const [location] = await db
          .select()
          .from(rideLocations)
          .where(eq(rideLocations.rideId, input.rideId))
          .limit(1);
        const [driver] = ride.driverId
          ? await db
              .select({ name: users.name })
              .from(users)
              .where(eq(users.id, ride.driverId))
              .limit(1)
          : [];
        return {
          ride: {
            id: ride.id,
            status: ride.status,
            vehicleId: ride.vehicleId,
            origin: ride.origin,
            destination: ride.destination,
          },
          driver: ride.driverId ? { name: driver?.name ?? null } : null,
          location: location
            ? {
                latitude: location.latitude,
                longitude: location.longitude,
                updatedAt: location.updatedAt,
              }
            : null,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;

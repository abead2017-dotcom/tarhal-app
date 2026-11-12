import { TRPCError } from "@trpc/server";
import { z } from "zod";

import {
  getSessionCookieName,
  getSessionCookieOptions,
} from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { createDemoTripRequest } from "./db";

const tripRequestInput = z.object({
  vehicleId: z.enum(["economy", "family", "4x4", "van", "bus"]),
  origin: z.string().trim().min(1).max(255),
  destination: z.string().trim().min(1).max(255),
});

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
      return {
        success: true,
      } as const;
    }),
  }),
  tripRequest: router({
    submit: publicProcedure.input(tripRequestInput).mutation(async ({ input }) => {
      try {
        const saved = await createDemoTripRequest(input);
        return { id: saved.id, requestMode: "demo" as const };
      } catch {
        console.error("[TripRequest] Failed to save demo request");
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "تعذر حفظ الطلب التجريبي. تحقق من الاتصال ثم أعد المحاولة.",
        });
      }
    }),
  }),
});

export type AppRouter = typeof appRouter;

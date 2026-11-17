import { describe, expect, it } from "vitest";
import { validateRideLocationTimestamp } from "../server/ride-location-validation";

describe("validateRideLocationTimestamp", () => {
  const now = new Date("2026-11-16T12:00:00.000Z");

  it.each([new Date(Number.NaN), Number.NaN, Number.POSITIVE_INFINITY])(
    "rejects an invalid observedAt value: %s",
    (observedAt) => {
      expect(validateRideLocationTimestamp({ observedAt, now })).toBe(
        "invalid_observed_at",
      );
    },
  );

  it("allows observedAt exactly 30 seconds in the future", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: now.getTime() + 30_000,
        now,
      }),
    ).toBeNull();
  });

  it("rejects observedAt more than 30 seconds in the future", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: now.getTime() + 30_001,
        now,
      }),
    ).toBe("observed_at_too_far_in_future");
  });

  it("rejects any observedAt before startedAt, with no tolerance", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: new Date(now.getTime() - 1),
        startedAt: now,
        now,
      }),
    ).toBe("observed_at_before_started_at");
  });

  it("allows observedAt exactly equal to startedAt", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: now,
        startedAt: now,
        now,
      }),
    ).toBeNull();
  });

  it("rejects observedAt equal to the last saved update", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: now,
        latestUpdatedAt: now,
        now,
      }),
    ).toBe("observed_at_not_newer_than_latest");
  });

  it("rejects observedAt older than the last saved update", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: now.getTime() - 1,
        latestUpdatedAt: now,
        now,
      }),
    ).toBe("observed_at_not_newer_than_latest");
  });

  it("accepts a valid timestamp strictly newer than the last saved update", () => {
    expect(
      validateRideLocationTimestamp({
        observedAt: now.getTime() + 1,
        startedAt: now.getTime() - 10_000,
        latestUpdatedAt: now,
        now,
      }),
    ).toBeNull();
  });
});

export type RideLocationTimestamp = Date | number;

export type RideLocationTimestampError =
  | "invalid_observed_at"
  | "invalid_reference_time"
  | "observed_at_too_far_in_future"
  | "observed_at_before_started_at"
  | "observed_at_not_newer_than_latest";

export interface RideLocationTimestampValidationInput {
  observedAt: RideLocationTimestamp;
  startedAt?: RideLocationTimestamp | null;
  latestUpdatedAt?: RideLocationTimestamp | null;
  now?: RideLocationTimestamp;
}

const MAX_FUTURE_SKEW_MS = 30_000;

function toEpochMilliseconds(value: RideLocationTimestamp): number {
  return value instanceof Date ? value.getTime() : value;
}

/**
 * Validates a ride location's observation timestamp without side effects.
 * Returns `null` for a valid timestamp, or a stable reason code for rejection.
 */
export function validateRideLocationTimestamp(
  input: RideLocationTimestampValidationInput,
): RideLocationTimestampError | null {
  const observedAt = toEpochMilliseconds(input.observedAt);
  if (!Number.isFinite(observedAt)) return "invalid_observed_at";

  const now = toEpochMilliseconds(input.now ?? Date.now());
  if (!Number.isFinite(now)) return "invalid_reference_time";
  if (observedAt > now + MAX_FUTURE_SKEW_MS) {
    return "observed_at_too_far_in_future";
  }

  if (input.startedAt != null) {
    const startedAt = toEpochMilliseconds(input.startedAt);
    if (!Number.isFinite(startedAt)) return "invalid_reference_time";
    if (observedAt < startedAt) return "observed_at_before_started_at";
  }

  if (input.latestUpdatedAt != null) {
    const latestUpdatedAt = toEpochMilliseconds(input.latestUpdatedAt);
    if (!Number.isFinite(latestUpdatedAt)) return "invalid_reference_time";
    if (observedAt <= latestUpdatedAt) {
      return "observed_at_not_newer_than_latest";
    }
  }

  return null;
}

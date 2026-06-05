import { Redis } from "@/redis";
import { fetchMetadataV1 } from "@apollo/cosmo/server/metadata";
import { COSMO_V1_SAMPLES_KEY, COSMO_V1_STATUS_KEY } from "@apollo/util";
import { Effect } from "effect";
import { FetchError } from "ofetch";
import type { ScheduledTask } from "../task";

// a long-lived, unsendable Welcome-class objekt that can never leave its owner's
// account, so it stays a permanently-valid probe target for v1 availability.
const SENTINEL_TOKEN_ID = "162686";

// rolling 5-minute window: 10 samples at the 30s cadence.
const WINDOW_SIZE = 10;
// refresh the samples TTL each tick so a long monitor outage clears stale
// samples instead of skewing the first post-restart decision.
const SAMPLES_TTL_SECONDS = 300;
// heartbeat TTL so a dead monitor can't pin the status forever.
const STATUS_TTL_SECONDS = 180;
// hysteresis bounds, so the status doesn't flap around a single threshold.
const DOWN_AT = 0.6;
const UP_AT = 0.2;

/**
 * Probe the COSMO v1 metadata API every 30s and maintain a rolling failure-rate
 * window in Redis, flipping an overriding up/down status with hysteresis so the
 * web navbar can surface a v1 outage without flapping. A 404 counts as up (v1
 * answered, the token just isn't generated) so only 5xx/timeout/network errors
 * register as an outage.
 */
export const cosmoHealthTask = {
  name: "cosmo-health",
  cron: "*/30 * * * * *",
  effect: Effect.gen(function* () {
    const redis = yield* Redis;

    const sample = yield* Effect.promise(async () => {
      try {
        await fetchMetadataV1(SENTINEL_TOKEN_ID, AbortSignal.timeout(5_000));
        return "1";
      } catch (error) {
        return error instanceof FetchError && error.status === 404 ? "1" : "0";
      }
    });

    // push the sample, keep only the most recent window, and refresh its TTL.
    yield* redis.lpush(COSMO_V1_SAMPLES_KEY, sample);
    yield* redis.ltrim(COSMO_V1_SAMPLES_KEY, 0, WINDOW_SIZE - 1);
    yield* redis.expire(COSMO_V1_SAMPLES_KEY, SAMPLES_TTL_SECONDS);

    const samples = yield* redis.lrange(
      COSMO_V1_SAMPLES_KEY,
      0,
      WINDOW_SIZE - 1,
    );
    const failures = samples.filter((s) => s === "0").length;
    const failRate = samples.length === 0 ? 0 : failures / samples.length;

    // hysteresis: flip down at >= 0.6, back up at <= 0.2, otherwise hold.
    const current = yield* redis.get(COSMO_V1_STATUS_KEY);
    let next: "up" | "down";
    if (failRate >= DOWN_AT) {
      next = "down";
    } else if (failRate <= UP_AT) {
      next = "up";
    } else {
      next = current === "down" ? "down" : "up";
    }

    yield* redis.set(COSMO_V1_STATUS_KEY, next, STATUS_TTL_SECONDS);
  }),
} satisfies ScheduledTask;

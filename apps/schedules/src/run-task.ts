import { BunRuntime } from "@effect/platform-bun";
import { Data, Effect } from "effect";
import { servicesLayer } from "./services";
import { SCHEDULED_TASKS } from "./task";

export class UnknownTaskError extends Data.TaggedError("UnknownTaskError")<{
  message: string;
}> {}

/**
 * `bun run task <name>`: run one scheduled task's effect once, with the
 * services `main.ts` provides but no queue workers and no retries, then exit.
 */
const program = Effect.gen(function* () {
  const name = process.argv[2];
  const task = SCHEDULED_TASKS.find((t) => t.name === name);
  if (task === undefined) {
    return yield* new UnknownTaskError({
      message: `Unknown task "${name ?? ""}", expected one of: ${SCHEDULED_TASKS.map((t) => t.name).join(", ")}`,
    });
  }

  yield* Effect.logInfo(`Running task: ${task.name}`);
  yield* task.effect;
  yield* Effect.logInfo(`Finished task: ${task.name}`);
});

BunRuntime.runMain(program.pipe(Effect.provide(servicesLayer)));

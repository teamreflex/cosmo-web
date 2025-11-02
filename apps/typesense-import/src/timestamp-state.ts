import { FileSystem, Path } from "@effect/platform";
import { Effect, Ref } from "effect";

export class Timestamp {
  get: Effect.Effect<string | null>;
  set: (value: string) => Effect.Effect<void>;

  constructor(private value: Ref.Ref<string | null>) {
    this.get = Ref.get(this.value);
    this.set = (value) => Ref.set(this.value, value);
  }
}

/**
 * Initialize the lastCreatedAt file
 */
const initializeLastCreatedAt = Effect.gen(function* () {
  const path = yield* Path.Path;
  const fs = yield* FileSystem.FileSystem;

  const lastCreatedAtPath = path.join(__dirname, "../lastCreatedAt.txt");
  const fileExists = yield* fs.exists(lastCreatedAtPath);
  if (fileExists) {
    const lastCreatedAt = yield* fs.readFileString(lastCreatedAtPath);
    return lastCreatedAt;
  }

  return null;
});

export const initializeTimestamp = initializeLastCreatedAt.pipe(
  Effect.andThen(Ref.make),
  Effect.andThen((value) => new Timestamp(value)),
);

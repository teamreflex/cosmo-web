import { Effect, Ref } from "effect";

export class Timestamp {
  get: Effect.Effect<string | null>;
  set: (value: string) => Effect.Effect<void>;

  constructor(private value: Ref.Ref<string | null>) {
    this.get = Ref.get(this.value);
    this.set = (value) => Ref.set(this.value, value);
  }
}

export const initializeTimestamp = Ref.make<string | null>(null).pipe(
  Effect.andThen((value) => new Timestamp(value)),
);

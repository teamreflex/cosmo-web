import { createSerializationAdapter } from "@tanstack/router-core";
import { ExpectedError } from "./expected";

/**
 * Preserves ExpectedError across the server→client boundary as a real instance.
 */
export const expectedErrorSerializationAdapter = createSerializationAdapter({
  key: "ExpectedError",
  test: (value): value is ExpectedError => value instanceof ExpectedError,
  toSerializable: (error) => ({ message: error.message }),
  fromSerializable: (data) => new ExpectedError(data.message),
});

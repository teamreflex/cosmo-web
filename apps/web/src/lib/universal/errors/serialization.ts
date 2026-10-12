import { createSerializationAdapter } from "@tanstack/router-core";
import { ExpectedError } from "./expected";

/**
 * Preserves ExpectedError across the server→client boundary as a real
 * instance, with its data.
 */
export const expectedErrorSerializationAdapter = createSerializationAdapter({
  key: "ExpectedError",
  test: (value): value is ExpectedError => value instanceof ExpectedError,
  toSerializable: (error) => ({ message: error.message, data: error.data }),
  fromSerializable: ({ message, data }) => new ExpectedError(message, data),
});

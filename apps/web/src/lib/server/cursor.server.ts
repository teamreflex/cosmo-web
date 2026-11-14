import * as z from "zod";

// a timestamp as Postgres prints it, then a row id
const cursorSchema = z.tuple([
  z.string().regex(/^\d{4}-\d{2}-\d{2}[ T][\d:.]+([+-][\d:]+|Z)?$/),
  z.guid(),
]);

/**
 * Keyset cursors over (timestamp, id), base64-encoded to stay opaque. Pass the
 * timestamp as Postgres text, which keeps the microseconds a JS Date drops. A
 * cursor that doesn't decode to both parts reads as no cursor, so the caller
 * serves its first page.
 */
export function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;

  const parsed = cursorSchema.safeParse(
    Buffer.from(cursor, "base64").toString().split("|"),
  );
  return parsed.success
    ? { timestamp: parsed.data[0], id: parsed.data[1] }
    : null;
}

export function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(`${timestamp}|${id}`).toString("base64");
}

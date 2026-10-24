/**
 * Keyset cursors over (timestamp, id), base64-encoded to stay opaque. Pass the
 * timestamp as Postgres text, which keeps the microseconds a JS Date drops.
 */
export function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;

  const [timestamp, id] = Buffer.from(cursor, "base64").toString().split("|");
  return timestamp && id ? { timestamp, id } : null;
}

export function encodeCursor(timestamp: string, id: string) {
  return Buffer.from(`${timestamp}|${id}`).toString("base64");
}

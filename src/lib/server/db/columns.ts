import { customType, timestamp } from "drizzle-orm/pg-core";

export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

export const createdAt = timestamp("created_at", {
  withTimezone: true,
  mode: "string",
});

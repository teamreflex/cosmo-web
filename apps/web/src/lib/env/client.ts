import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    // info for rebranding the app
    VITE_APP_NAME: z.string().min(1),
    // url of the app
    VITE_BASE_URL: z.string().min(1),
    // environment type
    VITE_APP_ENV: z.enum(["preview", "development", "production"]),
    // git hash
    VITE_COMMIT_SHA: z.string().min(1),
    // umami analytics
    VITE_UMAMI_ID: z.string().optional(),
    VITE_UMAMI_SCRIPT_URL: z.url().optional(),
    // sentry
    VITE_SENTRY_DSN: z.string().optional(),
    // typesense
    VITE_TYPESENSE_URL: z.string().min(1),
    VITE_TYPESENSE_KEY: z.string().min(1),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});

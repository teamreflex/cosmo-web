import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const env = createEnv({
  clientPrefix: "VITE_",
  client: {
    // info for rebranding the app
    VITE_APP_NAME: z.string().min(1),
    // url of the app
    VITE_VERCEL_PROJECT_PRODUCTION_URL: z.string().min(1),
    // environment type
    VITE_VERCEL_ENV: z.string().min(1),
    // umami analytics
    VITE_UMAMI_ID: z.string().min(1),
    VITE_UMAMI_SCRIPT_URL: z.string().min(1),
    // sentry
    VITE_SENTRY_DSN: z.string().min(1),
    // typesense
    VITE_TYPESENSE_URL: z.string().min(1),
    VITE_TYPESENSE_KEY: z.string().min(1),
  },
  runtimeEnv: import.meta.env,
  emptyStringAsUndefined: true,
});

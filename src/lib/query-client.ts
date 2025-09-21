import { env } from "@/env";

/**
 * Get the base URL for the app.
 */
export function baseUrl() {
  const scheme = env.VITE_VERCEL_ENV === "development" ? "http" : "https";
  return `${scheme}://${env.VITE_VERCEL_PROJECT_PRODUCTION_URL}`;
}

import { env } from "@/lib/env/client";

/**
 * Generate SEO metadata for a page.
 */
export function seoTitle(title: string) {
  return {
    title: `${title} · ${env.VITE_APP_NAME}`,
  };
}

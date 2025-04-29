/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders(ttl: number) {
  return {
    // vercel: cache for X seconds
    "Vercel-CDN-Cache-Control": `max-age=0, s-maxage=${ttl}, stale-while-revalidate=30`,
    // cloudflare: cache for 60 seconds
    "CDN-Cache-Control": `max-age=0, s-maxage=60`,
    // browser: cache for 30 seconds
    "Cache-Control": "max-age=30",
  };
}

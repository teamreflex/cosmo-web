type CacheHeaders = {
  vercel: number;
  cloudflare?: number;
};

/**
 * Default cache headers for API responses, in order of priority.
 */
export function cacheHeaders({ vercel, cloudflare = 60 }: CacheHeaders) {
  return {
    // vercel: cache for X seconds
    "Vercel-CDN-Cache-Control": `max-age=0, s-maxage=${vercel}, stale-while-revalidate=30`,
    // cloudflare: cache for 60 seconds
    "CDN-Cache-Control": `max-age=0, s-maxage=${cloudflare}`,
    // browser: cache for 30 seconds
    "Cache-Control": "max-age=30",
  };
}

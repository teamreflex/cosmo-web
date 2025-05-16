import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { env } from "./src/env";

const config: NextConfig = {
  experimental: {
    reactCompiler: true,
    taint: true,
    useCache: true,
    cacheLife: {
      // system status (block height)
      system: {
        stale: 60, // 1 minute
        revalidate: 60, // 1 minute
        expire: 90, // 1.5 minutes
      },
      // como balances
      como: {
        stale: 60 * 15, // 15 minutes
        revalidate: 60 * 15, // 15 minutes
        expire: 60 * 20, // 20 minutes
      },
      // filter data (collections, seasons, classes)
      filterData: {
        stale: 60 * 60 * 4, // 4 hours
        revalidate: 60 * 60 * 4, // 4 hours
        expire: 60 * 60 * 8, // 8 hours
      },
      // objekt stats (24-hour window)
      objektStats: {
        stale: 60 * 60 * 2, // 2 hours
        revalidate: 60 * 60 * 2, // 2 hours
        expire: 60 * 60 * 4, // 4 hours
      },
      // user pins
      pins: {
        stale: 60 * 60 * 24, // 1 day
        revalidate: 60 * 60 * 24, // 1 day
        expire: 60 * 60 * 24 * 2, // 2 days
      },
    },
    staleTimes: {
      dynamic: 60 * 5, // 5 minutes
      static: 60 * 5, // 5 minutes
    },
  },

  logging: {
    fetches: {
      fullUrl: process.env.VERCEL_ENV === "development",
    },
  },

  async redirects() {
    return [
      {
        source: "/",
        destination: "/objekts",
        permanent: true,
      },
      {
        source: "/admin",
        destination: "/admin/metadata",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/@:nickname/progress",
        destination: "/profile/:nickname/progress",
      },
      {
        source: "/@:nickname/como",
        destination: "/profile/:nickname/como",
      },
      {
        source: "/@:nickname/trades",
        destination: "/profile/:nickname/trades",
      },
      {
        source: "/@:nickname/list/:list",
        destination: "/profile/:nickname/list/:list",
      },
      {
        source: "/@:nickname",
        destination: "/profile/:nickname",
      },
    ];
  },

  images: {
    unoptimized: true,
    remotePatterns: [
      // objekt images
      {
        protocol: "https",
        hostname: "imagedelivery.net",
      },
      // cosmo images (news, artist etc)
      {
        protocol: "https",
        hostname: "**.cosmo.fans",
      },
      {
        protocol: "https",
        hostname: "s3.ap-northeast-2.amazonaws.com",
        pathname: "/**.cosmo.fans/**",
      },
    ],
  },
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

export default withSentryConfig(withBundleAnalyzer(config), {
  org: env.SENTRY_ORG,
  project: env.SENTRY_PROJECT,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    deleteSourcemapsAfterUpload: true,
  },
  reactComponentAnnotation: {
    enabled: true,
  },
  disableLogger: true,
});

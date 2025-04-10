import { withSentryConfig } from "@sentry/nextjs";
import type { NextConfig } from "next";
import { env } from "./src/env";

const config: NextConfig = {
  experimental: {
    serverComponentsHmrCache: true,
    reactCompiler: true,
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
        source: "/admin",
        destination: "/admin/metadata",
        permanent: true,
      },
    ];
  },

  async rewrites() {
    return [
      {
        source: "/@:nickname/voting",
        destination: "/profile/:nickname/voting",
      },
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

import type { NextConfig } from "next";
import "./src/env.mjs";

const config: NextConfig = {
  logging: {
    fetches: {
      fullUrl: process.env.VERCEL_ENV === "development",
    },
  },

  async redirects() {
    return [
      {
        source: "/my",
        destination: "/activity",
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
        pathname: "/static.cosmo.fans/**",
      },
      {
        protocol: "https",
        hostname: "s3.ap-northeast-2.amazonaws.com",
        pathname: "/resources.cosmo.fans/**",
      },
    ],
  },
};

export default config;

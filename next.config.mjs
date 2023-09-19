import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    serverActions: true,
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        hostname: "imagedelivery.net",
      },
    ],
  },
};

export default config;

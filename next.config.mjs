import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    serverActions: true,
  },
};

export default config;

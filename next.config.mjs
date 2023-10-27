import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const config = {
  experimental: {
    typedRoutes: true,
  },

  rewrites() {
    return [
      {
        source: "/@:nickname",
        destination: "/u/:nickname",
      },
    ];
  },

  images: {
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
    ],
  },
};

export default config;

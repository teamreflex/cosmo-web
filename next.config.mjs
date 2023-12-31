import million from "million/compiler";
import "./src/env.mjs";

/** @type {import('next').NextConfig} */
const config = {
  logging: {
    fetches: {
      fullUrl: process.env.NODE_ENV === "development",
    },
  },

  webpack: (config, { webpack }) => {
    config.plugins.push(
      new webpack.IgnorePlugin({
        resourceRegExp: /^pg-native$|^cloudflare:sockets$/,
      })
    );

    return config;
  },

  async rewrites() {
    return {
      beforeFiles: [
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
      ],
    };
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

export default million.next(config, {
  mute: true,
  auto: {
    rsc: true,
  },
});

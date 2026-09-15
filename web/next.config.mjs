/** @type {import("next").NextConfig} */
const nextConfig = {
  output: "standalone",

  experimental: {
    serverComponentsExternalPackages: ["mongoose"],
  },

  env: {
    MONGODB_URI: process.env.MONGODB_URI,
    JWT_SECRET: process.env.JWT_SECRET,
    AI_SERVICE_URL: process.env.AI_SERVICE_URL,
    HARDHAT_RPC_URL: process.env.HARDHAT_RPC_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  webpack(config, { isServer }) {
    // face-api.js relies on the "canvas" package for Node.js, which is not
    // needed in the browser and would fail to build. Stub it out.
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        encoding: false,
      };
    }

    // Suppress the "Critical dependency" warning from dexie
    config.module = config.module || {};
    config.module.exprContextCritical = false;

    return config;
  },
};

export default nextConfig;

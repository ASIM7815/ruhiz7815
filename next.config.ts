import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
      {
        protocol: "https",
        hostname: "storage.googleapis.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  // Ensure Prisma client, PostgreSQL adapter, and GCS are not bundled (use native Node.js modules)
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg", "@google-cloud/storage"],
  
  // Optimize for production
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;

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
  // Ensure Prisma client and PostgreSQL adapter are not bundled (AWS SDK v3 is fine to bundle)
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  
  // Optimize for production
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
  
  // Rewrite @username URLs to /u/username for profile sharing
  async rewrites() {
    return [
      {
        source: "/@:username",
        destination: "/u/:username",
      },
    ];
  },
};

export default nextConfig;

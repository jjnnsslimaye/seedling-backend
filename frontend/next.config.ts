// Next.js configuration for Seedling frontend
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 's3.us-east-2.amazonaws.com',
        pathname: '/seedling-submissions/**',
      },
      {
        protocol: 'https',
        hostname: 'seedling-submissions.s3.us-east-2.amazonaws.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;

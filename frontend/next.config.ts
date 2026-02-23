import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  webpack: (config) => {
    console.log('__dirname is:', __dirname);
    console.log('Resolved @ to:', path.resolve(__dirname));
    config.resolve.alias = {
      ...config.resolve.alias,
      '@': path.resolve(__dirname),
    };
    return config;
  },
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

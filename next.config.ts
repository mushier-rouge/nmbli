import type { NextConfig } from 'next';

// Force rebuild
const nextConfig: NextConfig = {
  productionBrowserSourceMaps: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
};

export default nextConfig;

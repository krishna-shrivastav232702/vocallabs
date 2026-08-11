import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Enable strict mode for better React 19 compatibility
  reactStrictMode: true,

  // Allow nhost storage images
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.nhost.run',
      },
    ],
  },

  // Suppress the @nhost/* peer-dep deprecation warnings from build output
  // (packages are still maintained for security/bug fixes per their changelog)
  experimental: {},
};

export default nextConfig;

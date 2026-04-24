import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Allow large file uploads for document processing
  experimental: {
    serverActions: {
      bodySizeLimit: '25mb',
    },
  },
  // Server-side packages that cannot be bundled for client
  serverExternalPackages: ['pdf-parse', 'mammoth'],
};

export default nextConfig;

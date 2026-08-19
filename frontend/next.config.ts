import type { NextConfig } from 'next';


const backendOrigin = (process.env.NEXT_PUBLIC_BACKEND_ORIGIN || 'http://localhost:8000').replace(/\/$/, '');

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${backendOrigin}/api/:path*`,
      },
      {
        source: '/media/:path*',
        destination: `${backendOrigin}/media/:path*`,
      },
    ];
  },
};

export default nextConfig;

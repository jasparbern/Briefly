import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: '/:path*',
        has: [{ type: 'host', value: 'briefly-gamma-red.vercel.app' }],
        destination: 'https://abridgly.com/:path*',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

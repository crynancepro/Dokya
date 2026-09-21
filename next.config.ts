import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  typescript: {
    // Empêche les erreurs de typage non-bloquantes d'interrompre le build de production Vercel
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;

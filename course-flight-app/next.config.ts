import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // three is shipped as ESM with untranspiled modern syntax in some subpaths.
  transpilePackages: ['three'],
  headers: async () => [
    {
      source: '/manifest.webmanifest',
      headers: [{ key: 'Content-Type', value: 'application/manifest+json' }],
    },
  ],
}

export default nextConfig

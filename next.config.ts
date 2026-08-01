import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Creates a fully local web bundle for the native Capacitor iOS app.
  output: 'export',
  // three is shipped as ESM with untranspiled modern syntax in some subpaths.
  transpilePackages: ['three'],
}

export default nextConfig

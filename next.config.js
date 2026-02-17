/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['lighthouse', 'chrome-launcher', 'playwright'],
  },
}

module.exports = nextConfig

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  // Proxy all Express API routes to localhost:4000 inside the container
  async rewrites() {
    const apiBase = process.env.INTERNAL_API_URL || 'http://localhost:4000'
    return [
      { source: '/auth/:path*',        destination: `${apiBase}/auth/:path*` },
      { source: '/residents/:path*',   destination: `${apiBase}/residents/:path*` },
      { source: '/elections/:path*',   destination: `${apiBase}/elections/:path*` },
      { source: '/maintenance/:path*', destination: `${apiBase}/maintenance/:path*` },
      { source: '/visitors/:path*',    destination: `${apiBase}/visitors/:path*` },
      { source: '/admin/:path*',       destination: `${apiBase}/admin/:path*` },
      { source: '/maids/:path*',       destination: `${apiBase}/maids/:path*` },
      { source: '/health',             destination: `${apiBase}/health` },
      { source: '/download/:path*',    destination: `${apiBase}/download/:path*` },
      { source: '/download',           destination: `${apiBase}/download` },
    ]
  },
}

export default nextConfig

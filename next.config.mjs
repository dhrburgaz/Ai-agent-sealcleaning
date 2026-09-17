/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'components', 'lib', 'db', 'scripts', 'tests'],
  },
  serverExternalPackages: ['better-sqlite3'],
  // Phase 10 hardening pass: baseline security headers on every response.
  // This is a single-owner operational app with no third-party embedding use
  // case, so a strict frame/referrer policy costs nothing functionally.
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ];
  },
};

export default nextConfig;

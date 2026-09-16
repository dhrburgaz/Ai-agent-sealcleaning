/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    dirs: ['app', 'components', 'lib', 'db', 'scripts', 'tests'],
  },
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;

const backend = process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000';
const j2meHost = process.env.J2ME_RUNTIME_HOST || 'j2me.localhost';
const launcherHost = process.env.LAUNCHER_HOST || 'launcher.localhost';
const dedicated = process.env.NEXT_PUBLIC_J2ME_DEDICATED_ORIGIN === 'true';

const launcherCsp = dedicated
  ? `default-src 'self' blob:; script-src 'self' 'unsafe-inline' 'unsafe-eval' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; worker-src 'self' blob:; frame-src 'self' http://${j2meHost}:* http://${j2meHost} https://${j2meHost}:* https://${j2meHost}; frame-ancestors 'self'; base-uri 'none'`
  : null;

export default {
  output: 'standalone',
  skipTrailingSlashRedirect: true,
  poweredByHeader: false,
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: `${backend}/api/v1/:path*/` },
      { source: '/dev-assets/:path*', destination: `${backend}/dev-assets/:path*/` },
    ];
  },
  async headers() {
    const security = [
      { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
      { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'same-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ];
    return [
      {
        source: '/:path*',
        headers: [
          ...security,
          // Default CORP for launcher; j2me host overrides to cross-origin in middleware.
          { key: 'Cross-Origin-Resource-Policy', value: 'same-origin' },
          ...(launcherCsp ? [{ key: 'Content-Security-Policy', value: launcherCsp }] : []),
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/j2me-sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
      {
        source: '/runtime/:path*',
        headers: [
          {
            key: 'Content-Security-Policy',
            value:
              "default-src 'self' blob:; script-src 'self' blob: 'unsafe-eval'; worker-src 'self' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; connect-src 'self' blob:; frame-ancestors 'self' http://launcher.localhost:* https://launcher.localhost:* http://localhost:* https://localhost:*; base-uri 'none'",
          },
        ],
      },
    ];
  },
};

const backend = process.env.API_INTERNAL_URL || 'http://127.0.0.1:8000';
const j2meHost = process.env.J2ME_RUNTIME_HOST || 'j2me.localhost';

// CSP is owned by middleware.ts so /runtime/* and launcher HTML do not stack
// conflicting Content-Security-Policy headers. Keep transport isolation here.
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
        // frame-ancestors only as a static hint; full CSP is set in middleware.
        source: '/runtime/:path*',
        headers: [
          {
            key: 'X-RBG-Runtime-Frame',
            value: '1',
          },
          {
            key: 'Cross-Origin-Resource-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

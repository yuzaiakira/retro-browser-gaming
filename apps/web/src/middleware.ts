import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import allowlist from './policy/browser-distributable-allowlist.json';

const J2ME_HOST = process.env.J2ME_RUNTIME_HOST || 'j2me.localhost';
const LAUNCHER_HOST = process.env.LAUNCHER_HOST || 'launcher.localhost';
const PROVISION_MODE = (
  process.env.RBG_CORE_PROVISION_MODE ||
  process.env.NEXT_PUBLIC_RBG_CORE_PROVISION_MODE ||
  'PUBLIC_BROWSER'
).trim();

/** Paths authorized for anonymous browser delivery under PUBLIC_BROWSER. */
const authorizedCorePaths = new Set(
  (allowlist.files || [])
    .filter(
      (row: { browser_distribution?: string }) =>
        row.browser_distribution === 'AUTHORIZED_BROWSER_DISTRIBUTABLE',
    )
    .map((row: { path: string }) => `/cores/${row.path}`),
);

function normalizeCorePath(pathname: string): string {
  try {
    return decodeURIComponent(pathname).replace(/\\/g, '/');
  } catch {
    return pathname.replace(/\\/g, '/');
  }
}

/**
 * PUBLIC_BROWSER: allow only AUTHORIZED_BROWSER_DISTRIBUTABLE .data/.wasm under /cores/.
 * Unknown, not-cleared, and unclassified binaries are denied (404).
 * LOCAL_FULL: no middleware deny (authorized local/dev; sync still controls disk).
 */
function denyUnauthorizedCore(pathname: string): NextResponse | null {
  if (PROVISION_MODE !== 'PUBLIC_BROWSER') return null;
  const normalized = normalizeCorePath(pathname);
  if (!normalized.startsWith('/cores/')) return null;
  const lower = normalized.toLowerCase();
  if (!lower.endsWith('.data') && !lower.endsWith('.wasm')) return null;
  if (authorizedCorePaths.has(normalized)) return null;
  return new NextResponse('Core not authorized for public browser distribution', {
    status: 404,
  });
}

function isJ2meHost(host: string) {
  const name = host.split(':')[0].toLowerCase();
  return name === J2ME_HOST.toLowerCase();
}

function launcherOrigins(): string[] {
  const configured = process.env.LAUNCHER_FRAME_ANCESTORS || '';
  const list = configured
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length) return list;
  return [
    `http://${LAUNCHER_HOST}:*`,
    `http://${LAUNCHER_HOST}`,
    `https://${LAUNCHER_HOST}:*`,
    `https://${LAUNCHER_HOST}`,
    'http://localhost:*',
    'https://localhost:*',
    'http://127.0.0.1:*',
    'https://127.0.0.1:*',
  ];
}

function j2mePathAllowed(pathname: string) {
  return (
    pathname.startsWith('/runtime/') ||
    pathname.startsWith('/cores/js2me/') ||
    pathname === '/j2me-sw.js' ||
    pathname === '/j2me-install.html' ||
    pathname.startsWith('/_next/static/')
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

  const blocked = denyUnauthorizedCore(pathname);
  if (blocked) return blocked;

  if (isJ2meHost(host)) {
    if (pathname.startsWith('/api/') || pathname.startsWith('/dev-assets/')) {
      return new NextResponse('Forbidden on J2ME origin', { status: 403 });
    }
    if (!j2mePathAllowed(pathname) && pathname !== '/') {
      return new NextResponse('Not found on J2ME origin', { status: 404 });
    }
    if (pathname === '/') {
      return NextResponse.redirect(new URL('/j2me-install.html', request.url));
    }

    const response = NextResponse.next();
    const ancestors = launcherOrigins().join(' ');
    response.headers.set('Cross-Origin-Resource-Policy', 'cross-origin');
    response.headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    response.headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    // Dedicated J2ME origin: keep eval for legacy VM glue; do not broaden
    // connect-src / frame-src beyond self+blob.
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self' blob:",
        "script-src 'self' blob: 'unsafe-eval' 'unsafe-inline'",
        "worker-src 'self' blob:",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "connect-src 'self' blob:",
        `frame-ancestors ${ancestors}`,
        "base-uri 'none'",
        "form-action 'none'",
      ].join('; '),
    );
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('Referrer-Policy', 'no-referrer');
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    if (pathname === '/j2me-sw.js') {
      response.headers.set('Service-Worker-Allowed', '/');
      response.headers.set('Cache-Control', 'no-cache');
    }
    return response;
  }

  const response = NextResponse.next();
  response.headers.set('Cross-Origin-Resource-Policy', 'same-origin');
  response.headers.set('X-RBG-Launcher', '1');

  // Single CSP owner for launcher host (avoid stacking next.config + meta +
  // middleware policies). Emulator frames must NOT inherit Next flight
  // 'unsafe-inline' allowances from the shell.
  if (pathname.startsWith('/runtime/')) {
    const ancestors = launcherOrigins().join(' ');
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self' blob:",
        // External frame JS + Emscripten Function()/WASM. No 'unsafe-inline':
        // frames load versioned .js only (mame/hatari/ruffle/ejs).
        "script-src 'self' blob: 'unsafe-eval' 'wasm-unsafe-eval'",
        "worker-src 'self' blob:",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "connect-src 'self' blob:",
        "media-src 'self' blob:",
        `frame-ancestors ${ancestors}`,
        "base-uri 'none'",
        "form-action 'none'",
        "object-src 'none'",
      ].join('; '),
    );
  } else if (
    !pathname.startsWith('/api/') &&
    !pathname.startsWith('/dev-assets/') &&
    !pathname.startsWith('/cores/')
  ) {
    // Next App Router embeds small inline flight payloads in document HTML.
    // That is a Next shell requirement — not a license to allow inline scripts
    // inside emulator iframes (handled above).
    // wasm-unsafe-eval: hash-wasm integrity checks during OPFS download/install.
    // Do NOT add unsafe-eval on the shell.
    const j2me = process.env.J2ME_RUNTIME_HOST || 'j2me.localhost';
    response.headers.set(
      'Content-Security-Policy',
      [
        "default-src 'self' blob:",
        "script-src 'self' blob: 'unsafe-inline' 'wasm-unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' blob: data:",
        "connect-src 'self' blob:",
        "worker-src 'self' blob:",
        `frame-src 'self' blob: http://${j2me}:* http://${j2me} https://${j2me}:* https://${j2me}`,
        "frame-ancestors 'self'",
        "base-uri 'none'",
        "object-src 'none'",
      ].join('; '),
    );
  }

  return response;
}

export const config = {
  matcher: ['/((?!_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const J2ME_HOST = process.env.J2ME_RUNTIME_HOST || 'j2me.localhost';
const LAUNCHER_HOST = process.env.LAUNCHER_HOST || 'launcher.localhost';

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
    'http://localhost:*',
    'http://127.0.0.1:*',
  ];
}

function j2mePathAllowed(pathname: string) {
  return (
    pathname.startsWith('/runtime/') ||
    pathname.startsWith('/cores/js2me/') ||
    pathname === '/j2me-sw.js' ||
    pathname === '/j2me-install.html' ||
    pathname.startsWith('/_next/static/') // not required for static public assets
  );
}

export function middleware(request: NextRequest) {
  const host = request.headers.get('host') || '';
  const { pathname } = request.nextUrl;

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
  return response;
}

export const config = {
  matcher: ['/((?!_next/image|favicon.ico).*)'],
};

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'bmp-resproject-jwt-secret-key-2026-secure-factory-auth'
);

const COOKIE_NAME = 'session_token';

// Route Access Matrix by Role
function isRouteAllowedForRole(role: string, pathname: string): boolean {
  if (role === 'ADMIN') return true; // Admin has access to all routes

  // Public/Shared for all logged-in users
  if (
    pathname === '/' ||
    pathname === '/inventory' ||
    pathname === '/transactions' ||
    pathname.startsWith('/production/') // includes print page
  ) {
    return true;
  }

  if (role === 'STORE') {
    // Store/Warehouse: scan, inbound, sections
    return (
      pathname.startsWith('/scan') ||
      pathname.startsWith('/inbound') ||
      pathname.startsWith('/sections')
    );
  }

  if (role === 'PROD') {
    // Production/Planning: production calculation, orders, recipes
    return (
      pathname.startsWith('/production') ||
      pathname.startsWith('/recipes')
    );
  }

  if (role === 'VIEWER') {
    // Viewer: read-only access to dashboard, inventory, transactions
    return pathname === '/' || pathname === '/inventory' || pathname === '/transactions';
  }

  return false;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. Allow public files and auth API routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/api/auth/login') ||
    pathname.startsWith('/api/auth/logout') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let decodedUser: { id: string; username: string; role: string } | null = null;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, SECRET_KEY);
      if (payload.id && payload.role) {
        decodedUser = {
          id: payload.id as string,
          username: payload.username as string,
          role: payload.role as string,
        };
      }
    } catch {
      decodedUser = null;
    }
  }

  // 2. If already logged in and visiting /login -> redirect to /
  if (pathname === '/login') {
    if (decodedUser) {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  // 3. If NOT logged in:
  if (!decodedUser) {
    // API route -> 401
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'กรุณาเข้าสู่ระบบก่อนใช้งาน' }, { status: 401 });
    }
    // Web page -> redirect to /login
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 4. Role-Based Access Control for pages
  if (!pathname.startsWith('/api/')) {
    const isAllowed = isRouteAllowedForRole(decodedUser.role, pathname);
    if (!isAllowed) {
      // Unauthorized page -> redirect to dashboard
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  // 5. Special protection for ADMIN only pages & APIs
  if (
    pathname.startsWith('/db-studio') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/api/admin/') ||
    pathname.startsWith('/api/users')
  ) {
    if (decodedUser.role !== 'ADMIN') {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json({ error: 'เฉพาะแอดมินเท่านั้นที่สามารถดำเนินการได้' }, { status: 403 });
      }
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};

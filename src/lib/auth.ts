import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { UserRole, SessionUser, ROLE_CONFIG, COOKIE_NAME } from './authTypes';

export * from './authTypes';

const SECRET_KEY = new TextEncoder().encode(
  process.env.SESSION_SECRET || 'bmp-resproject-jwt-secret-key-2026-secure-factory-auth'
);

// Hash raw password
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Verify password against hash
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Create Signed JWT token (valid for 30 days)
export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(SECRET_KEY);
}

// Verify JWT token and extract session user
export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET_KEY);
    if (!payload.id || !payload.username || !payload.role) return null;
    return {
      id: payload.id as string,
      username: payload.username as string,
      name: (payload.name as string) || (payload.username as string),
      role: payload.role as UserRole,
    };
  } catch {
    return null;
  }
}

// Get logged-in user in Server Components and API Routes
export async function getCurrentUser(): Promise<SessionUser | null> {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifySessionToken(token);
  } catch {
    return null;
  }
}

// Seed default users if the User table is completely empty
export async function seedDefaultUsersIfNeeded() {
  try {
    const count = await prisma.user.count();
    if (count > 0) return;

    const defaultUsers = [
      {
        username: 'admin',
        name: 'ผู้ดูแลระบบ',
        passwordRaw: 'admin1234',
        role: 'ADMIN' as UserRole,
      },
      {
        username: 'store',
        name: 'เจ้าหน้าที่คลัง',
        passwordRaw: '1234',
        role: 'STORE' as UserRole,
      },
      {
        username: 'prod',
        name: 'ฝ่ายผลิตและวางแผน',
        passwordRaw: '1234',
        role: 'PROD' as UserRole,
      },
      {
        username: 'viewer',
        name: 'ผู้บริหาร/ดูข้อมูล',
        passwordRaw: '1234',
        role: 'VIEWER' as UserRole,
      },
    ];

    for (const u of defaultUsers) {
      const passwordHash = await hashPassword(u.passwordRaw);
      await prisma.user.create({
        data: {
          username: u.username,
          name: u.name,
          passwordHash,
          role: u.role,
          isActive: true,
        },
      });
    }
  } catch (err) {
    console.error('Failed to seed default users:', err);
  }
}

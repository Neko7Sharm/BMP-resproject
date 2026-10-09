import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword, UserRole, seedDefaultUsersIfNeeded } from '@/lib/auth';

// GET /api/users — List all users (ADMIN only)
export async function GET() {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์เข้าถึงข้อมูลผู้ใช้งาน' }, { status: 403 });
    }

    await seedDefaultUsersIfNeeded();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(users);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/users — Create a new user (ADMIN only)
export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์สร้างบัญชีผู้ใช้งาน' }, { status: 403 });
    }

    const body = await req.json();
    const { username, name, password, role } = body;

    if (!username || !password || !name) {
      return NextResponse.json({ error: 'กรุณากรอก Username, ชื่อ-นามสกุล และรหัสผ่าน' }, { status: 400 });
    }

    const cleanUsername = username.trim().toLowerCase();
    const existing = await prisma.user.findFirst({
      where: { username: { equals: cleanUsername, mode: 'insensitive' } },
    });

    if (existing) {
      return NextResponse.json({ error: `ชื่อผู้ใช้ "${cleanUsername}" มีอยู่ในระบบแล้ว` }, { status: 409 });
    }

    const validRoles: UserRole[] = ['ADMIN', 'STORE', 'PROD', 'VIEWER'];
    const assignedRole = validRoles.includes(role) ? role : 'STORE';

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        username: cleanUsername,
        name: name.trim(),
        passwordHash,
        role: assignedRole,
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        tableName: 'User',
        recordId: newUser.id,
        action: 'CREATE',
        summary: `สร้างบัญชีผู้ใช้ใหม่: ${newUser.name} (@${newUser.username}) ตำแหน่ง ${assignedRole}`,
        newData: JSON.stringify({ username: newUser.username, name: newUser.name, role: newUser.role }),
        changedBy: `${currentUser.name} (${currentUser.role})`,
      },
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

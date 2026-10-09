import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, hashPassword, UserRole } from '@/lib/auth';

// PUT /api/users/[id] — Update user / Reset password / Toggle active (ADMIN only)
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์แก้ไขข้อมูลผู้ใช้งาน' }, { status: 403 });
    }

    const { id } = params;
    const body = await req.json();
    const { name, role, isActive, newPassword } = body;

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    // Protect against self-deactivation
    if (currentUser.id === targetUser.id && isActive === false) {
      return NextResponse.json({ error: 'ไม่สามารถระงับการใช้งานบัญชีของตนเองได้' }, { status: 400 });
    }

    const updateData: any = {};
    const changes: string[] = [];

    if (name && name.trim() !== targetUser.name) {
      updateData.name = name.trim();
      changes.push(`เปลี่ยนชื่อเป็น "${updateData.name}"`);
    }

    if (role && role !== targetUser.role) {
      const validRoles: UserRole[] = ['ADMIN', 'STORE', 'PROD', 'VIEWER'];
      if (validRoles.includes(role)) {
        updateData.role = role;
        changes.push(`เปลี่ยนตำแหน่งจาก ${targetUser.role} เป็น ${role}`);
      }
    }

    if (typeof isActive === 'boolean' && isActive !== targetUser.isActive) {
      updateData.isActive = isActive;
      changes.push(isActive ? 'เปิดใช้งานบัญชี' : 'ระงับการใช้งานบัญชี');
    }

    if (newPassword && newPassword.trim().length >= 4) {
      updateData.passwordHash = await hashPassword(newPassword.trim());
      changes.push('รีเซ็ตรหัสผ่านใหม่');
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: 'ไม่มีข้อมูลเปลี่ยนแปลง', user: targetUser });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        updatedAt: true,
      },
    });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        tableName: 'User',
        recordId: targetUser.id,
        action: 'UPDATE',
        summary: `แก้ไขบัญชีผู้ใช้ @${targetUser.username}: ${changes.join(', ')}`,
        oldData: JSON.stringify({ name: targetUser.name, role: targetUser.role, isActive: targetUser.isActive }),
        newData: JSON.stringify({ name: updated.name, role: updated.role, isActive: updated.isActive }),
        changedBy: `${currentUser.name} (${currentUser.role})`,
      },
    });

    return NextResponse.json(updated);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE /api/users/[id] — Delete user (ADMIN only)
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser || currentUser.role !== 'ADMIN') {
      return NextResponse.json({ error: 'คุณไม่มีสิทธิ์ลบบัญชีผู้ใช้งาน' }, { status: 403 });
    }

    const { id } = params;

    // Prevent self-deletion
    if (currentUser.id === id) {
      return NextResponse.json({ error: 'ไม่สามารถลบบัญชีของตนเองได้' }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id } });
    if (!targetUser) {
      return NextResponse.json({ error: 'ไม่พบผู้ใช้งานนี้ในระบบ' }, { status: 404 });
    }

    await prisma.user.delete({ where: { id } });

    // Log to AuditLog
    await prisma.auditLog.create({
      data: {
        tableName: 'User',
        recordId: id,
        action: 'DELETE',
        summary: `ลบบัญชีผู้ใช้: ${targetUser.name} (@${targetUser.username}) ตำแหน่ง ${targetUser.role}`,
        oldData: JSON.stringify({ username: targetUser.username, name: targetUser.name, role: targetUser.role }),
        changedBy: `${currentUser.name} (${currentUser.role})`,
      },
    });

    return NextResponse.json({ success: true, message: `ลบบัญชี @${targetUser.username} เรียบร้อยแล้ว` });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const section = await prisma.section.findUnique({
      where: { id: params.id },
      include: {
        _count: { select: { materials: true } },
        materials: {
          select: {
            id: true,
            code: true,
            name: true,
            baseUnit: true,
            minSafetyStock: true,
            lots: {
              select: { quantityRemaining: true },
            },
          },
        },
      },
    });

    if (!section) {
      return NextResponse.json({ error: 'ไม่พบโซนคลังที่ต้องการ' }, { status: 404 });
    }

    return NextResponse.json(section);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { code, name, description } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'กรุณาระบุรหัสและชื่อโซน' }, { status: 400 });
    }

    const oldRecord = await prisma.section.findUnique({ where: { id: params.id } });

    const updated = await prisma.section.update({
      where: { id: params.id },
      data: {
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description || null,
      },
    });

    // Write Audit Log (non-blocking)
    prisma.auditLog.create({
      data: {
        tableName: 'Section',
        recordId: params.id,
        action: 'UPDATE',
        summary: `แก้ไขโซนคลัง: ${updated.code} - ${updated.name}`,
        oldData: oldRecord ? JSON.stringify(oldRecord) : null,
        newData: JSON.stringify(updated),
        changedBy: 'ผู้ใช้งานระบบ',
      },
    }).catch(() => {});

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    // Check if section has materials
    const count = await prisma.material.count({
      where: { sectionId: params.id },
    });

    if (count > 0) {
      return NextResponse.json(
        {
          error: `ไม่สามารถลบโซนนี้ได้ เนื่องจากยังมีวัตถุดิบ ${count} รายการอยู่ในโซนนี้ กรุณาย้ายหรือลบวัตถุดิบออกก่อน`,
        },
        { status: 400 }
      );
    }

    const oldRecord = await prisma.section.findUnique({ where: { id: params.id } });

    await prisma.section.delete({
      where: { id: params.id },
    });

    // Write Audit Log (non-blocking)
    prisma.auditLog.create({
      data: {
        tableName: 'Section',
        recordId: params.id,
        action: 'DELETE',
        summary: `ลบโซนคลัง: ${oldRecord?.code || params.id} - ${oldRecord?.name || ''}`,
        oldData: oldRecord ? JSON.stringify(oldRecord) : null,
        changedBy: 'ผู้ใช้งานระบบ',
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'ลบโซนคลังเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

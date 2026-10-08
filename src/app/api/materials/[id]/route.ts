import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const material = await prisma.material.findUnique({
      where: { id: params.id },
      include: {
        section: true,
        lots: {
          orderBy: { expDate: 'asc' },
        },
        transactions: {
          orderBy: { transactionDate: 'desc' },
          take: 20,
        },
      },
    });

    if (!material) {
      return NextResponse.json({ error: 'ไม่พบวัตถุดิบที่ต้องการ' }, { status: 404 });
    }

    return NextResponse.json(material);
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
    const { code, name, sectionId, baseUnit, minSafetyStock } = body;

    const oldRecord = await prisma.material.findUnique({
      where: { id: params.id },
      include: { section: true },
    });

    const updated = await prisma.material.update({
      where: { id: params.id },
      data: {
        code: code !== undefined ? code.trim() : undefined,
        name: name !== undefined ? name.trim() : undefined,
        sectionId: sectionId || null,
        baseUnit: baseUnit !== undefined ? baseUnit : undefined,
        minSafetyStock: minSafetyStock !== undefined ? Number(minSafetyStock) : undefined,
      },
      include: {
        section: true,
        lots: true,
      },
    });

    // Write Audit Log (non-blocking)
    prisma.auditLog.create({
      data: {
        tableName: 'Material',
        recordId: params.id,
        action: 'UPDATE',
        summary: `แก้ไขวัตถุดิบ: ${updated.code} - ${updated.name}`,
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
    const materialId = params.id;

    const oldRecord = await prisma.material.findUnique({
      where: { id: materialId },
      include: { section: true, lots: true },
    });

    // Use transaction to delete related records safely
    await prisma.$transaction(async (tx) => {
      // 1. Delete RequisitionItems linked to this material's lots
      const lots = await tx.materialLot.findMany({
        where: { materialId },
        select: { id: true },
      });
      const lotIds = lots.map((l) => l.id);

      if (lotIds.length > 0) {
        await tx.requisitionItem.deleteMany({
          where: { materialLotId: { in: lotIds } },
        });
      }

      // 2. Delete RecipeItems using this material
      await tx.recipeItem.deleteMany({
        where: { materialId },
      });

      // 3. Delete StockTransactions
      await tx.stockTransaction.deleteMany({
        where: { materialId },
      });

      // 4. Delete MaterialLots
      await tx.materialLot.deleteMany({
        where: { materialId },
      });

      // 5. Delete the Material itself
      await tx.material.delete({
        where: { id: materialId },
      });
    });

    // Write Audit Log (non-blocking)
    prisma.auditLog.create({
      data: {
        tableName: 'Material',
        recordId: materialId,
        action: 'DELETE',
        summary: `ลบวัตถุดิบ: ${oldRecord?.code || materialId} - ${oldRecord?.name || ''} (พร้อมข้อมูลล็อตและประวัติที่เกี่ยวข้อง)`,
        oldData: oldRecord ? JSON.stringify(oldRecord) : null,
        changedBy: 'ผู้ใช้งานระบบ',
      },
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'ลบวัตถุดิบและข้อมูลที่เกี่ยวข้องเรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

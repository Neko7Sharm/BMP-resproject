import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auditLog';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const sectionId = searchParams.get('sectionId');
    const search = searchParams.get('search');

    const where: any = {};
    if (sectionId && sectionId !== 'all') {
      where.sectionId = sectionId;
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { code: { contains: search } },
      ];
    }

    const materials = await prisma.material.findMany({
      where,
      include: {
        section: true,
        lots: {
          orderBy: { expDate: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    const now = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(now.getDate() + 90);

    const enriched = materials.map((m) => {
      const totalStock = m.lots.reduce((acc, lot) => acc + lot.quantityRemaining, 0);
      const isLowStock = totalStock <= m.minSafetyStock;

      const expiringLots = m.lots.filter(
        (lot) => lot.expDate && lot.expDate <= ninetyDaysLater && lot.quantityRemaining > 0
      );

      // Sort lots:
      // 1. Available lots (quantityRemaining > 0) come first
      //    - Within available: oldest production/expiry date comes first (FIFO/FEFO)
      // 2. Exhausted lots (quantityRemaining <= 0) come last
      //    - Within exhausted: sorted by receive date
      const sortedLots = [...m.lots].sort((a, b) => {
        const aHasStock = a.quantityRemaining > 0;
        const bHasStock = b.quantityRemaining > 0;

        if (aHasStock && !bHasStock) return -1;
        if (!aHasStock && bHasStock) return 1;

        // Both have stock or both exhausted: sort by date (oldest first)
        const aDate = a.expDate ? new Date(a.expDate).getTime() : new Date(a.receiveDate).getTime();
        const bDate = b.expDate ? new Date(b.expDate).getTime() : new Date(b.receiveDate).getTime();
        return aDate - bDate;
      });

      return {
        ...m,
        lots: sortedLots,
        totalStock: Number(totalStock.toFixed(3)),
        isLowStock,
        expiringSoonCount: expiringLots.length,
      };
    });

    // Sort materials: materials with stock > 0 first, then out-of-stock materials
    enriched.sort((a, b) => {
      const aInStock = a.totalStock > 0;
      const bInStock = b.totalStock > 0;
      if (aInStock && !bInStock) return -1;
      if (!aInStock && bInStock) return 1;
      return a.code.localeCompare(b.code);
    });

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, sectionId, baseUnit, minSafetyStock } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสและชื่อวัตถุดิบ' }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        code,
        name,
        sectionId: sectionId || null,
        baseUnit: baseUnit || 'kg',
        minSafetyStock: Number(minSafetyStock) || 0,
      },
    });

    // Write Audit Log (non-blocking)
    recordAuditLog({
      tableName: 'Material',
      recordId: material.id,
      action: 'CREATE',
      summary: `เพิ่มวัตถุดิบใหม่: ${material.code} - ${material.name}`,
      newData: material,
      changedBy: 'ผู้ใช้งานระบบ',
    }).catch(() => {});

    return NextResponse.json(material, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

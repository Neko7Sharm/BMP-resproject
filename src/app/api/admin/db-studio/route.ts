import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET: Fetch records or table stats
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table') || 'materials';
    const search = searchParams.get('search')?.trim() || '';

    // If requesting overview stats
    if (table === 'stats') {
      const [
        materialCount,
        lotCount,
        txCount,
        productCount,
        recipeCount,
        orderCount,
        sectionCount,
        auditCount,
      ] = await Promise.all([
        prisma.material.count(),
        prisma.materialLot.count(),
        prisma.stockTransaction.count(),
        prisma.product.count(),
        prisma.recipeItem.count(),
        prisma.productionOrder.count(),
        prisma.section.count(),
        prisma.auditLog.count(),
      ]);

      return NextResponse.json({
        materials: materialCount,
        lots: lotCount,
        transactions: txCount,
        products: productCount,
        recipes: recipeCount,
        orders: orderCount,
        sections: sectionCount,
        auditLogs: auditCount,
      });
    }

    let records: any[] = [];

    switch (table) {
      case 'materials':
        records = await prisma.material.findMany({
          where: search
            ? {
                OR: [
                  { code: { contains: search } },
                  { name: { contains: search } },
                ],
              }
            : undefined,
          include: {
            section: true,
            _count: { select: { lots: true, recipeItems: true } },
          },
          orderBy: { code: 'asc' },
          take: 100,
        });
        break;

      case 'lots':
        records = await prisma.materialLot.findMany({
          where: search
            ? {
                OR: [
                  { lotNumber: { contains: search } },
                  { material: { name: { contains: search } } },
                  { material: { code: { contains: search } } },
                ],
              }
            : undefined,
          include: {
            material: { select: { id: true, code: true, name: true, baseUnit: true } },
          },
          orderBy: { receiveDate: 'desc' },
          take: 100,
        });
        break;

      case 'transactions':
        records = await prisma.stockTransaction.findMany({
          where: search
            ? {
                OR: [
                  { documentRef: { contains: search } },
                  { material: { name: { contains: search } } },
                  { material: { code: { contains: search } } },
                  { remarks: { contains: search } },
                ],
              }
            : undefined,
          include: {
            material: { select: { id: true, code: true, name: true, baseUnit: true } },
            lot: { select: { id: true, lotNumber: true } },
          },
          orderBy: { transactionDate: 'desc' },
          take: 100,
        });
        break;

      case 'products':
        records = await prisma.product.findMany({
          where: search
            ? {
                OR: [
                  { code: { contains: search } },
                  { name: { contains: search } },
                ],
              }
            : undefined,
          include: {
            _count: { select: { recipeItems: true, productionOrders: true } },
          },
          orderBy: { code: 'asc' },
          take: 100,
        });
        break;

      case 'recipes':
        records = await prisma.recipeItem.findMany({
          where: search
            ? {
                OR: [
                  { product: { name: { contains: search } } },
                  { material: { name: { contains: search } } },
                ],
              }
            : undefined,
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
            material: { select: { id: true, code: true, name: true, baseUnit: true } },
          },
          orderBy: { product: { code: 'asc' } },
          take: 100,
        });
        break;

      case 'orders':
        records = await prisma.productionOrder.findMany({
          where: search
            ? {
                OR: [
                  { orderNo: { contains: search } },
                  { product: { name: { contains: search } } },
                  { notes: { contains: search } },
                ],
              }
            : undefined,
          include: {
            product: { select: { id: true, code: true, name: true, unit: true } },
            _count: { select: { requisitionItems: true } },
          },
          orderBy: { createdAt: 'desc' },
          take: 100,
        });
        break;

      case 'sections':
        records = await prisma.section.findMany({
          where: search
            ? {
                OR: [
                  { code: { contains: search } },
                  { name: { contains: search } },
                ],
              }
            : undefined,
          include: {
            _count: { select: { materials: true } },
          },
          orderBy: { code: 'asc' },
          take: 100,
        });
        break;

      case 'auditLogs':
        records = await prisma.auditLog.findMany({
          where: search
            ? {
                OR: [
                  { tableName: { contains: search } },
                  { recordId: { contains: search } },
                  { action: { contains: search } },
                  { summary: { contains: search } },
                  { changedBy: { contains: search } },
                ],
              }
            : undefined,
          orderBy: { createdAt: 'desc' },
          take: 150,
        });
        break;

      default:
        return NextResponse.json({ error: 'ตารางไม่ถูกต้อง' }, { status: 400 });
    }

    return NextResponse.json({ table, count: records.length, records });
  } catch (error: any) {
    console.error('DB Studio GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Helper to fetch current record before modifying
async function fetchOldRecord(table: string, id: string) {
  try {
    switch (table) {
      case 'materials':
        return await prisma.material.findUnique({ where: { id } });
      case 'lots':
        return await prisma.materialLot.findUnique({ where: { id } });
      case 'transactions':
        return await prisma.stockTransaction.findUnique({ where: { id } });
      case 'products':
        return await prisma.product.findUnique({ where: { id } });
      case 'recipes':
        return await prisma.recipeItem.findUnique({ where: { id } });
      case 'orders':
        return await prisma.productionOrder.findUnique({ where: { id } });
      case 'sections':
        return await prisma.section.findUnique({ where: { id } });
      case 'auditLogs':
        return await prisma.auditLog.findUnique({ where: { id } });
      default:
        return null;
    }
  } catch {
    return null;
  }
}

// Generate human-readable summary of fields changed
function generateUpdateSummary(table: string, oldRec: any, newRec: any): string {
  if (!oldRec || !newRec) return `แก้ไขข้อมูลในตาราง ${table}`;
  const changes: string[] = [];
  for (const key of Object.keys(newRec)) {
    if (['updatedAt', 'createdAt'].includes(key)) continue;
    const oldVal = oldRec[key];
    const newVal = newRec[key];
    if (oldVal !== undefined && String(oldVal) !== String(newVal)) {
      changes.push(`${key}: "${oldVal ?? '-'}" ➔ "${newVal ?? '-'}"`);
    }
  }
  if (changes.length === 0) return `แก้ไขข้อมูล ${table} (บันทึกข้อมูลเดิม)`;
  return `แก้ไข ${table} [${changes.slice(0, 3).join(', ')}${changes.length > 3 ? '...' : ''}]`;
}

// PUT: Update record in database
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { table, id, data } = body;

    if (!table || !id || !data) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน (table, id, data)' }, { status: 400 });
    }

    const oldRecord = await fetchOldRecord(table, id);
    let updated: any = null;

    switch (table) {
      case 'materials':
        updated = await prisma.material.update({
          where: { id },
          data: {
            code: data.code,
            name: data.name,
            baseUnit: data.baseUnit,
            minSafetyStock: data.minSafetyStock !== undefined ? Number(data.minSafetyStock) : undefined,
            sectionId: data.sectionId || null,
          },
        });
        break;

      case 'lots':
        updated = await prisma.materialLot.update({
          where: { id },
          data: {
            lotNumber: data.lotNumber,
            quantityRemaining: data.quantityRemaining !== undefined ? Number(data.quantityRemaining) : undefined,
            initialQuantity: data.initialQuantity !== undefined ? Number(data.initialQuantity) : undefined,
            status: data.status,
            receiveDate: data.receiveDate ? new Date(data.receiveDate) : undefined,
            expDate: data.expDate ? new Date(data.expDate) : null,
            mfgDate: data.mfgDate ? new Date(data.mfgDate) : null,
            costPerUnit: data.costPerUnit !== undefined ? Number(data.costPerUnit) : undefined,
          },
        });
        break;

      case 'transactions':
        updated = await prisma.stockTransaction.update({
          where: { id },
          data: {
            documentRef: data.documentRef,
            remarks: data.remarks,
            quantity: data.quantity !== undefined ? Number(data.quantity) : undefined,
            type: data.type,
            transactionDate: data.transactionDate ? new Date(data.transactionDate) : undefined,
          },
        });
        break;

      case 'products':
        updated = await prisma.product.update({
          where: { id },
          data: {
            code: data.code,
            name: data.name,
            unit: data.unit,
            description: data.description,
          },
        });
        break;

      case 'recipes':
        updated = await prisma.recipeItem.update({
          where: { id },
          data: {
            quantityRequired: data.quantityRequired !== undefined ? Number(data.quantityRequired) : undefined,
            unit: data.unit,
            notes: data.notes,
          },
        });
        break;

      case 'orders':
        updated = await prisma.productionOrder.update({
          where: { id },
          data: {
            orderNo: data.orderNo,
            targetQuantity: data.targetQuantity !== undefined ? Number(data.targetQuantity) : undefined,
            status: data.status,
            notes: data.notes,
            requestedBy: data.requestedBy,
            approvedBy: data.approvedBy,
          },
        });
        break;

      case 'sections':
        updated = await prisma.section.update({
          where: { id },
          data: {
            code: data.code,
            name: data.name,
            description: data.description,
          },
        });
        break;

      default:
        return NextResponse.json({ error: 'ไม่พบตารางที่ระบุ' }, { status: 400 });
    }

    // Record Audit Log entry for the update
    try {
      await prisma.auditLog.create({
        data: {
          tableName: table,
          recordId: id,
          action: 'UPDATE',
          summary: generateUpdateSummary(table, oldRecord, updated),
          oldData: oldRecord ? JSON.stringify(oldRecord) : null,
          newData: updated ? JSON.stringify(updated) : null,
          changedBy: 'ผู้ดูแลระบบ (DB Studio)',
        },
      });
    } catch (auditErr) {
      console.warn('Failed to save audit log:', auditErr);
    }

    return NextResponse.json({ success: true, updated });
  } catch (error: any) {
    console.error('DB Studio PUT error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: Delete record safely
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const table = searchParams.get('table');
    const id = searchParams.get('id');

    if (!table || !id) {
      return NextResponse.json({ error: 'กรุณาระบุ table และ id' }, { status: 400 });
    }

    const oldRecord = await fetchOldRecord(table, id);

    switch (table) {
      case 'materials':
        await prisma.material.delete({ where: { id } });
        break;
      case 'lots':
        await prisma.materialLot.delete({ where: { id } });
        break;
      case 'transactions':
        await prisma.stockTransaction.delete({ where: { id } });
        break;
      case 'products':
        await prisma.$transaction(async (tx) => {
          const orders = await tx.productionOrder.findMany({
            where: { productId: id },
            select: { id: true },
          });
          const orderIds = orders.map((o) => o.id);
          if (orderIds.length > 0) {
            await tx.requisitionItem.deleteMany({
              where: { orderId: { in: orderIds } },
            });
            await tx.productionOrder.deleteMany({
              where: { productId: id },
            });
          }
          await tx.recipeItem.deleteMany({
            where: { productId: id },
          });
          await tx.product.delete({
            where: { id },
          });
        });
        break;
      case 'recipes':
        await prisma.recipeItem.delete({ where: { id } });
        break;
      case 'orders':
        await prisma.$transaction(async (tx) => {
          await tx.requisitionItem.deleteMany({
            where: { orderId: id },
          });
          await tx.productionOrder.delete({
            where: { id },
          });
        });
        break;
      case 'sections':
        await prisma.section.delete({ where: { id } });
        break;
      case 'auditLogs':
        await prisma.auditLog.delete({ where: { id } });
        break;
      default:
        return NextResponse.json({ error: 'ไม่พบตารางที่ระบุ' }, { status: 400 });
    }

    // Automatically record an Audit Log entry for deletions (except when deleting an audit log itself)
    if (table !== 'auditLogs') {
      try {
        const anyOld = oldRecord as any;
        const itemIdentifier = anyOld?.code || anyOld?.name || anyOld?.lotNumber || anyOld?.orderNo || id;
        await prisma.auditLog.create({
          data: {
            tableName: table,
            recordId: id,
            action: 'DELETE',
            summary: `ลบข้อมูลในตาราง ${table} [${itemIdentifier}]`,
            oldData: oldRecord ? JSON.stringify(oldRecord) : null,
            newData: null,
            changedBy: 'ผู้ดูแลระบบ (DB Studio)',
          },
        });
      } catch (auditErr) {
        console.warn('Failed to write delete audit log:', auditErr);
      }
    }

    return NextResponse.json({ success: true, message: 'ลบรายการสำเร็จ' });
  } catch (error: any) {
    console.error('DB Studio DELETE error:', error);
    if (error.code === 'P2003' || error.message?.includes('Foreign key constraint')) {
      return NextResponse.json(
        { error: 'ไม่สามารถลบรายการนี้ได้ เนื่องจากมีข้อมูลอื่นในระบบอ้างอิงอยู่ กรุณาลบข้อมูลที่เกี่ยวข้องก่อน' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: error.message || 'เกิดข้อผิดพลาดในการลบข้อมูล' }, { status: 500 });
  }
}

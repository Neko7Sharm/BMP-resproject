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
      ] = await Promise.all([
        prisma.material.count(),
        prisma.materialLot.count(),
        prisma.stockTransaction.count(),
        prisma.product.count(),
        prisma.recipeItem.count(),
        prisma.productionOrder.count(),
        prisma.section.count(),
      ]);

      return NextResponse.json({
        materials: materialCount,
        lots: lotCount,
        transactions: txCount,
        products: productCount,
        recipes: recipeCount,
        orders: orderCount,
        sections: sectionCount,
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

      default:
        return NextResponse.json({ error: 'ตารางไม่ถูกต้อง' }, { status: 400 });
    }

    return NextResponse.json({ table, count: records.length, records });
  } catch (error: any) {
    console.error('DB Studio GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PUT: Update record in database
export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { table, id, data } = body;

    if (!table || !id || !data) {
      return NextResponse.json({ error: 'ข้อมูลไม่ครบถ้วน (table, id, data)' }, { status: 400 });
    }

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
        await prisma.product.delete({ where: { id } });
        break;
      case 'recipes':
        await prisma.recipeItem.delete({ where: { id } });
        break;
      case 'orders':
        await prisma.productionOrder.delete({ where: { id } });
        break;
      case 'sections':
        await prisma.section.delete({ where: { id } });
        break;
      default:
        return NextResponse.json({ error: 'ไม่พบตารางที่ระบุ' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'ลบรายการสำเร็จ' });
  } catch (error: any) {
    console.error('DB Studio DELETE error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeProductionRequisition } from '@/lib/stockService';

export async function GET() {
  try {
    const orders = await prisma.productionOrder.findMany({
      include: {
        product: true,
        requisitionItems: {
          include: {
            lot: {
              include: { material: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(orders);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, targetQuantity, orderNo, requestedBy, notes, autoDeduct, allocations, orderDate } = body;

    if (!productId || !targetQuantity || Number(targetQuantity) <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุสินค้าและจำนวนยอดผลิต' },
        { status: 400 }
      );
    }

    const generatedOrderNo = orderNo || `PRD-${Date.now().toString().slice(-6)}`;
    const effectiveDate = orderDate ? new Date(orderDate) : new Date();

    // 1. สร้างเอกสารคำสั่งผลิต ProductionOrder (รองรับวันที่ย้อนหลัง)
    const order = await prisma.productionOrder.create({
      data: {
        orderNo: generatedOrderNo,
        productId,
        targetQuantity: Number(targetQuantity),
        requestedBy: requestedBy || 'ฝ่ายวางแผนการผลิต',
        notes: notes || null,
        status: 'DRAFT',
        createdAt: effectiveDate,
      },
      include: { product: true },
    });

    // 2. หากผู้ใช้เลือกตัดสต็อกทันที (autoDeduct)
    if (autoDeduct && allocations && Array.isArray(allocations)) {
      const updatedOrder = await executeProductionRequisition(
        order.id,
        allocations,
        requestedBy || 'เจ้าหน้าที่เบิกจ่าย',
        effectiveDate
      );
      return NextResponse.json(updatedOrder, { status: 201 });
    }

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

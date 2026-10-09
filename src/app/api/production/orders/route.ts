import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeProductionRequisition } from '@/lib/stockService';
import { recordAuditLog } from '@/lib/auditLog';
import { getCurrentUser } from '@/lib/auth';

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
    const sessionUser = await getCurrentUser();
    const body = await request.json();
    const { productId, targetQuantity, orderNo, requestedBy, notes, autoDeduct, allocations, orderDate } = body;

    const requester = requestedBy?.trim() || sessionUser?.name || 'ฝ่ายวางแผนการผลิต';

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
        requestedBy: requester,
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
        requester,
        effectiveDate
      );

      // Write Audit Log (awaited)
      await recordAuditLog({
        tableName: 'ProductionOrder',
        recordId: order.id,
        action: 'CREATE',
        summary: `สร้างคำสั่งผลิต ${order.orderNo} สินค้า: ${order.product?.name || productId} จำนวน ${targetQuantity} (ตัดสต็อกแล้ว)`,
        newData: updatedOrder,
        changedBy: requester,
      });

      return NextResponse.json(updatedOrder, { status: 201 });
    }

    // Write Audit Log (awaited)
    await recordAuditLog({
      tableName: 'ProductionOrder',
      recordId: order.id,
      action: 'CREATE',
      summary: `สร้างคำสั่งผลิต ${order.orderNo} สินค้า: ${order.product?.name || productId} จำนวน ${targetQuantity} (ยังไม่ตัดสต็อก)`,
      newData: order,
      changedBy: requester,
    });

    return NextResponse.json(order, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

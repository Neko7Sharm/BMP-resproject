import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { recordAuditLog } from '@/lib/auditLog';

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { lotNumber, quantityRemaining, initialQuantity, expDate, mfgDate, costPerUnit } = body;

    const oldRecord = await prisma.materialLot.findUnique({
      where: { id: params.id },
      include: { material: true },
    });

    const data: any = {};
    if (lotNumber !== undefined) data.lotNumber = String(lotNumber).trim();
    if (quantityRemaining !== undefined) {
      const rem = Number(quantityRemaining);
      data.quantityRemaining = rem;
      data.status = rem === 0 ? 'EXHAUSTED' : 'ACTIVE';
    }
    if (initialQuantity !== undefined) data.initialQuantity = Number(initialQuantity);
    if (expDate !== undefined) data.expDate = expDate ? new Date(expDate) : null;
    if (mfgDate !== undefined) data.mfgDate = mfgDate ? new Date(mfgDate) : null;
    if (costPerUnit !== undefined) data.costPerUnit = Number(costPerUnit);

    const updatedLot = await prisma.materialLot.update({
      where: { id: params.id },
      data,
      include: { material: true },
    });

    // Write Audit Log (non-blocking)
    recordAuditLog({
      tableName: 'MaterialLot',
      recordId: params.id,
      action: 'UPDATE',
      summary: `แก้ไขล็อต: ${updatedLot.lotNumber} (${updatedLot.material?.name || ''}) คงเหลือ ${updatedLot.quantityRemaining}`,
      oldData: oldRecord,
      newData: updatedLot,
      changedBy: 'ผู้ใช้งานระบบ',
    }).catch(() => {});

    return NextResponse.json(updatedLot);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const lotId = params.id;

    const oldRecord = await prisma.materialLot.findUnique({
      where: { id: lotId },
      include: { material: true },
    });

    await prisma.$transaction(async (tx) => {
      // 1. Delete RequisitionItems linked to this lot
      await tx.requisitionItem.deleteMany({
        where: { materialLotId: lotId },
      });

      // 2. Delete StockTransactions linked to this lot
      await tx.stockTransaction.deleteMany({
        where: { lotId },
      });

      // 3. Delete the lot
      await tx.materialLot.delete({
        where: { id: lotId },
      });
    });

    // Write Audit Log (non-blocking)
    recordAuditLog({
      tableName: 'MaterialLot',
      recordId: lotId,
      action: 'DELETE',
      summary: `ลบล็อต: ${oldRecord?.lotNumber || lotId} (${oldRecord?.material?.name || ''}) คงเหลือ ${oldRecord?.quantityRemaining ?? 0}`,
      oldData: oldRecord,
      newData: null,
      changedBy: 'ผู้ใช้งานระบบ',
    }).catch(() => {});

    return NextResponse.json({ success: true, message: 'ลบล็อตนี้เรียบร้อยแล้ว' });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

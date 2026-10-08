import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      materialId,
      lotNumber,
      receiveDate,
      mfgDate,
      expDate,
      quantity,
      costPerUnit,
      documentRef,
      remarks,
      createdBy,
    } = body;

    if (!materialId || !lotNumber || !quantity || Number(quantity) <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุวัตถุดิบ เลขล็อต และจำนวนที่รับเข้าให้ถูกต้อง' },
        { status: 400 }
      );
    }

    const qty = Number(quantity);

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create or add to MaterialLot
      const lot = await tx.materialLot.create({
        data: {
          materialId,
          lotNumber: String(lotNumber).trim(),
          receiveDate: receiveDate ? new Date(receiveDate) : new Date(),
          mfgDate: mfgDate ? new Date(mfgDate) : null,
          expDate: expDate ? new Date(expDate) : null,
          initialQuantity: qty,
          quantityRemaining: qty,
          costPerUnit: costPerUnit ? Number(costPerUnit) : 0,
          status: 'ACTIVE',
        },
      });

      // 2. Create StockTransaction
      const transaction = await tx.stockTransaction.create({
        data: {
          materialId,
          lotId: lot.id,
          type: 'INBOUND',
          quantity: qty,
          lotBalanceAfter: qty,
          documentRef: documentRef || null,
          remarks: remarks || null,
          createdBy: createdBy || 'เจ้าหน้าที่รับของ',
          transactionDate: receiveDate ? new Date(receiveDate) : new Date(),
        },
      });

      return { lot, transaction };
    });

    // Write Audit Log (non-blocking)
    prisma.auditLog.create({
      data: {
        tableName: 'MaterialLot',
        recordId: result.lot.id,
        action: 'CREATE',
        summary: `รับวัตถุดิบเข้า: ล็อต ${result.lot.lotNumber} จำนวน ${qty} หน่วย (materialId: ${materialId})`,
        newData: JSON.stringify({ lot: result.lot, transaction: result.transaction }),
        changedBy: createdBy || 'เจ้าหน้าที่รับของ',
      },
    }).catch(() => {});

    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

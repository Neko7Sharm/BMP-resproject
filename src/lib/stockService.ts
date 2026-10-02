import prisma from './prisma';

export interface BOMAllocationItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  quantityRequiredPerUnit: number;
  totalRequired: number;
  currentStock: number;
  isShortage: boolean;
  shortageQuantity: number;
  suggestedLots: {
    lotId: string;
    lotNumber: string;
    expDate: Date | null;
    receiveDate: Date;
    quantityRemaining: number;
    allocatedQuantity: number;
  }[];
}

export interface ProductionCalculationResult {
  product: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  targetQuantity: number;
  canProduce: boolean;
  materials: BOMAllocationItem[];
}

/**
 * คำนวณความต้องการวัตถุดิบและจัดสรร Lot ตามหลัก FEFO (First Expired, First Out)
 */
export async function calculateProductionBOM(
  productId: string,
  targetQuantity: number
): Promise<ProductionCalculationResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      recipeItems: {
        include: {
          material: {
            include: {
              lots: {
                where: {
                  quantityRemaining: { gt: 0 },
                },
                orderBy: [
                  { expDate: 'asc' }, // FEFO: หมดอายุก่อน จ่ายก่อน
                  { receiveDate: 'asc' }, // FIFO fallback
                ],
              },
            },
          },
        },
      },
    },
  });

  if (!product) {
    throw new Error('ไม่พบข้อมูลสินค้าที่ระบุ');
  }

  let canProduce = true;
  const materials: BOMAllocationItem[] = [];

  for (const item of product.recipeItems) {
    const totalRequired = item.quantityRequired * targetQuantity;
    const currentStock = item.material.lots.reduce(
      (sum, lot) => sum + lot.quantityRemaining,
      0
    );

    const isShortage = currentStock < totalRequired;
    if (isShortage) {
      canProduce = false;
    }

    // จัดสรรตัด Lot ตามลำดับ FEFO
    let remainingToAllocate = totalRequired;
    const suggestedLots: BOMAllocationItem['suggestedLots'] = [];

    for (const lot of item.material.lots) {
      if (remainingToAllocate <= 0) break;

      const allocateFromThisLot = Math.min(lot.quantityRemaining, remainingToAllocate);
      suggestedLots.push({
        lotId: lot.id,
        lotNumber: lot.lotNumber,
        expDate: lot.expDate,
        receiveDate: lot.receiveDate,
        quantityRemaining: lot.quantityRemaining,
        allocatedQuantity: Number(allocateFromThisLot.toFixed(3)),
      });

      remainingToAllocate -= allocateFromThisLot;
    }

    materials.push({
      materialId: item.material.id,
      materialCode: item.material.code,
      materialName: item.material.name,
      unit: item.unit || item.material.baseUnit,
      quantityRequiredPerUnit: item.quantityRequired,
      totalRequired: Number(totalRequired.toFixed(3)),
      currentStock: Number(currentStock.toFixed(3)),
      isShortage,
      shortageQuantity: isShortage ? Number((totalRequired - currentStock).toFixed(3)) : 0,
      suggestedLots,
    });
  }

  return {
    product: {
      id: product.id,
      code: product.code,
      name: product.name,
      unit: product.unit,
    },
    targetQuantity,
    canProduce,
    materials,
  };
}

/**
 * ดำเนินการตัดสต็อกจริงตามคำสั่งผลิตแบบ Atomic Transaction
 */
export async function executeProductionRequisition(
  orderId: string,
  allocations: { lotId: string; quantity: number }[],
  issuerName: string = 'เจ้าหน้าที่คลัง'
) {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.productionOrder.findUnique({
      where: { id: orderId },
      include: { product: true },
    });

    if (!order) {
      throw new Error('ไม่พบข้อมูลคำสั่งผลิต');
    }

    if (order.status === 'ISSUED') {
      throw new Error('คำสั่งผลิตนี้ได้รับการตัดจ่ายสต็อกไปแล้ว');
    }

    for (const alloc of allocations) {
      if (alloc.quantity <= 0) continue;

      const lot = await tx.materialLot.findUnique({
        where: { id: alloc.lotId },
        include: { material: true },
      });

      if (!lot) {
        throw new Error(`ไม่พบล็อตวัตถุดิบ ID: ${alloc.lotId}`);
      }

      if (lot.quantityRemaining < alloc.quantity) {
        throw new Error(
          `ล็อต ${lot.lotNumber} มีจำนวนคงเหลือ ${lot.quantityRemaining} ไม่พอจ่าย ${alloc.quantity}`
        );
      }

      const newRemaining = Number((lot.quantityRemaining - alloc.quantity).toFixed(3));
      const status = newRemaining === 0 ? 'EXHAUSTED' : 'ACTIVE';

      // 1. อัปเดตยอดคงเหลือใน Lot
      await tx.materialLot.update({
        where: { id: lot.id },
        data: {
          quantityRemaining: newRemaining,
          status,
        },
      });

      // 2. บันทึกรายการเบิกในคำสั่งผลิต
      await tx.requisitionItem.create({
        data: {
          orderId: order.id,
          materialLotId: lot.id,
          quantityDeducted: alloc.quantity,
          deductionRule: 'FEFO',
        },
      });

      // 3. บันทึกประวัติความเคลื่อนไหวคลัง (StockTransaction)
      await tx.stockTransaction.create({
        data: {
          materialId: lot.materialId,
          lotId: lot.id,
          type: 'PRODUCTION_ISSUE',
          quantity: alloc.quantity,
          lotBalanceAfter: newRemaining,
          documentRef: order.orderNo,
          remarks: `เบิกเพื่อผลิต ${order.product.name} จำนวน ${order.targetQuantity} ${order.product.unit}`,
          createdBy: issuerName,
        },
      });
    }

    // อัปเดตสถานะใบเบิก/สั่งผลิต
    const updatedOrder = await tx.productionOrder.update({
      where: { id: order.id },
      data: {
        status: 'ISSUED',
        issuedAt: new Date(),
        requestedBy: issuerName,
      },
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
    });

    return updatedOrder;
  });
}

import prisma from './prisma';

export interface BOMAllocationItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  recipeUnit?: string;
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
 * แปลงหน่วยระหว่างหน่วยในสูตร (Recipe Unit) และหน่วยหลักของวัตถุดิบในคลัง (Base Unit)
 * รองรับ:
 * - ของแข็ง: kg (กิโลกรัม) <-> g (กรัม) [1 kg = 1000 g]
 * - ของเหลว: L (ลิตร) <-> ml (มิลลิลิตร) [1 L = 1000 ml]
 */
export function convertToMaterialBaseUnit(
  quantity: number,
  fromUnit: string = 'kg',
  baseUnit: string = 'kg'
): number {
  if (!quantity) return 0;
  const from = (fromUnit || '').toLowerCase().trim();
  const to = (baseUnit || '').toLowerCase().trim();

  if (from === to) return quantity;

  // Solid conversions: kg <-> g
  const isFromKg = from === 'kg' || from === 'กิโลกรัม' || from === 'กก.' || from === 'กก';
  const isFromG = from === 'g' || from === 'กรัม';
  const isBaseKg = to === 'kg' || to === 'กิโลกรัม' || to === 'กก.' || to === 'กก';
  const isBaseG = to === 'g' || to === 'กรัม';

  if (isFromG && isBaseKg) return quantity / 1000;
  if (isFromKg && isBaseG) return quantity * 1000;

  // Liquid conversions: L <-> ml
  const isFromL = from === 'l' || from === 'ลิตร';
  const isFromMl = from === 'ml' || from === 'มิลลิลิตร' || from === 'มล.' || from === 'มล';
  const isBaseL = to === 'l' || to === 'ลิตร';
  const isBaseMl = to === 'ml' || to === 'มิลลิลิตร' || to === 'มล.' || to === 'มล';

  if (isFromMl && isBaseL) return quantity / 1000;
  if (isFromL && isBaseMl) return quantity * 1000;

  return quantity;
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
    const baseUnit = item.material.baseUnit || 'kg';
    const recipeUnit = item.unit || baseUnit;

    // แปลงอัตราส่วนต่อ 1 หน่วยสินค้าให้อยู่ใน Base Unit ของคลัง
    const quantityRequiredPerUnitInBase = convertToMaterialBaseUnit(
      item.quantityRequired,
      recipeUnit,
      baseUnit
    );

    const totalRequired = Number((quantityRequiredPerUnitInBase * targetQuantity).toFixed(4));
    const currentStock = Number(
      item.material.lots.reduce((sum, lot) => sum + lot.quantityRemaining, 0).toFixed(4)
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
      unit: baseUnit,
      recipeUnit,
      quantityRequiredPerUnit: item.quantityRequired,
      totalRequired,
      currentStock,
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
  issuerName: string = 'เจ้าหน้าที่คลัง',
  issueDate?: Date
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

    const effectiveDate = issueDate || order.createdAt || new Date();

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
          createdAt: effectiveDate,
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
          transactionDate: effectiveDate,
          createdAt: effectiveDate,
        },
      });
    }

    // อัปเดตสถานะใบเบิก/สั่งผลิต
    const updatedOrder = await tx.productionOrder.update({
      where: { id: order.id },
      data: {
        status: 'ISSUED',
        issuedAt: effectiveDate,
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

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const now = new Date();
    const ninetyDaysLater = new Date();
    ninetyDaysLater.setDate(now.getDate() + 90);

    const [materials, productsCount, recentOrders] = await Promise.all([
      prisma.material.findMany({
        include: {
          lots: {
            select: {
              quantityRemaining: true,
              expDate: true,
              status: true,
            },
          },
          section: { select: { id: true, name: true, code: true } },
        },
      }),
      prisma.product.count(),
      prisma.productionOrder.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: { product: { select: { name: true, unit: true } } },
      }),
    ]);

    let totalLotsCount = 0;
    let expiringLotsCount = 0;
    let lowStockCount = 0;
    let totalStockValue = 0;

    // Build stock snapshot cards
    const stockSnapshot = materials.map((m) => {
      const totalStock = m.lots.reduce((acc, l) => acc + l.quantityRemaining, 0);
      const activeLots = m.lots.filter((l) => l.quantityRemaining > 0);
      const isLowStock = totalStock <= (m as any).minSafetyStock;

      totalLotsCount += m.lots.length;
      if (isLowStock) lowStockCount++;

      m.lots.forEach((lot) => {
        if (lot.expDate && new Date(lot.expDate) <= ninetyDaysLater && lot.quantityRemaining > 0) {
          expiringLotsCount++;
        }
      });

      return {
        id: m.id,
        code: m.code,
        name: m.name,
        baseUnit: (m as any).baseUnit,
        totalStock: Number(totalStock.toFixed(3)),
        activeLotCount: activeLots.length,
        totalLotCount: m.lots.length,
        isLowStock,
        minSafetyStock: (m as any).minSafetyStock,
        section: m.section,
      };
    });

    // Sort: in-stock first
    stockSnapshot.sort((a, b) => {
      if (a.totalStock > 0 && b.totalStock <= 0) return -1;
      if (a.totalStock <= 0 && b.totalStock > 0) return 1;
      return a.code.localeCompare(b.code);
    });

    return NextResponse.json({
      kpi: {
        totalMaterials: materials.length,
        totalLots: totalLotsCount,
        lowStockCount,
        expiringLotsCount,
        productsCount,
      },
      stockSnapshot: stockSnapshot.slice(0, 10), // top 10 for dashboard
      recentOrders,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

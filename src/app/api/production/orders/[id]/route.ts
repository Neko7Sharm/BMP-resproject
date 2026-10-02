import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeProductionRequisition } from '@/lib/stockService';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const order = await prisma.productionOrder.findUnique({
      where: { id: params.id },
      include: {
        product: {
          include: {
            recipeItems: {
              include: { material: true },
            },
          },
        },
        requisitionItems: {
          include: {
            lot: {
              include: { material: true },
            },
          },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: 'ไม่พบคำสั่งผลิต' }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { action, allocations, issuerName } = body;

    if (action === 'DEDUCT_STOCK') {
      const updated = await executeProductionRequisition(
        params.id,
        allocations,
        issuerName || 'เจ้าหน้าที่เบิกจ่าย'
      );
      return NextResponse.json(updated);
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

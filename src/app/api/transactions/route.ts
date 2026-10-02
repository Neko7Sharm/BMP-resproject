import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const materialId = searchParams.get('materialId');
    const type = searchParams.get('type');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '100'), 500);

    const where: any = {};
    if (materialId) where.materialId = materialId;
    if (type && type !== 'all') where.type = type;
    if (search) {
      where.OR = [
        { material: { name: { contains: search } } },
        { material: { code: { contains: search } } },
        { lot: { lotNumber: { contains: search } } },
        { documentRef: { contains: search } },
        { remarks: { contains: search } },
      ];
    }

    const transactions = await prisma.stockTransaction.findMany({
      where,
      include: {
        material: { select: { code: true, name: true, baseUnit: true } },
        lot: { select: { lotNumber: true, expDate: true } },
      },
      orderBy: { transactionDate: 'desc' },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const sections = await prisma.section.findMany({
      include: {
        _count: { select: { materials: true } },
        materials: {
          select: {
            lots: {
              where: { quantityRemaining: { gt: 0 } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { code: 'asc' },
    });

    // Compute activeLotsCount per section
    const enriched = sections.map((s) => ({
      id: s.id,
      code: s.code,
      name: s.name,
      description: s.description,
      materialCount: s._count.materials,
      activeLotsCount: s.materials.reduce((sum, m) => sum + m.lots.length, 0),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    }));

    return NextResponse.json(enriched);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, description } = body;

    const section = await prisma.section.create({
      data: {
        code,
        name,
        description,
      },
    });
    return NextResponse.json(section, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

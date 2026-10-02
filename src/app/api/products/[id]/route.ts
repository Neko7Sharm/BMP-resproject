import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const product = await prisma.product.findUnique({
      where: { id: params.id },
      include: {
        recipeItems: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: 'ไม่พบสูตรสินค้า' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { code, name, unit, description, recipeItems } = body;

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Delete old recipe items
      await tx.recipeItem.deleteMany({
        where: { productId: params.id },
      });

      // 2. Update product & recreate recipe items
      return await tx.product.update({
        where: { id: params.id },
        data: {
          code,
          name,
          unit: unit || 'ชิ้น',
          description,
          recipeItems: {
            create: (recipeItems || []).map((item: any) => ({
              materialId: item.materialId,
              quantityRequired: Number(item.quantityRequired),
              unit: item.unit || 'kg',
              notes: item.notes || null,
            })),
          },
        },
        include: {
          recipeItems: {
            include: { material: true },
          },
        },
      });
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    await prisma.product.delete({
      where: { id: params.id },
    });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

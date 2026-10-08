import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const products = await prisma.product.findMany({
      include: {
        recipeItems: {
          include: {
            material: true,
          },
        },
        outputSection: true,
      },
      orderBy: { code: 'asc' },
    });
    return NextResponse.json(products);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, name, unit, description, recipeItems, outputSectionId } = body;

    if (!code || !name) {
      return NextResponse.json({ error: 'กรุณากรอกรหัสและชื่อสินค้า' }, { status: 400 });
    }

    const product = await prisma.product.create({
      data: {
        code,
        name,
        unit: unit || 'ชิ้น',
        description,
        outputSectionId: outputSectionId || null,
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
        outputSection: true,
      },
    });

    // Write Audit Log (non-blocking)
    prisma.auditLog.create({
      data: {
        tableName: 'Product',
        recordId: product.id,
        action: 'CREATE',
        summary: `สร้างสูตรสินค้าใหม่: ${product.code} - ${product.name} (สูตรผลิต ${(recipeItems || []).length} รายการ)`,
        newData: JSON.stringify(product),
        changedBy: 'ผู้ใช้งานระบบ',
      },
    }).catch(() => {});

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

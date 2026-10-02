import { NextResponse } from 'next/server';
import { calculateProductionBOM } from '@/lib/stockService';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { productId, targetQuantity } = body;

    if (!productId || !targetQuantity || Number(targetQuantity) <= 0) {
      return NextResponse.json(
        { error: 'กรุณาระบุสินค้าและจำนวนยอดที่ต้องการผลิตให้ถูกต้อง' },
        { status: 400 }
      );
    }

    const result = await calculateProductionBOM(productId, Number(targetQuantity));
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

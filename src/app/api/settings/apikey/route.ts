import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  SHARED_KEY_SETTING,
  getSystemKeys,
  getSharedKey,
  maskKey,
  validateGeminiKey,
} from '@/lib/geminiKeys';
import { recordAuditLog } from '@/lib/auditLog';

export const dynamic = 'force-dynamic';

// GET: สถานะ key (ไม่คืนค่า key เต็ม)
export async function GET() {
  const systemKeys = getSystemKeys();
  const shared = await getSharedKey();
  return NextResponse.json({
    hasApiKey: systemKeys.length > 0 || !!shared,
    systemKeyAvailable: systemKeys.length > 0,
    sharedKeyAvailable: !!shared,
    preview: shared ? maskKey(shared) : null,
  });
}

// POST: ตรวจสอบแล้วบันทึก key กลางลง DB (ใช้ร่วมกันทุกคน)
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== 'string' || !apiKey.trim()) {
      return NextResponse.json({ error: 'กรุณาระบุ API Key' }, { status: 400 });
    }
    const key = apiKey.trim();

    const check = await validateGeminiKey(key);
    if (!check.valid) {
      return NextResponse.json({ error: check.reason || 'API Key ไม่ถูกต้อง' }, { status: 400 });
    }

    await prisma.appSetting.upsert({
      where: { key: SHARED_KEY_SETTING },
      update: { value: key },
      create: { key: SHARED_KEY_SETTING, value: key },
    });

    // Write Audit Log (awaited)
    await recordAuditLog({
      tableName: 'AppSetting',
      recordId: SHARED_KEY_SETTING,
      action: 'UPDATE',
      summary: `อัปเดต Gemini API Key กลาง (${maskKey(key)})`,
      newData: { key: SHARED_KEY_SETTING, maskedKey: maskKey(key) },
      changedBy: 'ผู้ใช้งานระบบ',
    });

    return NextResponse.json({
      success: true,
      message: 'บันทึก API Key กลางเรียบร้อยแล้ว ทุกคนที่ใช้ระบบจะใช้ key นี้สแกนได้ทันที',
      preview: maskKey(key),
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// DELETE: ลบ key กลางออกจาก DB
export async function DELETE() {
  try {
    await prisma.appSetting.deleteMany({ where: { key: SHARED_KEY_SETTING } });

    // Write Audit Log (awaited)
    await recordAuditLog({
      tableName: 'AppSetting',
      recordId: SHARED_KEY_SETTING,
      action: 'DELETE',
      summary: `ลบ Gemini API Key กลางออกจากระบบ`,
      oldData: { key: SHARED_KEY_SETTING },
      newData: null,
      changedBy: 'ผู้ใช้งานระบบ',
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

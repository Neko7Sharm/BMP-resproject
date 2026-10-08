import prisma from './prisma';

export const SHARED_KEY_SETTING = 'GEMINI_SHARED_API_KEY';

export interface GeminiKeyEntry {
  key: string;
  source: 'system' | 'shared';
}

/** key ของระบบจาก Environment Variables (GEMINI_API_KEY, GEMINI_API_KEY_2 .. _10) */
export function getSystemKeys(): string[] {
  const keys: string[] = [];
  const primary = process.env.GEMINI_API_KEY;
  if (primary && primary.trim() !== '') keys.push(primary.trim());
  for (let i = 2; i <= 10; i++) {
    const extra = process.env[`GEMINI_API_KEY_${i}`];
    if (extra && extra.trim() !== '') keys.push(extra.trim());
  }
  return keys;
}

/** key กลางที่ผู้ใช้ใส่เก็บไว้ใน DB (ใช้ร่วมกันทุกคน) */
export async function getSharedKey(): Promise<string | null> {
  try {
    const row = await prisma.appSetting.findUnique({ where: { key: SHARED_KEY_SETTING } });
    const v = row?.value?.trim();
    return v ? v : null;
  } catch {
    return null;
  }
}

/** ลำดับการใช้งาน: key ระบบ (env) ก่อน แล้วค่อย key กลางใน DB */
export async function getAllKeys(): Promise<GeminiKeyEntry[]> {
  const entries: GeminiKeyEntry[] = getSystemKeys().map((key) => ({ key, source: 'system' as const }));
  const shared = await getSharedKey();
  if (shared && !entries.some((e) => e.key === shared)) {
    entries.push({ key: shared, source: 'shared' });
  }
  return entries;
}

export function maskKey(key: string): string {
  return key.length > 10 ? `${key.slice(0, 6)}...${key.slice(-4)}` : '****';
}

/** ตรวจว่า key ใช้งานได้จริงไหม (เรียก list models แบบเบา ๆ) */
export async function validateGeminiKey(key: string): Promise<{ valid: boolean; reason?: string }> {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?pageSize=1&key=${encodeURIComponent(key)}`
    );
    if (res.ok) return { valid: true };
    if (res.status === 400 || res.status === 401 || res.status === 403) {
      return { valid: false, reason: 'API Key ไม่ถูกต้องหรือไม่มีสิทธิ์ใช้งาน' };
    }
    // 429/5xx = key น่าจะถูก แต่ Google ขัดข้อง/โควตาชั่วคราว → ให้บันทึกได้
    return { valid: true };
  } catch {
    // เชื่อมต่อ Google ไม่ได้ชั่วคราว → ไม่บล็อกการบันทึก
    return { valid: true };
  }
}

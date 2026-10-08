import prisma from './prisma';

export interface AuditLogOptions {
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | string;
  summary: string;
  oldData?: any;
  newData?: any;
  changedBy?: string;
  /**
   * If true/number, merge with an existing audit log entry from the same place
   * (tableName + recordId + action + changedBy) created within this window (default 10,000ms = 10s).
   */
  coalesceWindowMs?: number;
}

function safeJSON(val: any): string | null {
  if (val === undefined || val === null) return null;
  if (typeof val === 'string') return val;
  try {
    return JSON.stringify(val);
  } catch {
    try {
      return JSON.stringify(val, (_, v) => (typeof v === 'bigint' ? v.toString() : v));
    } catch {
      return String(val);
    }
  }
}

/**
 * บันทึกประวัติการเปลี่ยนแปลงข้อมูลลงในตาราง AuditLog
 * หากมาจากที่เดียวกันและเวลาใกล้เคียงกัน (ภายใน coalesceWindowMs) จะรวมเป็นรายการเดียวอัตโนมัติ
 */
export async function recordAuditLog(options: AuditLogOptions) {
  try {
    const {
      tableName,
      recordId,
      action,
      summary,
      oldData,
      newData,
      changedBy = 'ผู้ใช้งานระบบ',
      coalesceWindowMs = 10000,
    } = options;

    const oldDataStr = safeJSON(oldData);
    const newDataStr = safeJSON(newData);

    // หากเปิด coalesceWindowMs สำหรับ UPDATE: รวมเข้ากับรายการล่าสุดที่ยังอยู่ในช่วงเวลา
    if (coalesceWindowMs > 0 && action === 'UPDATE') {
      const windowStart = new Date(Date.now() - coalesceWindowMs);
      const recentLog = await prisma.auditLog.findFirst({
        where: {
          tableName,
          recordId: String(recordId),
          action,
          changedBy,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: 'desc' },
      });

      if (recentLog) {
        // รวมรายการ (Coalesce): อัปเดต summary และ newData ล่าสุด พร้อมอัปเดต createdAt ให้ขึ้นแถวบนสุด
        let mergedSummary = recentLog.summary || '';
        if (summary && !mergedSummary.includes(summary)) {
          mergedSummary = `${mergedSummary} | ${summary}`;
        }

        return await prisma.auditLog.update({
          where: { id: recentLog.id },
          data: {
            summary: mergedSummary.slice(0, 500),
            newData: newDataStr || recentLog.newData,
            oldData: recentLog.oldData || oldDataStr,
            createdAt: new Date(),
          },
        });
      }
    }

    // สร้าง AuditLog รายการใหม่
    return await prisma.auditLog.create({
      data: {
        tableName,
        recordId: String(recordId),
        action,
        summary: summary ? summary.slice(0, 500) : null,
        oldData: oldDataStr,
        newData: newDataStr,
        changedBy,
      },
    });
  } catch (error) {
    console.error('Failed to record audit log:', error);
    return null;
  }
}

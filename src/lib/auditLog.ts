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

    const oldDataStr = oldData !== undefined && oldData !== null
      ? (typeof oldData === 'string' ? oldData : JSON.stringify(oldData))
      : null;

    const newDataStr = newData !== undefined && newData !== null
      ? (typeof newData === 'string' ? newData : JSON.stringify(newData))
      : null;

    // หากเปิด coalesceWindowMs และไม่ใช่การ DELETE ให้ตรวจสอบรายการล่าสุดที่ตรงกัน
    if (coalesceWindowMs > 0 && action !== 'DELETE') {
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
        // รวมรายการ (Coalesce): รวม summary และอัปเดต newData ล่าสุด
        let mergedSummary = recentLog.summary || '';
        if (summary && !mergedSummary.includes(summary)) {
          mergedSummary = `${mergedSummary} | ${summary}`;
        }

        return await prisma.auditLog.update({
          where: { id: recentLog.id },
          data: {
            summary: mergedSummary.slice(0, 500),
            newData: newDataStr || recentLog.newData,
            // คงค่า oldData ดั้งเดิมก่อนการแก้ไขชุดนี้ไว้
            oldData: recentLog.oldData || oldDataStr,
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
    console.warn('Failed to record audit log:', error);
    return null;
  }
}

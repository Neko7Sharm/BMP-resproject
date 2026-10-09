export type UserRole = 'ADMIN' | 'STORE' | 'PROD' | 'VIEWER';

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: UserRole;
}

export const COOKIE_NAME = 'session_token';

export const ROLE_CONFIG: Record<
  UserRole,
  { label: string; shortLabel: string; badgeClass: string; desc: string; icon: string }
> = {
  ADMIN: {
    label: 'ผู้ดูแลระบบ',
    shortLabel: 'แอดมิน',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    desc: 'เข้าถึงได้ทุกระบบ จัดการบัญชีผู้ใช้และฐานข้อมูล',
    icon: '👑',
  },
  STORE: {
    label: 'เจ้าหน้าที่คลัง',
    shortLabel: 'คลัง',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    desc: 'รับวัตถุดิบเข้า สแกน Stock Card จัดการล็อตและโซน',
    icon: '📦',
  },
  PROD: {
    label: 'ฝ่ายผลิต/วางแผน',
    shortLabel: 'ผลิต',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    desc: 'จัดการสูตร BOM สั่งผลิต และตัดเบิกวัตถุดิบ',
    icon: '🏭',
  },
  VIEWER: {
    label: 'ผู้บริหาร/ตรวจสอบ',
    shortLabel: 'ดูข้อมูล',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
    desc: 'ดูแดชบอร์ด รายงานสต็อก และประวัติ (อ่านอย่างเดียว)',
    icon: '👁️',
  },
};

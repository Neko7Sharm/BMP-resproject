import type { Metadata } from 'next';
import './globals.css';
import AppShell from '@/components/AppShell';

export const metadata: Metadata = {
  title: 'KMP Raw Material & MRP Resource Management',
  description: 'ระบบบริหารจัดการทรัพยากรวัตถุดิบ บันทึกรับเข้า-จ่ายออก สแกนสต็อกการ์ด และคำนวณเบิกผลิตอัตโนมัติ',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}

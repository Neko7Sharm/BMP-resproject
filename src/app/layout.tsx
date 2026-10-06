import type { Metadata } from 'next';
import './globals.css';
import Navbar from '@/components/Navbar';

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
      <body className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
        <Navbar />
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500 no-print">
          KMP Raw Materials Management System • SQLite & Prisma ORM Connected
        </footer>
      </body>
    </html>
  );
}

'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { ScanProvider } from '@/context/ScanContext';
import { AuthProvider } from '@/context/AuthContext';
import ScanMiniWidget from '@/components/ScanMiniWidget';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isDbStudio = pathname === '/db-studio';
  const isLoginPage = pathname === '/login';

  return (
    <AuthProvider>
      <ScanProvider>
        <div
          className={`min-h-screen flex flex-col transition-colors duration-200 ${
            isLoginPage
              ? 'bg-slate-100'
              : isDbStudio
              ? 'bg-slate-950 text-slate-100'
              : 'bg-slate-50 text-slate-900'
          }`}
        >
          {!isLoginPage && <Navbar />}
          <main
            className={`flex-1 w-full mx-auto ${
              isLoginPage
                ? 'p-0 flex items-center justify-center'
                : isDbStudio
                ? 'max-w-[1600px] p-4 sm:p-6 lg:p-8 pb-24 md:pb-8'
                : 'max-w-7xl p-4 sm:p-6 lg:p-8 pb-24 md:pb-8'
            }`}
          >
            {children}
          </main>
          {!isLoginPage && (
            <footer
              className={`py-4 text-center text-xs no-print transition-colors duration-200 ${
                isDbStudio
                  ? 'bg-slate-950 border-t border-slate-900 text-slate-500'
                  : 'bg-white border-t border-slate-200 text-slate-500'
              }`}
            >
              KMP Raw Materials Management System • PostgreSQL & Prisma ORM Connected
            </footer>
          )}
          {!isLoginPage && <ScanMiniWidget />}
        </div>
      </ScanProvider>
    </AuthProvider>
  );
}

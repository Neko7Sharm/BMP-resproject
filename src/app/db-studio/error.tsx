'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { Database, AlertTriangle, RefreshCw, Home } from 'lucide-react';

export default function DBStudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('DB Studio Error Boundary caught:', error);
  }, [error]);

  return (
    <div className="max-w-xl mx-auto my-12 p-8 bg-white border border-rose-200 rounded-3xl shadow-xl text-center space-y-5">
      <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-inner">
        <AlertTriangle className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-xl font-bold text-slate-900">
          เกิดข้อผิดพลาดในการโหลด DB Studio
        </h2>
        <p className="text-xs text-slate-500 leading-relaxed max-w-md mx-auto">
          ระบบพบข้อผิดพลาดชั่วคราวขณะแสดงผลข้อมูลในฐานข้อมูล คุณสามารถลองโหลดใหม่อีกครั้ง หรือกลับไปยังหน้าหลัก
        </p>
      </div>

      {error?.message && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-left">
          <p className="text-[11px] font-mono text-rose-700 break-words">
            {error.message}
          </p>
        </div>
      )}

      <div className="flex items-center justify-center gap-3 pt-2">
        <button
          onClick={() => reset()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition shadow-md shadow-blue-200"
        >
          <RefreshCw className="w-4 h-4" />
          <span>ลองใหม่อีกครั้ง</span>
        </button>

        <Link
          href="/"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
        >
          <Home className="w-4 h-4" />
          <span>กลับหน้าหลัก</span>
        </Link>
      </div>
    </div>
  );
}

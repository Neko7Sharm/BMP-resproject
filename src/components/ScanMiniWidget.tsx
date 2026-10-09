'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScan } from '@/context/ScanContext';
import { ScanLine, Loader2, CheckCircle2, ArrowRight, X } from 'lucide-react';

export default function ScanMiniWidget() {
  const pathname = usePathname();
  const { isAnalyzing, analyzeProgress, analyzeStepText, scanResult, resetScan } = useScan();

  // ไม่แสดง Widget ถ้าผู้ใช้อยู่ที่หน้า /scan อยู่แล้ว (เพราะหน้า /scan มี UI ตัวเต็มแสดงอยู่แล้ว)
  if (pathname === '/scan') return null;

  // ไม่แสดง Widget ถ้าไม่ได้กำลังสแกน และไม่มีผลลัพธ์ค้างอยู่
  if (!isAnalyzing && !scanResult) return null;

  return (
    <div className="fixed bottom-20 md:bottom-5 right-4 sm:right-5 z-50 max-w-sm w-[92vw] sm:w-84 bg-white/95 backdrop-blur-md border border-indigo-200 rounded-2xl shadow-2xl p-3.5 transition-all duration-300 animate-in fade-in slide-in-from-bottom-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
            isAnalyzing ? 'bg-indigo-100 text-indigo-600' : 'bg-emerald-100 text-emerald-600'
          }`}>
            {isAnalyzing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4" />
            )}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-800 truncate">
              {isAnalyzing ? 'กำลังสแกนในพื้นหลัง...' : 'สแกนสำเร็จแล้ว!'}
            </h4>
            <p className="text-[10px] text-slate-500 truncate">
              {isAnalyzing ? `${analyzeProgress}% • ${analyzeStepText}` : `พบ ${scanResult?.rows?.length || 0} รายการในตาราง`}
            </p>
          </div>
        </div>

        <button
          onClick={resetScan}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition shrink-0"
          title="ปิดการแจ้งเตือน"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Progress Bar (แสดงตอนกำลังสแกน) */}
      {isAnalyzing && (
        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden mb-2.5">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-300 rounded-full"
            style={{ width: `${analyzeProgress}%` }}
          />
        </div>
      )}

      {/* Action Button */}
      <Link
        href="/scan"
        className={`w-full py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition ${
          isAnalyzing
            ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200'
            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm shadow-emerald-200'
        }`}
      >
        <ScanLine className="w-3.5 h-3.5" />
        <span>{isAnalyzing ? 'เปิดดูหน้าจอการสแกน' : 'ดูผลลัพธ์และบันทึกลงคลัง'}</span>
        <ArrowRight className="w-3.5 h-3.5 ml-auto" />
      </Link>
    </div>
  );
}

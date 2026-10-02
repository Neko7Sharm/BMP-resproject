'use client';

import { Printer, ArrowLeft, FileDown, Info } from 'lucide-react';
import Link from 'next/link';

export default function PrintControls({ orderNo }: { orderNo: string }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="pb-6 mb-6 border-b border-slate-200 no-print space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <Link
          href="/production"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับไปหน้าคำนวณการผลิต</span>
        </Link>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 hover:bg-blue-700 transition"
          >
            <FileDown className="w-4 h-4" />
            <span>📄 บันทึกเป็น PDF / พิมพ์เอกสาร</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
        <Info className="w-4 h-4 text-blue-600 shrink-0" />
        <span>
          <strong>วิธีบันทึกเป็นไฟล์ PDF:</strong> เมื่อหน้าต่างพิมพ์ปรากฏขึ้น ให้เลือกช่อง <em>Destination (เครื่องพิมพ์)</em> เป็น <strong>"Save as PDF" (บันทึกเป็น PDF)</strong> แล้วกดบันทึก
        </span>
      </div>
    </div>
  );
}

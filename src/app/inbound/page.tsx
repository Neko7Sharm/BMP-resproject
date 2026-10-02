'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  ArrowDownToLine, 
  Package, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  FileText,
  ScanLine
} from 'lucide-react';

interface Material {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
}

function InboundForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedMaterialId = searchParams.get('materialId') || '';

  const [materials, setMaterials] = useState<Material[]>([]);
  const [materialId, setMaterialId] = useState(preselectedMaterialId);
  const [lotNumber, setLotNumber] = useState('');
  const [receiveDate, setReceiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');
  const [quantity, setQuantity] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [documentRef, setDocumentRef] = useState('');
  const [remarks, setRemarks] = useState('');
  const [createdBy, setCreatedBy] = useState('เจ้าหน้าที่ตรวจรับ');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/materials')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setMaterials(data);
          if (!materialId && data.length > 0) {
            setMaterialId(data[0].id);
          }
        }
      });
  }, []);

  const selectedMaterial = materials.find((m) => m.id === materialId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!materialId || !lotNumber || !quantity || Number(quantity) <= 0) {
      setErrorMsg('กรุณากรอกข้อมูลวัตถุดิบ เลขล็อต และจำนวนให้ครบถ้วน');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setSuccessInfo(null);

    try {
      const res = await fetch('/api/inbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          materialId,
          lotNumber,
          receiveDate,
          mfgDate: mfgDate || null,
          expDate: expDate || null,
          quantity: parseFloat(quantity),
          costPerUnit: costPerUnit ? parseFloat(costPerUnit) : 0,
          documentRef,
          remarks,
          createdBy,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'บันทึกรับเข้าไม่สำเร็จ');
      }

      setSuccessInfo(data);
      // Reset form fields
      setLotNumber('');
      setQuantity('');
      setCostPerUnit('');
      setRemarks('');
      setDocumentRef('');
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-5 pb-20 md:pb-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ArrowDownToLine className="w-5 h-5 text-blue-600" />
            บันทึกรับเข้าวัตถุดิบ (Inbound Receipt)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            สร้างล็อตใหม่ บันทึกวันผลิต วันหมดอายุ และยอดรับเข้าสู่คลังสินค้า
          </p>
        </div>

        <Link
          href="/scan"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-lg text-xs font-semibold border border-purple-200"
        >
          <ScanLine className="w-3.5 h-3.5" />
          <span>มีภาพ Stock Card หรือไม่?</span>
        </Link>
      </div>

      {successInfo && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <div>
              <p className="text-sm font-bold text-emerald-900">บันทึกรับเข้าเรียบร้อยแล้ว!</p>
              <p className="text-xs text-emerald-700">
                ล็อต <strong>{successInfo.lot.lotNumber}</strong> จำนวน {successInfo.lot.initialQuantity} เพิ่มเข้าสู่คลังสำเร็จ
              </p>
            </div>
          </div>
          <Link
            href="/inventory"
            className="text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-lg"
          >
            ดูสต็อกคงเหลือ
          </Link>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-bold text-slate-700">
                เลือกวัตถุดิบ *
              </label>
              {selectedMaterial && (
                <span className="text-[11px] text-blue-600 font-semibold bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                  หน่วยนับ: {selectedMaterial.baseUnit}
                </span>
              )}
            </div>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  [{m.code}] {m.name} (หน่วย: {m.baseUnit})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เลขล็อต / แบทช์ (Lot / Batch No.) *
            </label>
            <input
              type="text"
              required
              placeholder="เช่น 100726, 080826 หรือ BATCH-2026-01"
              value={lotNumber}
              onChange={(e) => setLotNumber(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              จำนวนรับเข้า ({selectedMaterial?.baseUnit || 'หน่วย'}) *
            </label>
            <input
              type="number"
              step="any"
              required
              placeholder="เช่น 1879"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              วันที่รับเข้า (Receive Date) *
            </label>
            <input
              type="date"
              required
              value={receiveDate}
              onChange={(e) => setReceiveDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              วันหมดอายุ (Expiration Date - EXP)
            </label>
            <input
              type="date"
              value={expDate}
              onChange={(e) => setExpDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              วันผลิต (Manufacturing Date - MFG)
            </label>
            <input
              type="date"
              value={mfgDate}
              onChange={(e) => setMfgDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ราคาต้นทุนต่อหน่วย (บาท)
            </label>
            <input
              type="number"
              step="any"
              placeholder="0.00"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เลขที่เอกสารอ้างอิง / ใบการ์ด (Ref / Card No.)
            </label>
            <input
              type="text"
              placeholder="เช่น 006/26 หรือ PO-2026-081"
              value={documentRef}
              onChange={(e) => setDocumentRef(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              ชื่อผู้ตรวจรับ (Receiver)
            </label>
            <input
              type="text"
              value={createdBy}
              onChange={(e) => setCreatedBy(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              หมายเหตุเพิ่มเติม
            </label>
            <input
              type="text"
              placeholder="เช่น ตรวจรับครบถ้วน บรรจุในถัง 200 ลิตร"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
          <Link
            href="/inventory"
            className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            ยกเลิก
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-200 transition disabled:opacity-50"
          >
            {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกรับเข้าคลังสินค้า'}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function InboundPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">กำลังโหลด...</div>}>
      <InboundForm />
    </Suspense>
  );
}

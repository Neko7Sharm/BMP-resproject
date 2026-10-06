'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  Calculator, 
  Package, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ArrowRight,
  Printer,
  Sparkles,
  Layers,
  FileDown,
  Edit3,
  RefreshCw,
  Info,
  Check,
  Calendar,
  History,
  CalendarPlus,
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import ProductionHistoryView from '@/components/ProductionHistoryView';

interface SuggestedLot {
  lotId: string;
  lotNumber: string;
  expDate: string | null;
  receiveDate: string;
  quantityRemaining: number;
  allocatedQuantity: number;
}

interface BOMItem {
  materialId: string;
  materialCode: string;
  materialName: string;
  unit: string;
  recipeUnit?: string;
  quantityRequiredPerUnit: number;
  totalRequired: number;
  currentStock: number;
  isShortage: boolean;
  shortageQuantity: number;
  suggestedLots: SuggestedLot[];
}

interface CalcResult {
  product: {
    id: string;
    code: string;
    name: string;
    unit: string;
  };
  targetQuantity: number;
  canProduce: boolean;
  materials: BOMItem[];
}

function ProductionContent() {
  const searchParams = useSearchParams();
  const initialProductId = searchParams.get('productId') || '';
  const initialTab = searchParams.get('tab') === 'history' ? 'history' : 'calc';
  const initialCreateBackdate = searchParams.get('createBackdate') === 'true';

  const [activeTab, setActiveTab] = useState<'calc' | 'history'>(initialTab);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);

  const [products, setProducts] = useState<any[]>([]);
  const [selectedProductId, setSelectedProductId] = useState(initialProductId);
  const [targetQuantity, setTargetQuantity] = useState('1000');
  const [orderNo, setOrderNo] = useState(`PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  const [requestedBy, setRequestedBy] = useState('ฝ่ายวางแผนและควบคุมการผลิต');
  const [notes, setNotes] = useState('');

  const [isCalculating, setIsCalculating] = useState(false);
  const [calculationResult, setCalculationResult] = useState<CalcResult | null>(null);
  const [allocations, setAllocations] = useState<Record<string, number>>({});

  const [isDeducting, setIsDeducting] = useState(false);
  const [orderResult, setOrderResult] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/products')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setProducts(data);
          if (!selectedProductId && data.length > 0) {
            setSelectedProductId(data[0].id);
          }
        }
      });
  }, []);

  async function handleCalculate() {
    if (!selectedProductId || !targetQuantity || Number(targetQuantity) <= 0) {
      alert('กรุณาเลือกสินค้าและกรอกยอดที่ต้องการผลิต');
      return;
    }

    setIsCalculating(true);
    setErrorMsg(null);
    setOrderResult(null);

    try {
      const res = await fetch('/api/production/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          targetQuantity: parseFloat(targetQuantity),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'คำนวณไม่สำเร็จ');
      }

      setCalculationResult(data);

      // Initialize allocations map from suggested FEFO lots
      const initialAllocs: Record<string, number> = {};
      data.materials.forEach((mat: BOMItem) => {
        mat.suggestedLots.forEach((lot) => {
          initialAllocs[lot.lotId] = lot.allocatedQuantity;
        });
      });
      setAllocations(initialAllocs);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsCalculating(false);
    }
  }

  function handleAllocationChange(lotId: string, value: number) {
    setAllocations((prev) => ({ ...prev, [lotId]: Math.max(0, value) }));
  }

  // Quick allocation buttons per lot
  function setFullLot(lot: SuggestedLot) {
    handleAllocationChange(lot.lotId, lot.quantityRemaining);
  }

  function resetLot(lot: SuggestedLot) {
    handleAllocationChange(lot.lotId, lot.allocatedQuantity);
  }

  function zeroLot(lot: SuggestedLot) {
    handleAllocationChange(lot.lotId, 0);
  }

  async function handleExecuteDeduction() {
    if (!calculationResult) return;

    if (!confirm('ยืนยันการตัดสต็อกวัตถุดิบจริงตามยอดและล็อตที่ระบุใช่หรือไม่?')) {
      return;
    }

    setIsDeducting(true);
    setErrorMsg(null);

    try {
      const flatAllocations = Object.entries(allocations).map(([lotId, quantity]) => ({
        lotId,
        quantity: Number(quantity),
      }));

      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          targetQuantity: parseFloat(targetQuantity),
          orderNo,
          requestedBy,
          notes,
          autoDeduct: true,
          allocations: flatAllocations,
          orderDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'ดำเนินการตัดสต็อกไม่สำเร็จ');
      }

      setOrderResult(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsDeducting(false);
    }
  }

  const resetForm = () => {
    setOrderResult(null);
    setCalculationResult(null);
    setAllocations({});
    setOrderNo(`PRD-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
  };

  return (
    <div className="space-y-6 pb-20 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Calculator className="w-5 h-5 text-indigo-600" />
            คำนวณเบิกผลิต & จัดสรรตัดสต็อก FEFO
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            ระบุยอดสินค้าที่ต้องการผลิต → ระบบวิเคราะห์วัตถุดิบและแนะนำล็อตหมดอายุก่อน → ปรับแต่งก่อนเบิกจ่าย → ออกใบเบิก PDF (A4 2 แผ่น)
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-200/70 rounded-xl">
          <button
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'calc'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>⚡ คำนวณเบิกผลิต</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition ${
              activeTab === 'history'
                ? 'bg-white text-indigo-700 shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="w-4 h-4" />
            <span>📋 ประวัติ & ทำใบเบิกย้อนหลัง</span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <ProductionHistoryView products={products} initialCreateOpen={initialCreateBackdate} />
      ) : (
        <div className="space-y-6">

      {/* Success Notification with PDF Button */}
      {orderResult && (
        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200 rounded-2xl shadow-sm space-y-4">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="flex-1">
              <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-200/80 text-emerald-800 mb-1">
                ตัดสต็อกและบันทึกข้อมูลเรียบร้อย
              </span>
              <h3 className="text-base font-extrabold text-emerald-950">
                สร้างเอกสารใบเบิกและหักลดยอดในสต็อกสำเร็จ!
              </h3>
              <p className="text-xs text-emerald-800 mt-0.5">
                เลขที่ใบเบิก: <strong className="font-mono text-emerald-950">{orderResult.orderNo}</strong> •{' '}
                สินค้า: <strong className="text-emerald-950">{orderResult.product.name}</strong> ({orderResult.targetQuantity} {orderResult.product.unit})
              </p>
              <p className="text-xs text-emerald-700 mt-0.5">
                ฐานข้อมูล SQLite ได้ตัดสต็อกรายล็อตและบันทึกประวัติการเบิกเรียบร้อยแล้ว
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap pt-2 border-t border-emerald-200/70">
            <Link
              href={`/production/${orderResult.id}/print`}
              target="_blank"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition"
            >
              <FileDown className="w-4 h-4" />
              <span>📄 เปิดดูใบเบิกพัสดุ & บันทึกเป็น PDF</span>
            </Link>

            <Link
              href="/inventory"
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <Package className="w-3.5 h-3.5 text-blue-600" />
              <span>ดูสต็อกคงเหลือในคลัง</span>
            </Link>

            <button
              onClick={resetForm}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold shadow-2xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-purple-600" />
              <span>สั่งเบิกรายการใหม่</span>
            </button>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 1. Input Panel: Choose Product & Target Quantity */}
      <div className="bg-white p-5 sm:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[11px] font-bold">1</span>
            กำหนดสินค้าและปริมาณที่ต้องการผลิต
          </h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              เลือกสินค้าสำเร็จรูป (สูตร BOM) *
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-semibold text-slate-900 bg-white"
            >
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  [{p.code}] {p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              จำนวนยอดผลิตที่ต้องการ *
            </label>
            <input
              type="number"
              step="any"
              required
              value={targetQuantity}
              onChange={(e) => setTargetQuantity(e.target.value)}
              placeholder="เช่น 1000"
              className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <div className="sm:col-span-2 lg:col-span-1 flex items-end">
            <button
              onClick={handleCalculate}
              disabled={isCalculating}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
            >
              <Calculator className="w-4 h-4" />
              <span>{isCalculating ? 'กำลังคำนวณสูตร...' : 'คำนวณการใช้วัตถุดิบ & จัดสรร Lot'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Calculation Results & Customization before issue */}
      {calculationResult && (
        <div className="space-y-5">
          {/* Status Header */}
          <div
            className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
              calculationResult.canProduce
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <div className="flex items-center gap-3">
              {calculationResult.canProduce ? (
                <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
              )}
              <div>
                <h4 className="text-sm sm:text-base font-bold">
                  {calculationResult.canProduce
                    ? 'วัตถุดิบในคลังเพียงพอสำหรับการผลิต'
                    : 'วัตถุดิบในคลังไม่เพียงพอ (มีรายการขาดสต็อก)'}
                </h4>
                <p className="text-xs opacity-80 mt-0.5">
                  สูตรสินค้า: <strong>{calculationResult.product.name}</strong> • ยอดผลิต:{' '}
                  <strong>{calculationResult.targetQuantity.toLocaleString()}</strong>{' '}
                  {calculationResult.product.unit}
                </p>
              </div>
            </div>

            <span
              className={`self-start sm:self-center px-3 py-1 rounded-full text-xs font-bold ${
                calculationResult.canProduce
                  ? 'bg-emerald-200 text-emerald-900'
                  : 'bg-rose-200 text-rose-900'
              }`}
            >
              {calculationResult.canProduce ? 'พร้อมตัดสต็อก' : 'สต็อกขาด'}
            </span>
          </div>

          {/* ── Summary of Materials Used Table ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-[11px] font-bold">2</span>
                สรุปวัตถุดิบที่ใช้ในการเบิก & สต็อกที่มีอยู่จริง
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ตรวจสอบยอดคงคลังที่มีอยู่ ยอดที่ต้องใช้ตามสูตร และยอดตัดจริงที่คุณสามารถปรับแต่งได้
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-100/70 text-slate-600 uppercase border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3.5">วัตถุดิบที่ใช้</th>
                    <th className="py-2.5 px-3 text-right">ใช้ต่อชิ้น</th>
                    <th className="py-2.5 px-3 text-right">สต็อกในคลัง</th>
                    <th className="py-2.5 px-3 text-right">ต้องใช้ตามสูตร</th>
                    <th className="py-2.5 px-3 text-right">ยอดที่เลือกตัดจริง</th>
                    <th className="py-2.5 px-3 text-right">คงเหลือหลังตัด</th>
                    <th className="py-2.5 px-3 text-center">สถานะ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {calculationResult.materials.map((mat) => {
                    const currentAllocated = mat.suggestedLots.reduce(
                      (sum, l) => sum + (Number(allocations[l.lotId]) || 0),
                      0
                    );
                    const remainingAfter = mat.currentStock - currentAllocated;
                    const isAllocatedMatch = Math.abs(currentAllocated - mat.totalRequired) < 0.001;

                    return (
                      <tr key={mat.materialId} className="hover:bg-slate-50/80 transition">
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900 text-xs">{mat.materialName}</div>
                          <div className="text-[10px] text-slate-400 font-mono">{mat.materialCode}</div>
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-600">
                          {mat.quantityRequiredPerUnit} {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-slate-900">
                          {mat.currentStock.toLocaleString()} {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-bold text-indigo-700">
                          {mat.totalRequired.toLocaleString()} {mat.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-bold">
                          <span className={isAllocatedMatch ? 'text-emerald-700' : 'text-amber-600 font-extrabold'}>
                            {currentAllocated.toLocaleString()} {mat.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-medium">
                          <span className={remainingAfter < 0 ? 'text-rose-600 font-bold' : 'text-slate-700'}>
                            {remainingAfter.toLocaleString()} {mat.unit}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {mat.isShortage ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                              ขาด {mat.shortageQuantity} {mat.unit}
                            </span>
                          ) : isAllocatedMatch ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              พอดีตามสูตร
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                              ปรับแต่งเอง ({currentAllocated}/{mat.totalRequired})
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── 3. Edit & Customize Details before issuance ── */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-5 p-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[11px] font-bold">3</span>
                  อยากแก้ไขอะไรเพิ่มเติมก่อนเบิกมั้ย? (ปรับแก้รายละเอียดใบเบิก & รายล็อต)
                </h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  คุณสามารถแก้ไขเลขที่เอกสาร ผู้ขอเบิก หมายเหตุ และปรับยอดตัดจากล็อตต่างๆ ได้อย่างอิสระ
                </p>
              </div>
            </div>

            {/* Editable Requisition Header Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 p-4 bg-purple-50/40 rounded-xl border border-purple-100">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-purple-600" />
                  วันที่เบิกผลิต (วันที่เอกสาร)
                </label>
                <input
                  type="date"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-semibold bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-purple-600" />
                  เลขที่ใบเบิก / เลขคำสั่งผลิต
                </label>
                <input
                  type="text"
                  value={orderNo}
                  onChange={(e) => setOrderNo(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs font-mono font-bold text-purple-900 bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-purple-600" />
                  ผู้ขอเบิก / แผนก
                </label>
                <input
                  type="text"
                  value={requestedBy}
                  onChange={(e) => setRequestedBy(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                  <Edit3 className="w-3 h-3 text-purple-600" />
                  หมายเหตุ / แบทช์การผลิต
                </label>
                <input
                  type="text"
                  placeholder="เช่น สั่งผลิตล็อตประจำวัน"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                />
              </div>
            </div>

            {/* Per-Lot Allocation Adjustments */}
            <div className="space-y-4">
              <h5 className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                ปรับแต่งยอดตัดรายล็อต (จัดสรรตาม FEFO หรือปรับแก้เอง):
              </h5>

              {calculationResult.materials.map((mat) => (
                <div key={mat.materialId} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">{mat.materialName}</span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                        {mat.materialCode}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600">
                      ต้องใช้: <strong className="text-indigo-700">{mat.totalRequired} {mat.unit}</strong> •{' '}
                      ตัดจริง: <strong className="text-emerald-700 font-bold">{mat.suggestedLots.reduce((s, l) => s + (Number(allocations[l.lotId]) || 0), 0)} {mat.unit}</strong>
                    </div>
                  </div>

                  {mat.suggestedLots.length === 0 ? (
                    <div className="p-3 bg-rose-50 text-rose-700 rounded-lg text-xs">
                      ⚠️ ไม่มีล็อตที่มีของพร้อมใช้ในคลัง
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {mat.suggestedLots.map((lot) => {
                        const currentAlloc = allocations[lot.lotId] ?? lot.allocatedQuantity;
                        const expFormatted = lot.expDate
                          ? formatDate(lot.expDate)
                          : 'ไม่ระบุ';

                        return (
                          <div
                            key={lot.lotId}
                            className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-mono font-bold text-blue-700 text-xs">
                                Lot: {lot.lotNumber}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                มีอยู่ {lot.quantityRemaining} {mat.unit}
                              </span>
                            </div>

                            <div className="text-[11px] text-slate-500 flex items-center justify-between">
                              <span>วันหมดอายุ (EXP):</span>
                              <span className="font-semibold text-amber-700">{expFormatted}</span>
                            </div>

                            {/* Allocation Input with Quick Buttons */}
                            <div className="pt-2 border-t border-slate-100 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-semibold text-slate-700">ตัดจำนวน:</span>
                                <div className="flex items-center gap-1">
                                  <input
                                    type="number"
                                    step="any"
                                    min="0"
                                    max={lot.quantityRemaining}
                                    value={currentAlloc}
                                    onChange={(e) =>
                                      handleAllocationChange(lot.lotId, parseFloat(e.target.value) || 0)
                                    }
                                    className="w-24 px-2 py-1 text-right font-bold text-indigo-700 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                                  />
                                  <span className="text-[11px] text-slate-400">{mat.unit}</span>
                                </div>
                              </div>

                              {/* Quick Adjustment Shortcuts */}
                              <div className="flex items-center gap-1 justify-end pt-1">
                                <button
                                  type="button"
                                  onClick={() => setFullLot(lot)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-800 transition"
                                  title="ตัดเต็มจำนวนคงเหลือของล็อตนี้"
                                >
                                  ตัดหมดล็อต
                                </button>
                                <button
                                  type="button"
                                  onClick={() => resetLot(lot)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-600 transition"
                                  title="รีเซ็ตกลับเป็นค่าที่ระบบ FEFO แนะนำ"
                                >
                                  ค่าแนะนำ
                                </button>
                                <button
                                  type="button"
                                  onClick={() => zeroLot(lot)}
                                  className="px-2 py-0.5 rounded text-[10px] bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700 transition"
                                  title="ไม่ตัดจากล็อตนี้"
                                >
                                  0
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* ── 4. Final Confirmation & Execute ── */}
            <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  ยืนยันการเบิกและหักลดยอดสต็อกในคลัง
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  เมื่อกดยืนยัน ระบบจะหักลดยอดในสต็อก SQLite ทันที และสร้างใบเบิกที่สามารถบันทึกเป็น PDF ได้
                </p>
              </div>

              <button
                onClick={handleExecuteDeduction}
                disabled={isDeducting || !calculationResult.canProduce}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md shadow-emerald-200 transition disabled:opacity-50"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>{isDeducting ? 'กำลังตัดสต็อก...' : '⚡ ยืนยันการตัดสต็อก & ออกใบเบิก (PDF)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      )}
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div className="p-12 text-center text-slate-500">กำลังโหลด...</div>}>
      <ProductionContent />
    </Suspense>
  );
}

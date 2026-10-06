'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  History,
  Calendar,
  Search,
  Plus,
  Printer,
  FileText,
  CheckCircle2,
  Clock,
  Package,
  AlertCircle,
  Loader2,
  ArrowRight,
  Filter,
  X,
  Layers,
  Sparkles,
  CalendarPlus,
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  recipeItems?: any[];
}

interface RequisitionItem {
  id: string;
  quantityDeducted: number;
  lot: {
    lotNumber: string;
    expDate: string | null;
    material: {
      name: string;
      code: string;
      baseUnit: string;
    };
  };
}

interface ProductionOrder {
  id: string;
  orderNo: string;
  productId: string;
  product: Product;
  targetQuantity: number;
  status: string;
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string;
  issuedAt: string | null;
  requisitionItems: RequisitionItem[];
}

export default function ProductionHistoryView({
  products,
  initialCreateOpen = false,
}: {
  products: Product[];
  initialCreateOpen?: boolean;
}) {
  const [orders, setOrders] = useState<ProductionOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ISSUED' | 'DRAFT'>('ALL');

  // Backdate modal state
  const [isModalOpen, setIsModalOpen] = useState(initialCreateOpen);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form states for backdated order
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [backdate, setBackdate] = useState(todayStr);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || '');
  const [targetQuantity, setTargetQuantity] = useState('100');
  const [orderNo, setOrderNo] = useState('');
  const [lotNo, setLotNo] = useState('');
  const [requestedBy, setRequestedBy] = useState('ฝ่ายวางแผนการผลิต');
  const [notes, setNotes] = useState('');
  const [deductStock, setDeductStock] = useState(true);

  // Auto-generate orderNo and lotNo when backdate or product changes
  useEffect(() => {
    if (products.length > 0 && !selectedProductId) {
      setSelectedProductId(products[0].id);
    }
  }, [products, selectedProductId]);

  useEffect(() => {
    if (!backdate) return;
    const cleanDate = backdate.replace(/-/g, '');
    const randSuffix = Math.floor(100 + Math.random() * 900);
    setOrderNo(`PRD-${cleanDate}-${randSuffix}`);

    const prod = products.find((p) => p.id === selectedProductId);
    const prefix = prod ? prod.code.slice(0, 4).toUpperCase() : 'LOT';
    const yr = (new Date(backdate).getFullYear() + 543).toString().slice(-2);
    const mo = String(new Date(backdate).getMonth() + 1).padStart(2, '0');
    setLotNo(`${prefix}-${yr}${mo}/1`);
  }, [backdate, selectedProductId, products]);

  // Load orders
  const loadOrders = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/production/orders');
      if (res.ok) {
        const data = await res.json();
        setOrders(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error('Failed to load orders', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, []);

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        o.orderNo.toLowerCase().includes(q) ||
        o.product?.name.toLowerCase().includes(q) ||
        o.product?.code.toLowerCase().includes(q) ||
        (o.notes && o.notes.toLowerCase().includes(q));

      const matchStatus =
        statusFilter === 'ALL' ||
        (statusFilter === 'ISSUED' && o.status === 'ISSUED') ||
        (statusFilter === 'DRAFT' && o.status !== 'ISSUED');

      return matchSearch && matchStatus;
    });
  }, [orders, searchQuery, statusFilter]);

  // Handle submit backdated order
  const handleCreateBackdatedOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId || !targetQuantity || Number(targetQuantity) <= 0) {
      setModalError('กรุณาเลือกสินค้าและกรอกยอดที่ต้องการผลิตให้ถูกต้อง');
      return;
    }

    setIsSubmitting(true);
    setModalError(null);

    try {
      let flatAllocs: { lotId: string; quantity: number }[] = [];

      // If user wants to deduct stock according to FEFO
      if (deductStock) {
        const calcRes = await fetch('/api/production/calculate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: selectedProductId,
            targetQuantity: parseFloat(targetQuantity),
          }),
        });

        const calcData = await calcRes.json();
        if (!calcRes.ok) {
          throw new Error(calcData.error || 'ไม่สามารถคำนวณการจัดสรรสต็อกได้');
        }

        // Gather allocations
        if (calcData.materials) {
          calcData.materials.forEach((m: any) => {
            if (m.suggestedLots) {
              m.suggestedLots.forEach((l: any) => {
                if (l.allocatedQuantity > 0) {
                  flatAllocs.push({
                    lotId: l.lotId,
                    quantity: l.allocatedQuantity,
                  });
                }
              });
            }
          });
        }
      }

      // Format notes to include lot number if provided
      const fullNotes = lotNo ? `LOT: ${lotNo} ${notes ? `| ${notes}` : ''}`.trim() : notes;

      // Submit new backdated production order
      const res = await fetch('/api/production/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          targetQuantity: parseFloat(targetQuantity),
          orderNo: orderNo || `PRD-${Date.now().toString().slice(-6)}`,
          requestedBy: requestedBy || 'ฝ่ายวางแผนการผลิต',
          notes: fullNotes,
          autoDeduct: deductStock,
          allocations: flatAllocs,
          orderDate: backdate, // Retroactive date
        }),
      });

      const orderData = await res.json();
      if (!res.ok) {
        throw new Error(orderData.error || 'บันทึกใบเบิกไม่สำเร็จ');
      }

      // Success
      setIsModalOpen(false);
      await loadOrders();

      // Open print page directly
      window.open(`/production/${orderData.id}/print`, '_blank');
    } catch (err: any) {
      setModalError(err.message || 'เกิดข้อผิดพลาดในการสร้างใบเบิก');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Banner & Action */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <span>ประวัติใบเบิกผลิต & พิมพ์ใบเบิกย้อนหลัง</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            เรียกดูใบเบิกผลิตทั้งหมดในระบบ พิมพ์เอกสารมาตรฐาน A4 2 แผ่น (FR 3-1 & FR 1-4) หรือออกใบเบิกย้อนหลัง
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition"
        >
          <CalendarPlus className="w-4 h-4" />
          <span>➕ ทำใบเบิกผลิตย้อนหลัง</span>
        </button>
      </div>

      {/* Stats Counter */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-500">ใบเบิกทั้งหมด</div>
            <div className="text-lg font-extrabold text-slate-900">{orders.length} รายการ</div>
          </div>
          <FileText className="w-7 h-7 text-slate-300" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-emerald-600">ตัดสต็อกแล้ว (ISSUED)</div>
            <div className="text-lg font-extrabold text-emerald-950">
              {orders.filter((o) => o.status === 'ISSUED').length} รายการ
            </div>
          </div>
          <CheckCircle2 className="w-7 h-7 text-emerald-400" />
        </div>

        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-amber-600">ฉบับร่าง (DRAFT)</div>
            <div className="text-lg font-extrabold text-amber-950">
              {orders.filter((o) => o.status !== 'ISSUED').length} รายการ
            </div>
          </div>
          <Clock className="w-7 h-7 text-amber-400" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาเลขที่ใบเบิก, ชื่อสินค้า, เลขล็อต..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto">
          <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> กรอง:
          </span>
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'ALL'
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
          <button
            onClick={() => setStatusFilter('ISSUED')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'ISSUED'
                ? 'bg-emerald-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ตัดสต็อกแล้ว
          </button>
          <button
            onClick={() => setStatusFilter('DRAFT')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition ${
              statusFilter === 'DRAFT'
                ? 'bg-amber-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ฉบับร่าง
          </button>
        </div>
      </div>

      {/* Table of Orders */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
            <span className="text-xs">กำลังโหลดประวัติใบเบิกผลิต...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <h3 className="text-sm font-semibold text-slate-700">ไม่พบรายการใบเบิกผลิต</h3>
            <p className="text-xs text-slate-400 mt-1">ยังไม่มีคำสั่งผลิตหรือไม่มีรายการที่ตรงกับคำค้นหา</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase border-b border-slate-200 text-[10px] font-bold">
                <tr>
                  <th className="py-3 px-4">วันที่เอกสาร</th>
                  <th className="py-3 px-3">เลขที่ใบเบิก</th>
                  <th className="py-3 px-4">สินค้าที่จะผลิต</th>
                  <th className="py-3 px-3 text-right">ยอดผลิต</th>
                  <th className="py-3 px-3 text-center">รายการเบิก</th>
                  <th className="py-3 px-3 text-center">สถานะ</th>
                  <th className="py-3 px-4 text-center">พิมพ์ใบเบิก (A4 x 2 แผ่น)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((order) => {
                  const isIssued = order.status === 'ISSUED';
                  const dateStr = formatDate(order.createdAt);
                  return (
                    <tr key={order.id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-medium text-slate-700 whitespace-nowrap">
                        {dateStr}
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-blue-900 whitespace-nowrap">
                        {order.orderNo}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{order.product?.name || '-'}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          รหัส: {order.product?.code || '-'}
                          {order.notes && ` • ${order.notes}`}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                        <span>{order.targetQuantity.toLocaleString()}</span>
                        <span className="text-slate-400 font-normal ml-1">
                          {order.product?.unit || 'หน่วย'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-full font-mono text-[11px]">
                          {order.requisitionItems?.length || 0} รายการ
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                            isIssued
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isIssued ? 'ตัดสต็อกแล้ว' : 'ฉบับร่าง'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <Link
                          href={`/production/${order.id}/print`}
                          target="_blank"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-xs shadow-sm transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>พิมพ์ใบเบิก (FR 3-1 & FR 1-4)</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL: ทำใบเบิกผลิตย้อนหลัง                                               */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 px-5 border-b border-slate-100 bg-slate-50/70">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                  <CalendarPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">ทำใบเบิกผลิตย้อนหลัง</h3>
                  <p className="text-[11px] text-slate-500">สร้างใบเบิกตามวันที่ในอดีต พร้อมออกฟอร์ม A4 2 แผ่น</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateBackdatedOrder} className="p-5 space-y-4 text-xs">
              {modalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>{modalError}</span>
                </div>
              )}

              {/* 1. Backdate Date Picker */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 space-y-1.5">
                <label className="block font-bold text-indigo-950 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    วันที่เบิกผลิตย้อนหลัง (วันที่เอกสาร) *
                  </span>
                  <span className="font-mono text-indigo-700 font-bold bg-white px-2 py-0.5 rounded border border-indigo-200">
                    {formatDate(backdate)}
                  </span>
                </label>
                <input
                  type="date"
                  required
                  value={backdate}
                  onChange={(e) => setBackdate(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-indigo-200 rounded-lg text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* 2. Product and Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    สินค้าที่จะผลิต *
                  </label>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        [{p.code}] {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    จำนวนยอดผลิต *
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    value={targetQuantity}
                    onChange={(e) => setTargetQuantity(e.target.value)}
                    placeholder="เช่น 100"
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-bold outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 3. OrderNo and LotNo */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    เลขที่ใบเบิก
                  </label>
                  <input
                    type="text"
                    value={orderNo}
                    onChange={(e) => setOrderNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-blue-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    รุ่นการผลิต (Lot No.)
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น BT-6910/3"
                    value={lotNo}
                    onChange={(e) => setLotNo(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs font-mono font-bold text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 4. Requester & Notes */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    ผู้ขอเบิก
                  </label>
                  <input
                    type="text"
                    value={requestedBy}
                    onChange={(e) => setRequestedBy(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    หมายเหตุ
                  </label>
                  <input
                    type="text"
                    placeholder="เช่น เบิกย้อนหลังตามรอบผลิตจริง"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* 5. Deduct Stock Option */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={deductStock}
                    onChange={(e) => setDeductStock(e.target.checked)}
                    className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                  />
                  <span>ตัดสต็อก FEFO ทันทีและลงประวัติความเคลื่อนไหวคลังย้อนหลัง</span>
                </label>
                <p className="text-[11px] text-slate-500 pl-6 leading-relaxed">
                  {deductStock
                    ? 'ระบบจะคำนวณหักยอดวัตถุดิบล็อตที่เก่าที่สุด (FEFO) และบันทึกประวัติการเบิก ณ วันที่ย้อนหลังนี้'
                    : 'ระบบจะสร้างเฉพาะเอกสารใบเบิกฉบับร่าง เหมาะสำหรับพิมพ์ใบเบิกย้อนหลังโดยไม่ตัดสต็อกในคลังซ้ำซ้อน'}
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  ยกเลิก
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>กำลังประมวลผล...</span>
                    </>
                  ) : (
                    <>
                      <Printer className="w-3.5 h-3.5" />
                      <span>สร้างใบเบิก & เปิดหน้าพิมพ์ (A4 x 2 แผ่น)</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

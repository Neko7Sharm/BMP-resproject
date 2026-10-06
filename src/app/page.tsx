'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Package,
  AlertTriangle,
  Clock,
  FlaskConical,
  ScanLine,
  Calculator,
  ArrowRight,
  CheckCircle2,
  ArrowDownToLine,
  TrendingDown,
  Loader2,
  Bell,
} from 'lucide-react';

interface KPI {
  totalMaterials: number;
  totalLots: number;
  lowStockCount: number;
  expiringLotsCount: number;
  productsCount: number;
}

interface StockCard {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
  totalStock: number;
  activeLotCount: number;
  totalLotCount: number;
  isLowStock: boolean;
  minSafetyStock: number;
  section: { id: string; name: string; code: string } | null;
}

interface RecentOrder {
  id: string;
  orderNo: string;
  targetQuantity: number;
  status: string;
  createdAt: string;
  product: { name: string; unit: string };
}

export default function DashboardPage() {
  const [kpi, setKpi] = useState<KPI | null>(null);
  const [stockSnapshot, setStockSnapshot] = useState<StockCard[]>([]);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/stats')
      .then((r) => r.json())
      .then((data) => {
        if (data.kpi) {
          setKpi(data.kpi);
          setStockSnapshot(data.stockSnapshot || []);
          setRecentOrders(data.recentOrders || []);
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

  const hasAlert = kpi && (kpi.lowStockCount > 0 || kpi.expiringLotsCount > 0);

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-900 rounded-2xl p-5 sm:p-7 text-white shadow-lg relative overflow-hidden">
        <div className="relative z-10 max-w-2xl">
          <span className="inline-block px-2.5 py-0.5 bg-white/20 rounded-full text-[11px] font-semibold uppercase tracking-wider mb-2">
            KMP MRP System
          </span>
          <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight leading-snug">
            ระบบจัดการทรัพยากรวัตถุดิบ
          </h1>
          <p className="mt-1.5 text-blue-100 text-xs sm:text-sm leading-relaxed">
            ติดตามสต็อกแยกล็อต • วันหมดอายุ (EXP) • คำนวณเบิกผลิต FEFO • นำเข้าจาก Stock Card ด้วย AI
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/scan"
              className="inline-flex items-center gap-1.5 bg-white text-blue-800 hover:bg-blue-50 px-3.5 py-2 rounded-xl font-semibold text-sm shadow transition"
            >
              <ScanLine className="w-4 h-4 text-purple-600" />
              AI สแกน Stock Card
            </Link>
            <Link
              href="/production"
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white border border-blue-400 px-3.5 py-2 rounded-xl font-semibold text-sm transition"
            >
              <Calculator className="w-4 h-4" />
              คำนวณเบิกผลิต
            </Link>
          </div>
        </div>
        <div className="absolute right-0 bottom-0 opacity-10 translate-x-8 translate-y-8 pointer-events-none">
          <Package className="w-64 h-64 text-white" />
        </div>
      </div>

      {/* Alert Banner */}
      {hasAlert && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <Bell className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-amber-900">ต้องดำเนินการ</p>
            <p className="text-xs text-amber-700 mt-0.5">
              {kpi!.lowStockCount > 0 && (
                <span>วัตถุดิบต่ำกว่าจุดสั่งซื้อ <strong>{kpi!.lowStockCount} รายการ</strong></span>
              )}
              {kpi!.lowStockCount > 0 && kpi!.expiringLotsCount > 0 && ' • '}
              {kpi!.expiringLotsCount > 0 && (
                <span>ล็อตใกล้หมดอายุ (&lt;90 วัน) <strong>{kpi!.expiringLotsCount} ล็อต</strong></span>
              )}
            </p>
          </div>
          <Link
            href="/inventory"
            className="shrink-0 text-xs font-bold text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition"
          >
            ดูรายละเอียด →
          </Link>
        </div>
      )}

      {/* KPI Cards */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm animate-pulse">
              <div className="h-3 bg-slate-200 rounded w-24 mb-3" />
              <div className="h-7 bg-slate-200 rounded w-16 mb-1.5" />
              <div className="h-2.5 bg-slate-100 rounded w-20" />
            </div>
          ))}
        </div>
      ) : kpi ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Materials */}
          <Link href="/inventory" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:border-blue-300 hover:shadow-md transition">
            <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">วัตถุดิบ</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.totalMaterials}</p>
              <p className="text-[11px] text-slate-400">{kpi.totalLots} ล็อตในระบบ</p>
            </div>
          </Link>

          {/* Expiring */}
          <Link
            href="/inventory"
            className={`group bg-white p-5 rounded-xl border shadow-sm flex items-center gap-3 hover:shadow-md transition ${
              kpi.expiringLotsCount > 0
                ? 'border-amber-200 hover:border-amber-300'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
              kpi.expiringLotsCount > 0 ? 'bg-amber-50 text-amber-600 group-hover:bg-amber-100' : 'bg-slate-50 text-slate-400'
            }`}>
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">ใกล้หมดอายุ</p>
              <p className={`text-2xl font-bold ${kpi.expiringLotsCount > 0 ? 'text-amber-600' : 'text-slate-900'}`}>
                {kpi.expiringLotsCount}
              </p>
              <p className="text-[11px] text-slate-400">ล็อต (&lt;90 วัน)</p>
            </div>
          </Link>

          {/* Low Stock */}
          <Link
            href="/inventory"
            className={`group bg-white p-5 rounded-xl border shadow-sm flex items-center gap-3 hover:shadow-md transition ${
              kpi.lowStockCount > 0
                ? 'border-rose-200 hover:border-rose-300'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 transition ${
              kpi.lowStockCount > 0 ? 'bg-rose-50 text-rose-600 group-hover:bg-rose-100' : 'bg-slate-50 text-slate-400'
            }`}>
              <AlertTriangle className={`w-5 h-5 ${kpi.lowStockCount > 0 ? 'animate-pulse' : ''}`} />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">สต็อกต่ำ</p>
              <p className={`text-2xl font-bold ${kpi.lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                {kpi.lowStockCount}
              </p>
              <p className="text-[11px] text-slate-400">ต่ำกว่า Safety Stock</p>
            </div>
          </Link>

          {/* Products */}
          <Link href="/recipes" className="group bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-3 hover:border-emerald-300 hover:shadow-md transition">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:bg-emerald-100 transition">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">สูตร (BOM)</p>
              <p className="text-2xl font-bold text-slate-900">{kpi.productsCount}</p>
              <p className="text-[11px] text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> พร้อมคำนวณ
              </p>
            </div>
          </Link>
        </div>
      ) : null}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Stock Snapshot */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">สต็อกวัตถุดิบล่าสุด</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">เรียงจากมีของมากที่สุด (top 10)</p>
            </div>
            <Link href="/inventory" className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1">
              ดูทั้งหมด <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
              กำลังโหลด...
            </div>
          ) : stockSnapshot.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">ยังไม่มีข้อมูลวัตถุดิบ</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {stockSnapshot.map((m) => {
                const pct = m.minSafetyStock > 0
                  ? Math.min(100, Math.round((m.totalStock / (m.minSafetyStock * 3)) * 100))
                  : m.totalStock > 0 ? 100 : 0;

                return (
                  <div key={m.id} className="px-4 py-3 flex items-center gap-3 hover:bg-slate-50/70 transition">
                    {/* Status dot */}
                    <div className={`w-2 h-2 rounded-full shrink-0 ${
                      m.totalStock <= 0 ? 'bg-slate-300' :
                      m.isLowStock ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'
                    }`} />

                    {/* Name + code */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-900 truncate">{m.name}</span>
                        <span className="font-mono text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                          {m.code}
                        </span>
                        {m.section && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">
                            {m.section.name}
                          </span>
                        )}
                      </div>
                      {/* Mini stock bar */}
                      <div className="mt-1.5 flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              m.totalStock <= 0 ? 'bg-slate-300' :
                              m.isLowStock ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-slate-400 shrink-0">{m.activeLotCount} ล็อต</span>
                      </div>
                    </div>

                    {/* Quantity */}
                    <div className="text-right shrink-0">
                      <span className="text-sm font-bold text-slate-900">
                        {m.totalStock.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-400 ml-1">{m.baseUnit}</span>
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {m.totalStock <= 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">หมด</span>
                      ) : m.isLowStock ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700">ต่ำ ⚠</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700">ปกติ</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Quick Actions + Recent Orders */}
        <div className="space-y-4">
          {/* Quick Actions */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">เมนูลัด</h3>
            <div className="space-y-2">
              <Link href="/scan" className="flex items-center justify-between p-3 rounded-xl border border-purple-200 bg-purple-50/50 hover:bg-purple-100/60 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center shrink-0">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-purple-900">AI สแกน Stock Card</div>
                    <div className="text-[11px] text-purple-600">ตรวจสอบก่อนบันทึก</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-purple-400 group-hover:translate-x-1 transition" />
              </Link>

              <Link href="/inbound" className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center shrink-0">
                    <ArrowDownToLine className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">บันทึกรับเข้า</div>
                    <div className="text-[11px] text-slate-500">สร้าง Lot ใหม่</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </Link>

              <Link href="/production" className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:bg-slate-50 transition group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Calculator className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-slate-900">เบิกผลิต (FEFO)</div>
                    <div className="text-[11px] text-slate-500">คำนวณ + ตัดสต็อก</div>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
              </Link>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900">ใบเบิกล่าสุด</h3>
              <Link href="/transactions" className="text-[11px] font-semibold text-blue-600 hover:text-blue-800">
                ดูประวัติ →
              </Link>
            </div>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-100 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <p className="text-xs text-slate-400 py-3 text-center">ยังไม่มีประวัติการเบิกผลิต</p>
            ) : (
              <div className="space-y-2">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-2.5 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold text-slate-800 truncate">{order.orderNo}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {order.product.name} · {order.targetQuantity} {order.product.unit}
                      </div>
                    </div>
                    <span className={`shrink-0 text-[10px] px-2 py-0.5 rounded-full font-semibold ${
                      order.status === 'ISSUED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {order.status === 'ISSUED' ? 'ตัดแล้ว' : 'ร่าง'}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

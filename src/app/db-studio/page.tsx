'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import {
  Database,
  Search,
  RefreshCw,
  Edit2,
  Trash2,
  Download,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Package,
  History,
  FlaskConical,
  Calculator,
  MapPin,
  X,
  Save,
  HelpCircle,
  ExternalLink,
  ChevronRight,
  ShieldAlert,
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

type TableKey = 'materials' | 'lots' | 'transactions' | 'products' | 'recipes' | 'orders' | 'sections';

interface TableMeta {
  key: TableKey;
  label: string;
  subLabel: string;
  icon: any;
  color: string;
}

const TABLES: TableMeta[] = [
  { key: 'materials', label: 'วัตถุดิบ', subLabel: 'Materials', icon: Package, color: 'text-blue-600 bg-blue-50' },
  { key: 'lots', label: 'ล็อตวัตถุดิบ & วันหมดอายุ', subLabel: 'Material Lots', icon: Layers, color: 'text-emerald-600 bg-emerald-50' },
  { key: 'transactions', label: 'ประวัติรับ-จ่าย สต็อก', subLabel: 'Stock Transactions', icon: History, color: 'text-amber-600 bg-amber-50' },
  { key: 'products', label: 'สินค้าที่ผลิต', subLabel: 'Products', icon: Package, color: 'text-purple-600 bg-purple-50' },
  { key: 'recipes', label: 'สูตรการผลิต (BOM)', subLabel: 'Recipes', icon: FlaskConical, color: 'text-pink-600 bg-pink-50' },
  { key: 'orders', label: 'คำสั่งผลิต & ใบเบิก', subLabel: 'Production Orders', icon: Calculator, color: 'text-indigo-600 bg-indigo-50' },
  { key: 'sections', label: 'โซนคลังสินค้า', subLabel: 'Sections', icon: MapPin, color: 'text-teal-600 bg-teal-50' },
];

export default function DBStudioPage() {
  const [activeTable, setActiveTable] = useState<TableKey>('materials');
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch overview stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/db-studio?table=stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (e) {
      console.error('Failed to fetch stats:', e);
    }
  };

  // Fetch table records
  const fetchRecords = async (table: TableKey, query = '') => {
    setIsLoading(true);
    try {
      const url = `/api/admin/db-studio?table=${table}&search=${encodeURIComponent(query)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setRecords(data.records || []);
      } else {
        showNotification('error', 'ไม่สามารถโหลดข้อมูลตารางได้');
      }
    } catch (e) {
      showNotification('error', 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    fetchRecords(activeTable, search);
  }, [activeTable]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchRecords(activeTable, search);
  };

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 4000);
  };

  // Save edit
  const handleSaveEdit = async () => {
    if (!editingRecord) return;
    setIsSaving(true);
    try {
      const res = await fetch('/api/admin/db-studio', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          table: activeTable,
          id: editingRecord.id,
          data: editingRecord,
        }),
      });

      if (res.ok) {
        showNotification('success', 'บันทึกการแก้ไขข้อมูลเรียบร้อยแล้ว');
        setEditingRecord(null);
        fetchRecords(activeTable, search);
        fetchStats();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'บันทึกข้อมูลไม่สำเร็จ');
    } finally {
      setIsSaving(false);
    }
  };

  // Confirm delete
  const handleDeleteConfirm = async () => {
    if (!deletingRecord) return;
    try {
      const res = await fetch(`/api/admin/db-studio?table=${activeTable}&id=${deletingRecord.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showNotification('success', 'ลบข้อมูลสำเร็จ');
        setDeletingRecord(null);
        fetchRecords(activeTable, search);
        fetchStats();
      } else {
        const err = await res.json();
        showNotification('error', err.error || 'ไม่สามารถลบข้อมูลได้ (อาจมีข้อมูลอื่นเชื่อมโยงอยู่)');
      }
    } catch (e: any) {
      showNotification('error', e.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${activeTable}_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showNotification('success', `ส่งออกไฟล์ ${activeTable}.json เรียบร้อยแล้ว`);
  };

  const activeMeta = useMemo(() => TABLES.find((t) => t.key === activeTable) || TABLES[0], [activeTable]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Top Banner & Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-200">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                DB Studio (จัดการฐานข้อมูล)
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200 inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Connected
                </span>
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                ศูนย์ตรวจสอบและแก้ไขข้อมูลหลังบ้าน เข้าใจง่าย ปลอดภัย สำหรับผู้ดูแลระบบ (Admin)
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              fetchRecords(activeTable, search);
              fetchStats();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>รีเฟรช</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={records.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>สำรองข้อมูล JSON</span>
          </button>
        </div>
      </div>

      {/* Notification toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all ${
            notification.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Table Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {TABLES.map((t) => {
          const Icon = t.icon;
          const isSelected = activeTable === t.key;
          const count = stats[t.key] ?? null;

          return (
            <button
              key={t.key}
              onClick={() => {
                setActiveTable(t.key);
                setSearch('');
              }}
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                isSelected
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-white/20 text-white' : t.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {count !== null && (
                  <span
                    className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <div>
                <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                  {t.label}
                </p>
                <p className={`text-[10px] truncate ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                  {t.subLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Search & Actions Subheader */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-700">กำลังดูตาราง:</span>
            <span className="text-xs px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg font-bold">
              {activeMeta.label} ({activeMeta.subLabel})
            </span>
            <span className="text-xs text-slate-500">
              พบ {records.length} รายการ
            </span>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full sm:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3" />
            <input
              type="text"
              placeholder={`ค้นหาใน ${activeMeta.label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </form>
        </div>

        {/* Data Table View */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-blue-500" />
              กำลังโหลดข้อมูล...
            </div>
          ) : records.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              <Database className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              ไม่พบข้อมูลในตารางนี้ {search && `(คำค้นหา: "${search}")`}
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold">
                  {renderTableHeaders(activeTable)}
                  <th className="py-2.5 px-3 text-center w-28">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-blue-50/30 transition-colors">
                    {renderTableCells(activeTable, record)}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setEditingRecord({ ...record })}
                          className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-lg transition"
                          title="แก้ไขข้อมูล"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setDeletingRecord(record)}
                          className="p-1.5 text-red-500 hover:bg-red-100 rounded-lg transition"
                          title="ลบข้อมูล"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admin Help & Local Studio Guide */}
      <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 border border-blue-200/60 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-blue-950">คำแนะนำสำหรับผู้ดูแลระบบ</h3>
            <p className="text-blue-800/80">
              หน้านี้ถูกออกแบบมาให้ผู้ดูแลแก้ไขและตรวจสอบข้อมูลได้ทันทีผ่านเว็บไซต์ทั้งแบบออนไลน์ (Vercel) และในเครื่อง
              โดยระบบจะบันทึกตรงเข้าสู่ฐานข้อมูลหลักอย่างปลอดภัย
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <span className="text-[11px] font-mono text-slate-600 bg-white/80 border border-slate-200 px-3 py-1.5 rounded-lg">
            Local CLI: <strong className="text-blue-700">npm run db:studio</strong>
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* EDIT MODAL DIALOG                                                        */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  แก้ไขข้อมูล: {activeMeta.label}
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>การแก้ไขจะมีผลต่อการคำนวณและสต็อกสินค้า กรุณาตรวจสอบความถูกต้องก่อนบันทึก</span>
              </div>

              {renderEditFormFields(activeTable, editingRecord, setEditingRecord)}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-blue-200"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                                */}
      {/* ========================================================================= */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full border border-slate-200 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-slate-900 text-base">ยืนยันการลบข้อมูล?</h3>
              <p className="text-xs text-slate-500">
                คุณกำลังจะลบรายการในตาราง <strong>{activeMeta.label}</strong> (ID: {deletingRecord.id.slice(0, 8)}...)
              </p>
              <p className="text-[11px] text-red-600 font-semibold pt-1">
                ⚠️ ข้อมูลที่ถูกลบจะไม่สามารถกู้คืนได้ และหากมีรายการอ้างอิงอยู่ระบบจะปฏิเสธการลบ
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-xl transition shadow-md shadow-red-200"
              >
                ยืนยันการลบ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helpers: Render Table Headers
function renderTableHeaders(table: TableKey) {
  switch (table) {
    case 'materials':
      return (
        <>
          <th className="py-2.5 px-3">รหัสวัตถุดิบ</th>
          <th className="py-2.5 px-3">ชื่อวัตถุดิบ</th>
          <th className="py-2.5 px-3">โซนจัดเก็บ</th>
          <th className="py-2.5 px-3 text-center">หน่วยนับ</th>
          <th className="py-2.5 px-3 text-right">Min Safety Stock</th>
        </>
      );
    case 'lots':
      return (
        <>
          <th className="py-2.5 px-3">เลขล็อต (Lot No.)</th>
          <th className="py-2.5 px-3">วัตถุดิบ</th>
          <th className="py-2.5 px-3">วันรับเข้า</th>
          <th className="py-2.5 px-3">วันหมดอายุ (EXP)</th>
          <th className="py-2.5 px-3 text-right">ยอดรับแรก</th>
          <th className="py-2.5 px-3 text-right">คงเหลือปัจจุบัน</th>
          <th className="py-2.5 px-3 text-center">สถานะ</th>
        </>
      );
    case 'transactions':
      return (
        <>
          <th className="py-2.5 px-3">วันที่ทำรายการ</th>
          <th className="py-2.5 px-3 text-center">ประเภท</th>
          <th className="py-2.5 px-3">วัตถุดิบ</th>
          <th className="py-2.5 px-3">ล็อต</th>
          <th className="py-2.5 px-3 text-right">จำนวน</th>
          <th className="py-2.5 px-3">เลขที่อ้างอิง</th>
          <th className="py-2.5 px-3">หมายเหตุ</th>
        </>
      );
    case 'products':
      return (
        <>
          <th className="py-2.5 px-3">รหัสสินค้า</th>
          <th className="py-2.5 px-3">ชื่อสินค้าที่ผลิต</th>
          <th className="py-2.5 px-3 text-center">หน่วยนับ</th>
          <th className="py-2.5 px-3 text-center">จำนวนสูตร (BOM)</th>
          <th className="py-2.5 px-3 text-center">ประวัติผลิต</th>
        </>
      );
    case 'recipes':
      return (
        <>
          <th className="py-2.5 px-3">สินค้าที่ผลิต</th>
          <th className="py-2.5 px-3">วัตถุดิบที่ใช้</th>
          <th className="py-2.5 px-3 text-right">ปริมาณตามสูตร</th>
          <th className="py-2.5 px-3 text-center">หน่วย</th>
          <th className="py-2.5 px-3">หมายเหตุ</th>
        </>
      );
    case 'orders':
      return (
        <>
          <th className="py-2.5 px-3">เลขที่สั่งผลิต</th>
          <th className="py-2.5 px-3">สินค้า</th>
          <th className="py-2.5 px-3 text-right">ยอดผลิตเป้าหมาย</th>
          <th className="py-2.5 px-3 text-center">สถานะ</th>
          <th className="py-2.5 px-3">วันที่เอกสาร</th>
          <th className="py-2.5 px-3">หมายเหตุ / รุ่น</th>
        </>
      );
    case 'sections':
      return (
        <>
          <th className="py-2.5 px-3">รหัสโซน</th>
          <th className="py-2.5 px-3">ชื่อโซน</th>
          <th className="py-2.5 px-3">คำอธิบาย</th>
          <th className="py-2.5 px-3 text-center">จำนวนวัตถุดิบในโซน</th>
        </>
      );
  }
}

// Helpers: Render Table Cells
function renderTableCells(table: TableKey, record: any) {
  switch (table) {
    case 'materials':
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-blue-700">{record.code}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-900">{record.name}</td>
          <td className="py-2.5 px-3 text-slate-600">{record.section?.name || '-'}</td>
          <td className="py-2.5 px-3 text-center text-slate-700">{record.baseUnit}</td>
          <td className="py-2.5 px-3 text-right font-mono">{record.minSafetyStock.toLocaleString()}</td>
        </>
      );
    case 'lots':
      const isExpired = record.expDate && new Date(record.expDate) < new Date();
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{record.lotNumber}</td>
          <td className="py-2.5 px-3">
            <span className="font-semibold text-slate-800">{record.material.name}</span>
            <span className="text-[10px] text-slate-400 block font-mono">{record.material.code}</span>
          </td>
          <td className="py-2.5 px-3 text-slate-600">{formatDate(record.receiveDate)}</td>
          <td className="py-2.5 px-3 font-mono">
            {record.expDate ? (
              <span className={isExpired ? 'text-red-600 font-bold' : 'text-slate-700'}>
                {formatDate(record.expDate)}
              </span>
            ) : (
              '-'
            )}
          </td>
          <td className="py-2.5 px-3 text-right font-mono text-slate-500">
            {record.initialQuantity.toLocaleString()} {record.material.baseUnit}
          </td>
          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
            {record.quantityRemaining.toLocaleString()} {record.material.baseUnit}
          </td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                record.status === 'ACTIVE'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-slate-100 text-slate-600'
              }`}
            >
              {record.status}
            </span>
          </td>
        </>
      );
    case 'transactions':
      const isPositive = record.type === 'INBOUND';
      return (
        <>
          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">{formatDate(record.transactionDate)}</td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                isPositive
                  ? 'bg-emerald-100 text-emerald-800'
                  : record.type === 'PRODUCTION_ISSUE'
                  ? 'bg-orange-100 text-orange-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {record.type}
            </span>
          </td>
          <td className="py-2.5 px-3 font-medium text-slate-800">{record.material.name}</td>
          <td className="py-2.5 px-3 font-mono text-xs">{record.lot?.lotNumber || '-'}</td>
          <td className="py-2.5 px-3 text-right font-mono font-bold">
            <span className={isPositive ? 'text-emerald-600' : 'text-slate-900'}>
              {isPositive ? '+' : '-'}{Math.abs(record.quantity).toLocaleString()} {record.material.baseUnit}
            </span>
          </td>
          <td className="py-2.5 px-3 font-mono text-xs text-blue-700">{record.documentRef || '-'}</td>
          <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{record.remarks || '-'}</td>
        </>
      );
    case 'products':
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-purple-700">{record.code}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-900">{record.name}</td>
          <td className="py-2.5 px-3 text-center text-slate-700">{record.unit}</td>
          <td className="py-2.5 px-3 text-center font-mono">{record._count?.recipeItems ?? 0} รายการ</td>
          <td className="py-2.5 px-3 text-center font-mono">{record._count?.productionOrders ?? 0} ครั้ง</td>
        </>
      );
    case 'recipes':
      return (
        <>
          <td className="py-2.5 px-3 font-semibold text-purple-900">{record.product.name}</td>
          <td className="py-2.5 px-3 font-medium text-slate-800">{record.material.name}</td>
          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
            {record.quantityRequired.toLocaleString()}
          </td>
          <td className="py-2.5 px-3 text-center text-slate-600">{record.unit}</td>
          <td className="py-2.5 px-3 text-slate-500">{record.notes || '-'}</td>
        </>
      );
    case 'orders':
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-indigo-700">{record.orderNo}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-800">{record.product.name}</td>
          <td className="py-2.5 px-3 text-right font-mono font-bold">
            {record.targetQuantity.toLocaleString()} {record.product.unit}
          </td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                record.status === 'COMPLETED'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}
            >
              {record.status}
            </span>
          </td>
          <td className="py-2.5 px-3 text-slate-600">{formatDate(record.createdAt)}</td>
          <td className="py-2.5 px-3 text-slate-500 truncate max-w-xs">{record.notes || '-'}</td>
        </>
      );
    case 'sections':
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-teal-700">{record.code}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-900">{record.name}</td>
          <td className="py-2.5 px-3 text-slate-500">{record.description || '-'}</td>
          <td className="py-2.5 px-3 text-center font-mono">{record._count?.materials ?? 0} รายการ</td>
        </>
      );
  }
}

// Helpers: Render Edit Form Fields
function renderEditFormFields(table: TableKey, record: any, setRecord: React.Dispatch<React.SetStateAction<any>>) {
  const updateField = (field: string, val: any) => {
    setRecord((prev: any) => ({ ...prev, [field]: val }));
  };

  switch (table) {
    case 'materials':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสวัตถุดิบ (Code):</label>
            <input
              type="text"
              value={record.code || ''}
              onChange={(e) => updateField('code', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-blue-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อวัตถุดิบ (Name):</label>
            <input
              type="text"
              value={record.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยนับหลัก (Base Unit):</label>
              <input
                type="text"
                value={record.baseUnit || ''}
                onChange={(e) => updateField('baseUnit', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">จุดเตือนสต็อกต่ำ (Min Safety):</label>
              <input
                type="number"
                value={record.minSafetyStock ?? 0}
                onChange={(e) => updateField('minSafetyStock', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>
        </div>
      );

    case 'lots':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขล็อต (Lot Number):</label>
            <input
              type="text"
              value={record.lotNumber || ''}
              onChange={(e) => updateField('lotNumber', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ยอดคงเหลือ (Remaining):</label>
              <input
                type="number"
                step="any"
                value={record.quantityRemaining ?? 0}
                onChange={(e) => updateField('quantityRemaining', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-emerald-700"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ยอดรับแรกเริ่ม (Initial):</label>
              <input
                type="number"
                step="any"
                value={record.initialQuantity ?? 0}
                onChange={(e) => updateField('initialQuantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">วันหมดอายุ (EXP):</label>
              <input
                type="date"
                value={record.expDate ? new Date(record.expDate).toISOString().slice(0, 10) : ''}
                onChange={(e) => updateField('expDate', e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">สถานะล็อต (Status):</label>
              <select
                value={record.status || 'ACTIVE'}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="ACTIVE">ACTIVE (ปกติ)</option>
                <option value="EXPIRED">EXPIRED (หมดอายุ)</option>
                <option value="DEPLETED">DEPLETED (หมดแล้ว)</option>
                <option value="HOLD">HOLD (กักกัน/ตรวจสอบ)</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'transactions':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่เอกสารอ้างอิง (Doc Ref):</label>
            <input
              type="text"
              value={record.documentRef || ''}
              onChange={(e) => updateField('documentRef', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono text-blue-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">จำนวน (Quantity):</label>
              <input
                type="number"
                step="any"
                value={record.quantity ?? 0}
                onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ประเภท (Type):</label>
              <select
                value={record.type || 'INBOUND'}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="INBOUND">INBOUND (รับเข้า)</option>
                <option value="PRODUCTION_ISSUE">PRODUCTION_ISSUE (เบิกผลิต)</option>
                <option value="OUTBOUND">OUTBOUND (จ่ายออก)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (ปรับปรุงยอด)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ (Remarks):</label>
            <input
              type="text"
              value={record.remarks || ''}
              onChange={(e) => updateField('remarks', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      );

    case 'products':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสสินค้า (Code):</label>
            <input
              type="text"
              value={record.code || ''}
              onChange={(e) => updateField('code', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-purple-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อสินค้า (Name):</label>
            <input
              type="text"
              value={record.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยนับ (Unit):</label>
            <input
              type="text"
              value={record.unit || ''}
              onChange={(e) => updateField('unit', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      );

    case 'recipes':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ปริมาณที่ใช้ตามสูตร:</label>
            <input
              type="number"
              step="any"
              value={record.quantityRequired ?? 0}
              onChange={(e) => updateField('quantityRequired', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">หน่วยนับ:</label>
            <input
              type="text"
              value={record.unit || ''}
              onChange={(e) => updateField('unit', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ:</label>
            <input
              type="text"
              value={record.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      );

    case 'orders':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">เลขที่คำสั่งผลิต (Order No):</label>
            <input
              type="text"
              value={record.orderNo || ''}
              onChange={(e) => updateField('orderNo', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-indigo-700"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ยอดผลิตเป้าหมาย:</label>
              <input
                type="number"
                step="any"
                value={record.targetQuantity ?? 0}
                onChange={(e) => updateField('targetQuantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">สถานะ:</label>
              <select
                value={record.status || 'COMPLETED'}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl bg-white font-bold"
              >
                <option value="DRAFT">DRAFT (ร่าง)</option>
                <option value="CONFIRMED">CONFIRMED (ยืนยันแล้ว)</option>
                <option value="COMPLETED">COMPLETED (เสร็จสมบูรณ์)</option>
                <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">หมายเหตุ / รุ่นการผลิต:</label>
            <input
              type="text"
              value={record.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      );

    case 'sections':
      return (
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รหัสโซน (Code):</label>
            <input
              type="text"
              value={record.code || ''}
              onChange={(e) => updateField('code', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-mono font-bold text-teal-700"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ชื่อโซน (Name):</label>
            <input
              type="text"
              value={record.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">รายละเอียด (Description):</label>
            <input
              type="text"
              value={record.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl"
            />
          </div>
        </div>
      );
  }
}

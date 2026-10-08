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
  ShieldAlert,
  Eye,
  Terminal,
  Activity,
  ArrowRight,
  ShieldCheck,
  Clock,
  User,
  Filter,
} from 'lucide-react';
import { formatDate, formatDateTime } from '@/lib/dateUtils';

type TableKey = 'materials' | 'lots' | 'transactions' | 'products' | 'recipes' | 'orders' | 'sections' | 'auditLogs';

interface TableMeta {
  key: TableKey;
  label: string;
  subLabel: string;
  icon: any;
  color: string;
  badgeColor: string;
}

const TABLES: TableMeta[] = [
  { key: 'materials', label: 'วัตถุดิบ', subLabel: 'Materials', icon: Package, color: 'text-blue-400 bg-blue-950/50 border-blue-900/50', badgeColor: 'bg-blue-900/60 text-blue-300 border-blue-700/50' },
  { key: 'lots', label: 'ล็อต & วันหมดอายุ', subLabel: 'Lots & EXP', icon: Layers, color: 'text-emerald-400 bg-emerald-950/50 border-emerald-900/50', badgeColor: 'bg-emerald-900/60 text-emerald-300 border-emerald-700/50' },
  { key: 'transactions', label: 'ประวัติรับ-จ่าย', subLabel: 'Transactions', icon: History, color: 'text-amber-400 bg-amber-950/50 border-amber-900/50', badgeColor: 'bg-amber-900/60 text-amber-300 border-amber-700/50' },
  { key: 'products', label: 'สินค้าที่ผลิต', subLabel: 'Products', icon: Package, color: 'text-purple-400 bg-purple-950/50 border-purple-900/50', badgeColor: 'bg-purple-900/60 text-purple-300 border-purple-700/50' },
  { key: 'recipes', label: 'สูตรผลิต (BOM)', subLabel: 'Recipes', icon: FlaskConical, color: 'text-pink-400 bg-pink-950/50 border-pink-900/50', badgeColor: 'bg-pink-900/60 text-pink-300 border-pink-700/50' },
  { key: 'orders', label: 'คำสั่งผลิต & ใบเบิก', subLabel: 'Orders', icon: Calculator, color: 'text-indigo-400 bg-indigo-950/50 border-indigo-900/50', badgeColor: 'bg-indigo-900/60 text-indigo-300 border-indigo-700/50' },
  { key: 'sections', label: 'โซนคลัง', subLabel: 'Sections', icon: MapPin, color: 'text-teal-400 bg-teal-950/50 border-teal-900/50', badgeColor: 'bg-teal-900/60 text-teal-300 border-teal-700/50' },
  { key: 'auditLogs', label: 'ประวัติการแก้ไข DB', subLabel: 'Audit Logs', icon: ShieldCheck, color: 'text-rose-400 bg-rose-950/50 border-rose-900/50', badgeColor: 'bg-rose-900/60 text-rose-300 border-rose-700/50' },
];

export default function DBStudioPage() {
  const [activeTable, setActiveTable] = useState<TableKey>('materials');
  const [records, setRecords] = useState<any[]>([]);
  const [stats, setStats] = useState<Record<string, number>>({});
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<any | null>(null);
  const [viewingAuditLog, setViewingAuditLog] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Fetch overview stats
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/admin/db-studio?table=stats');
      if (res.ok) {
        const data = await res.json();
        setStats(data || {});
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
        setRecords(Array.isArray(data.records) ? data.records : []);
      } else {
        setRecords([]);
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'ไม่สามารถโหลดข้อมูลตารางได้');
      }
    } catch (e: any) {
      setRecords([]);
      showNotification('error', e?.message || 'เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล');
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
        showNotification('success', 'บันทึกการแก้ไขลงฐานข้อมูล และบันทึกประวัติ (Audit Log) เรียบร้อยแล้ว');
        setEditingRecord(null);
        fetchRecords(activeTable, search);
        fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'เกิดข้อผิดพลาดในการบันทึก');
      }
    } catch (e: any) {
      showNotification('error', e?.message || 'บันทึกข้อมูลไม่สำเร็จ');
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
        showNotification('success', 'ลบข้อมูลสำเร็จ และบันทึกประวัติการลบเรียบร้อยแล้ว');
        setDeletingRecord(null);
        fetchRecords(activeTable, search);
        fetchStats();
      } else {
        const err = await res.json().catch(() => ({}));
        showNotification('error', err.error || 'ไม่สามารถลบข้อมูลได้ (อาจมีข้อมูลอื่นเชื่อมโยงอยู่)');
      }
    } catch (e: any) {
      showNotification('error', e?.message || 'เกิดข้อผิดพลาดในการลบข้อมูล');
    }
  };

  // Export JSON
  const handleExportJSON = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `${activeTable}_backup_${new Date().toISOString().slice(0, 10)}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      showNotification('success', `ส่งออกไฟล์ ${activeTable}.json เรียบร้อยแล้ว`);
    } catch (e: any) {
      showNotification('error', 'ไม่สามารถส่งออกไฟล์ได้: ' + (e?.message || ''));
    }
  };

  const activeMeta = useMemo(() => TABLES.find((t) => t.key === activeTable) || TABLES[0], [activeTable]);

  return (
    <div className="space-y-6">
      {/* Backoffice Dark Top Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-2xl backdrop-blur-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
              <Terminal className="w-5 h-5 text-blue-100" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-mono font-bold text-white flex items-center gap-2">
                  <span>DB STUDIO CONSOLE</span>
                </h1>
                <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-400 font-semibold border border-emerald-800/80 inline-flex items-center gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  LIVE CONNECTED
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                ระบบจัดการฐานข้อมูลหลังบ้าน ตรวจสอบ ย้อนดูประวัติ และแก้ไขข้อมูล KMP Production
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              fetchRecords(activeTable, search);
              fetchStats();
            }}
            disabled={isLoading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-semibold transition active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span>SYNC DATA</span>
          </button>

          <button
            onClick={handleExportJSON}
            disabled={records.length === 0}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-xs font-mono font-semibold transition active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXPORT JSON</span>
          </button>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-700/80 text-slate-400 hover:text-white rounded-xl text-xs font-medium transition"
          >
            <span>ออกจากหลังบ้าน</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-2.5 border shadow-lg animate-in fade-in slide-in-from-top-2 duration-200 ${
            notification.type === 'success'
              ? 'bg-emerald-950/90 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/90 border-rose-800 text-rose-300'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Table Selector Tabs (Backoffice Dark Style) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
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
              className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between relative overflow-hidden ${
                isSelected
                  ? 'bg-gradient-to-b from-blue-600 to-indigo-700 text-white border-blue-400/50 shadow-lg shadow-blue-500/20 ring-1 ring-blue-400/40'
                  : 'bg-slate-900/70 hover:bg-slate-800/80 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-white/20 text-white border-white/20' : t.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {count !== null && (
                  <span
                    className={`text-[11px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                      isSelected
                        ? 'bg-white/20 text-white border-white/30'
                        : t.badgeColor
                    }`}
                  >
                    {count}
                  </span>
                )}
              </div>
              <div>
                <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                  {t.label}
                </p>
                <p className={`text-[10px] font-mono truncate mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                  {t.subLabel}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Main Console View Card */}
      <div className="bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden">
        {/* Search & Meta Controls Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-xs font-mono text-slate-400">TABLE:</span>
            <span className="text-xs px-2.5 py-1 bg-blue-950 text-blue-300 border border-blue-800/80 rounded-lg font-mono font-bold">
              {activeMeta.label} ({activeMeta.subLabel})
            </span>
            <span className="text-xs font-mono text-slate-500">
              [{records.length} RECORDS]
            </span>
            {activeTable === 'auditLogs' && (
              <span className="text-[11px] px-2 py-0.5 bg-rose-950/80 text-rose-400 border border-rose-800/80 rounded-full font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                ระบบบันทึกประวัติอัตโนมัติ
              </span>
            )}
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3" />
            <input
              type="text"
              placeholder={`ค้นหาใน ${activeMeta.label}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-700/80 text-white rounded-xl placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 transition font-sans"
            />
          </form>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-16 text-center text-slate-500 text-xs font-mono">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-3 text-blue-400" />
              LOADING DATABASE RECORDS...
            </div>
          ) : records.length === 0 ? (
            <div className="p-16 text-center text-slate-500 text-xs font-mono">
              <Database className="w-8 h-8 mx-auto mb-3 text-slate-700" />
              NO RECORDS FOUND IN [{activeMeta.subLabel.toUpperCase()}]{search && ` FOR QUERY "${search}"`}
            </div>
          ) : (
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 font-mono text-[11px] uppercase tracking-wider">
                  {renderTableHeaders(activeTable)}
                  <th className="py-2.5 px-3 text-center w-28">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-sans">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-800/40 transition-colors">
                    {renderTableCells(activeTable, record, setViewingAuditLog)}
                    <td className="py-2.5 px-3 text-center whitespace-nowrap">
                      {activeTable === 'auditLogs' ? (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setViewingAuditLog(record)}
                            className="inline-flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg text-[11px] font-mono transition border border-slate-700"
                            title="ดูรายละเอียดการเปลี่ยนแปลง"
                          >
                            <Eye className="w-3 h-3" />
                            <span>ดู Diff</span>
                          </button>
                          <button
                            onClick={() => setDeletingRecord(record)}
                            className="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition"
                            title="ลบ Log นี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setEditingRecord({ ...record })}
                            className="p-1.5 text-blue-400 hover:bg-blue-950/60 hover:text-blue-300 rounded-lg transition border border-transparent hover:border-blue-800/50"
                            title="แก้ไขข้อมูลในฐานข้อมูล"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(record)}
                            className="p-1.5 text-rose-400 hover:bg-rose-950/60 hover:text-rose-300 rounded-lg transition border border-transparent hover:border-rose-800/50"
                            title="ลบข้อมูลออกจากฐานข้อมูล"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Admin Safety & Audit Guide Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <h3 className="font-bold text-slate-200 flex items-center gap-2">
              <span>ความปลอดภัยและการตรวจสอบย้อนหลัง (Audit Log Guard)</span>
              <span className="text-[10px] px-2 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                ACTIVE
              </span>
            </h3>
            <p className="text-slate-400 leading-relaxed">
              ทุกการกดแก้ไข (PUT) หรือการลบ (DELETE) ใน DB Studio จะถูกบันทึกประวัติ วันเวลา และค่าเดิม-ค่าใหม่ ลงในตาราง
              <strong className="text-rose-400 font-mono ml-1">AuditLog</strong> อัตโนมัติ เพื่อให้ผู้ดูแลตรวจสอบย้อนหลังได้ทุกจุด
            </p>
          </div>
        </div>

        <div className="shrink-0 flex items-center gap-2">
          <button
            onClick={() => {
              setActiveTable('auditLogs');
              setSearch('');
            }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800 text-rose-300 rounded-xl text-xs font-semibold transition"
          >
            <Clock className="w-3.5 h-3.5" />
            <span>ดูประวัติการแก้ไขทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* AUDIT LOG DIFF VIEWER MODAL                                              */}
      {/* ========================================================================= */}
      {viewingAuditLog && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-2xl w-full border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-lg border ${
                  viewingAuditLog.action === 'DELETE'
                    ? 'bg-rose-950 text-rose-400 border-rose-800'
                    : (viewingAuditLog.action === 'CREATE' || viewingAuditLog.action === 'IMPORT')
                    ? 'bg-emerald-950 text-emerald-400 border-emerald-800'
                    : 'bg-amber-950 text-amber-400 border-amber-800'
                }`}>
                  <History className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white font-mono flex items-center gap-2">
                    <span>AUDIT DETAIL: [{viewingAuditLog.action}]</span>
                    <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-normal">
                      {viewingAuditLog.tableName}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400 font-mono">
                    บันทึกเมื่อ: {formatDateTime(viewingAuditLog.createdAt)} โดย {viewingAuditLog.changedBy || 'Admin'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingAuditLog(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto font-sans">
              {/* Summary Banner */}
              <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                <span className="text-[11px] font-mono text-slate-500 block mb-1">คำอธิบายการเปลี่ยนแปลง:</span>
                <p className="text-xs font-semibold text-slate-200">
                  {viewingAuditLog.summary || 'ไม่มีคำอธิบาย'}
                </p>
                <p className="text-[11px] font-mono text-slate-400 mt-1">
                  Record ID: <span className="text-blue-400">{viewingAuditLog.recordId}</span>
                </p>
              </div>

              {/* Side-by-side or Stacked Diff */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Old Data */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-rose-400 px-1">
                    <span>ค่าเดิม (BEFORE)</span>
                    <span className="text-[10px] bg-rose-950 px-1.5 py-0.5 rounded border border-rose-900">OLD</span>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-rose-900/40 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                    {formatJSON(viewingAuditLog.oldData)}
                  </pre>
                </div>

                {/* New Data */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono font-bold text-emerald-400 px-1">
                    <span>ค่าใหม่ (AFTER)</span>
                    <span className="text-[10px] bg-emerald-950 px-1.5 py-0.5 rounded border border-emerald-900">NEW</span>
                  </div>
                  <pre className="p-3 bg-slate-950 border border-emerald-900/40 rounded-xl text-[11px] font-mono text-slate-300 overflow-x-auto max-h-64 whitespace-pre-wrap break-words">
                    {formatJSON(viewingAuditLog.newData)}
                  </pre>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewingAuditLog(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* EDIT MODAL DIALOG (Dark Theme)                                           */}
      {/* ========================================================================= */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-700 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-blue-400" />
                <h3 className="font-bold text-sm text-white font-mono">
                  EDIT RECORD: {activeMeta.label}
                </h3>
              </div>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form Content */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              <div className="p-3 bg-amber-950/60 border border-amber-800/80 rounded-xl text-[11px] text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>การแก้ไขจะมีผลต่อฐานข้อมูลทันที และระบบจะบันทึก Log การเปลี่ยนแปลงให้อัตโนมัติ</span>
              </div>

              {renderEditFormFields(activeTable, editingRecord, setEditingRecord)}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-slate-800 bg-slate-950/80 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingRecord(null)}
                disabled={isSaving}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                disabled={isSaving}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-blue-500/20"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION MODAL (Dark Theme)                                   */}
      {/* ========================================================================= */}
      {deletingRecord && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 rounded-2xl max-w-sm w-full border border-slate-700 shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150 text-slate-100">
            <div className="w-12 h-12 rounded-full bg-rose-950/80 border border-rose-800/80 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="font-bold text-white text-base">ยืนยันการลบข้อมูล?</h3>
              <p className="text-xs text-slate-400">
                คุณกำลังจะลบรายการในตาราง <strong className="text-white">{activeMeta.label}</strong> (ID: {String(deletingRecord?.id || '').slice(0, 8)}...)
              </p>
              <p className="text-[11px] text-rose-400 font-semibold pt-1">
                ⚠️ การลบจะถูกบันทึกประวัติใน Audit Log เพื่อให้ตรวจสอบย้อนหลังได้
              </p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <button
                onClick={() => setDeletingRecord(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-rose-600/20"
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

// Helpers: JSON formatting for diff view
function formatJSON(raw: any): string {
  if (!raw) return 'ไม่มีข้อมูล (NULL)';
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return String(raw);
  }
}

// Safe number formatting helper
function safeNumber(val: any, fallback = 0): string {
  if (val === null || val === undefined) return Number(fallback).toLocaleString();
  const n = Number(val);
  return isNaN(n) ? String(fallback) : n.toLocaleString();
}

// Safe date to input string helper (YYYY-MM-DD)
function safeDateToInput(dateInput: any): string {
  if (!dateInput) return '';
  try {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().slice(0, 10);
  } catch {
    return '';
  }
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
          <th className="py-2.5 px-3 text-center">สูตร (BOM)</th>
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
          <th className="py-2.5 px-3 text-center">วัตถุดิบในโซน</th>
        </>
      );
    case 'auditLogs':
      return (
        <>
          <th className="py-2.5 px-3">วัน-เวลาแก้ไข</th>
          <th className="py-2.5 px-3 text-center">แอ็กชัน</th>
          <th className="py-2.5 px-3">ตาราง (Table)</th>
          <th className="py-2.5 px-3">รายละเอียดการแก้ไข</th>
          <th className="py-2.5 px-3">ผู้แก้ไข</th>
        </>
      );
  }
}

// Helpers: Render Table Cells (Dark Theme)
function renderTableCells(table: TableKey, record: any, onInspectAudit?: (log: any) => void) {
  if (!record) return null;

  switch (table) {
    case 'materials': {
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{record.code || '-'}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-100">{record.name || '-'}</td>
          <td className="py-2.5 px-3 text-slate-400">{record.section?.name || '-'}</td>
          <td className="py-2.5 px-3 text-center text-slate-300 font-mono">{record.baseUnit || 'kg'}</td>
          <td className="py-2.5 px-3 text-right font-mono text-slate-300">{safeNumber(record.minSafetyStock, 0)}</td>
        </>
      );
    }
    case 'lots': {
      const expDateObj = record.expDate ? new Date(record.expDate) : null;
      const isExpired = Boolean(expDateObj && !isNaN(expDateObj.getTime()) && expDateObj < new Date());
      const baseUnit = record.material?.baseUnit || '';

      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-slate-100">{record.lotNumber || '-'}</td>
          <td className="py-2.5 px-3">
            <span className="font-semibold text-slate-200">{record.material?.name || '-'}</span>
            <span className="text-[10px] text-slate-500 block font-mono">{record.material?.code || ''}</span>
          </td>
          <td className="py-2.5 px-3 text-slate-400 font-mono">{formatDate(record.receiveDate)}</td>
          <td className="py-2.5 px-3 font-mono">
            {record.expDate ? (
              <span className={isExpired ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                {formatDate(record.expDate)}
              </span>
            ) : (
              '-'
            )}
          </td>
          <td className="py-2.5 px-3 text-right font-mono text-slate-400">
            {safeNumber(record.initialQuantity)} {baseUnit}
          </td>
          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
            {safeNumber(record.quantityRemaining)} {baseUnit}
          </td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                record.status === 'ACTIVE'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              {record.status || 'ACTIVE'}
            </span>
          </td>
        </>
      );
    }
    case 'transactions': {
      const isPositive = record.type === 'INBOUND';
      const baseUnit = record.material?.baseUnit || '';

      return (
        <>
          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap font-mono">{formatDate(record.transactionDate)}</td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                isPositive
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : record.type === 'PRODUCTION_ISSUE'
                  ? 'bg-amber-950/80 text-amber-400 border-amber-800'
                  : 'bg-blue-950/80 text-blue-400 border-blue-800'
              }`}
            >
              {record.type || 'TX'}
            </span>
          </td>
          <td className="py-2.5 px-3 font-medium text-slate-200">{record.material?.name || '-'}</td>
          <td className="py-2.5 px-3 font-mono text-xs text-slate-400">{record.lot?.lotNumber || '-'}</td>
          <td className="py-2.5 px-3 text-right font-mono font-bold">
            <span className={isPositive ? 'text-emerald-400' : 'text-slate-200'}>
              {isPositive ? '+' : '-'}{safeNumber(Math.abs(Number(record.quantity) || 0))} {baseUnit}
            </span>
          </td>
          <td className="py-2.5 px-3 font-mono text-xs text-blue-400">{record.documentRef || '-'}</td>
          <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">{record.remarks || '-'}</td>
        </>
      );
    }
    case 'products': {
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-purple-400">{record.code || '-'}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-100">{record.name || '-'}</td>
          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{record.unit || 'ชิ้น'}</td>
          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{record._count?.recipeItems ?? 0} รายการ</td>
          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{record._count?.productionOrders ?? 0} ครั้ง</td>
        </>
      );
    }
    case 'recipes': {
      return (
        <>
          <td className="py-2.5 px-3 font-semibold text-purple-300">{record.product?.name || '-'}</td>
          <td className="py-2.5 px-3 font-medium text-slate-200">{record.material?.name || '-'}</td>
          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
            {safeNumber(record.quantityRequired)}
          </td>
          <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{record.unit || 'kg'}</td>
          <td className="py-2.5 px-3 text-slate-400">{record.notes || '-'}</td>
        </>
      );
    }
    case 'orders': {
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-indigo-400">{record.orderNo || '-'}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-200">{record.product?.name || '-'}</td>
          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
            {safeNumber(record.targetQuantity)} {record.product?.unit || 'ชิ้น'}
          </td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                record.status === 'COMPLETED'
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/80 text-amber-400 border-amber-800'
              }`}
            >
              {record.status || 'PENDING'}
            </span>
          </td>
          <td className="py-2.5 px-3 text-slate-400 font-mono">{formatDate(record.createdAt)}</td>
          <td className="py-2.5 px-3 text-slate-400 truncate max-w-xs">{record.notes || '-'}</td>
        </>
      );
    }
    case 'sections': {
      return (
        <>
          <td className="py-2.5 px-3 font-mono font-bold text-teal-400">{record.code || '-'}</td>
          <td className="py-2.5 px-3 font-semibold text-slate-100">{record.name || '-'}</td>
          <td className="py-2.5 px-3 text-slate-400">{record.description || '-'}</td>
          <td className="py-2.5 px-3 text-center font-mono text-slate-300">{record._count?.materials ?? 0} รายการ</td>
        </>
      );
    }
    case 'auditLogs': {
      const isDelete = record.action === 'DELETE';
      const isCreate = record.action === 'CREATE' || record.action === 'IMPORT';
      return (
        <>
          <td className="py-2.5 px-3 text-slate-300 whitespace-nowrap font-mono text-xs">
            {formatDateTime(record.createdAt)}
          </td>
          <td className="py-2.5 px-3 text-center">
            <span
              className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                isDelete
                  ? 'bg-rose-950/80 text-rose-400 border-rose-800'
                  : isCreate
                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800'
                  : 'bg-amber-950/80 text-amber-400 border-amber-800'
              }`}
            >
              {record.action || 'UPDATE'}
            </span>
          </td>
          <td className="py-2.5 px-3 font-mono font-bold text-blue-400">{record.tableName || '-'}</td>
          <td className="py-2.5 px-3 text-slate-200">
            <div className="flex items-center gap-2">
              <span className="truncate max-w-sm">{record.summary || '-'}</span>
            </div>
          </td>
          <td className="py-2.5 px-3 text-slate-400 text-xs font-mono">{record.changedBy || 'Admin'}</td>
        </>
      );
    }
  }
}

// Helpers: Render Edit Form Fields (Dark Theme)
function renderEditFormFields(table: TableKey, record: any, setRecord: React.Dispatch<React.SetStateAction<any>>) {
  const updateField = (field: string, val: any) => {
    setRecord((prev: any) => ({ ...prev, [field]: val }));
  };

  switch (table) {
    case 'materials':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">รหัสวัตถุดิบ (Code):</label>
            <input
              type="text"
              value={record.code || ''}
              onChange={(e) => updateField('code', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">ชื่อวัตถุดิบ (Name):</label>
            <input
              type="text"
              value={record.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">หน่วยนับหลัก (Base Unit):</label>
              <input
                type="text"
                value={record.baseUnit || ''}
                onChange={(e) => updateField('baseUnit', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">จุดเตือนสต็อกต่ำ (Min Safety):</label>
              <input
                type="number"
                value={record.minSafetyStock ?? 0}
                onChange={(e) => updateField('minSafetyStock', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
        </div>
      );

    case 'lots':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">เลขล็อต (Lot Number):</label>
            <input
              type="text"
              value={record.lotNumber || ''}
              onChange={(e) => updateField('lotNumber', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-white focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ยอดคงเหลือ (Remaining):</label>
              <input
                type="number"
                step="any"
                value={record.quantityRemaining ?? 0}
                onChange={(e) => updateField('quantityRemaining', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ยอดรับแรกเริ่ม (Initial):</label>
              <input
                type="number"
                step="any"
                value={record.initialQuantity ?? 0}
                onChange={(e) => updateField('initialQuantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono text-slate-300 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">วันหมดอายุ (EXP):</label>
              <input
                type="date"
                value={safeDateToInput(record.expDate)}
                onChange={(e) => updateField('expDate', e.target.value ? new Date(e.target.value) : null)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">สถานะล็อต (Status):</label>
              <select
                value={record.status || 'ACTIVE'}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="ACTIVE">ACTIVE (ปกติ)</option>
                <option value="EXPIRED">EXPIRED (หมดอายุ)</option>
                <option value="EXHAUSTED">EXHAUSTED (หมดแล้ว)</option>
                <option value="HOLD">HOLD (กักกัน/ตรวจสอบ)</option>
              </select>
            </div>
          </div>
        </div>
      );

    case 'transactions':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">เลขที่เอกสารอ้างอิง (Doc Ref):</label>
            <input
              type="text"
              value={record.documentRef || ''}
              onChange={(e) => updateField('documentRef', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono text-blue-400 focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">จำนวน (Quantity):</label>
              <input
                type="number"
                step="any"
                value={record.quantity ?? 0}
                onChange={(e) => updateField('quantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-slate-100 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ประเภท (Type):</label>
              <select
                value={record.type || 'INBOUND'}
                onChange={(e) => updateField('type', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-blue-500"
              >
                <option value="INBOUND">INBOUND (รับเข้า)</option>
                <option value="PRODUCTION_ISSUE">PRODUCTION_ISSUE (เบิกผลิต)</option>
                <option value="OUTBOUND">OUTBOUND (จ่ายออก)</option>
                <option value="ADJUSTMENT">ADJUSTMENT (ปรับปรุงยอด)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">หมายเหตุ (Remarks):</label>
            <input
              type="text"
              value={record.remarks || ''}
              onChange={(e) => updateField('remarks', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>
      );

    case 'products':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">รหัสสินค้า (Code):</label>
            <input
              type="text"
              value={record.code || ''}
              onChange={(e) => updateField('code', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-purple-400 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">ชื่อสินค้า (Name):</label>
            <input
              type="text"
              value={record.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-bold text-white focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">หน่วยนับ (Unit):</label>
            <input
              type="text"
              value={record.unit || ''}
              onChange={(e) => updateField('unit', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>
      );

    case 'recipes':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">ปริมาณที่ใช้ตามสูตร:</label>
            <input
              type="number"
              step="any"
              value={record.quantityRequired ?? 0}
              onChange={(e) => updateField('quantityRequired', parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-white focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">หน่วยนับ:</label>
            <input
              type="text"
              value={record.unit || ''}
              onChange={(e) => updateField('unit', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-pink-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">หมายเหตุ:</label>
            <input
              type="text"
              value={record.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>
      );

    case 'orders':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">เลขที่คำสั่งผลิต (Order No):</label>
            <input
              type="text"
              value={record.orderNo || ''}
              onChange={(e) => updateField('orderNo', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-indigo-400 focus:outline-none focus:border-indigo-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">ยอดผลิตเป้าหมาย:</label>
              <input
                type="number"
                step="any"
                value={record.targetQuantity ?? 0}
                onChange={(e) => updateField('targetQuantity', parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-white focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">สถานะ:</label>
              <select
                value={record.status || 'COMPLETED'}
                onChange={(e) => updateField('status', e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 font-bold focus:outline-none focus:border-indigo-500"
              >
                <option value="DRAFT">DRAFT (ร่าง)</option>
                <option value="CONFIRMED">CONFIRMED (ยืนยันแล้ว)</option>
                <option value="COMPLETED">COMPLETED (เสร็จสมบูรณ์)</option>
                <option value="CANCELLED">CANCELLED (ยกเลิก)</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">หมายเหตุ / รุ่นการผลิต:</label>
            <input
              type="text"
              value={record.notes || ''}
              onChange={(e) => updateField('notes', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>
      );

    case 'sections':
      return (
        <div className="space-y-3 font-sans">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">รหัสโซน (Code):</label>
            <input
              type="text"
              value={record.code || ''}
              onChange={(e) => updateField('code', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-mono font-bold text-teal-400 focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">ชื่อโซน (Name):</label>
            <input
              type="text"
              value={record.name || ''}
              onChange={(e) => updateField('name', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl font-bold text-white focus:outline-none focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">รายละเอียด (Description):</label>
            <input
              type="text"
              value={record.description || ''}
              onChange={(e) => updateField('description', e.target.value)}
              className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-teal-500"
            />
          </div>
        </div>
      );

    case 'auditLogs':
      return (
        <div className="p-4 text-center text-slate-400 text-xs font-mono">
          ไม่สามารถแก้ไขประวัติ Audit Log ได้โดยตรง (Read-Only)
        </div>
      );
  }
}

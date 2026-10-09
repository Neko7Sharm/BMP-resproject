'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Search,
  Package,
  Loader2,
  ChevronDown,
  Info,
  Printer,
  CalendarPlus,
} from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';
import { useAuth } from '@/context/AuthContext';

interface Transaction {
  id: string;
  type: string;
  quantity: number;
  lotBalanceAfter: number | null;
  totalStockAfter: number | null;
  transactionDate: string;
  documentRef: string | null;
  remarks: string | null;
  createdBy: string | null;
  material: { code: string; name: string; baseUnit: string };
  lot: { lotNumber: string; expDate: string | null } | null;
}

const TYPE_FILTERS = [
  { value: 'all', label: 'ทั้งหมด' },
  { value: 'INBOUND', label: 'รับเข้า' },
  { value: 'OUTBOUND', label: 'จ่ายออก' },
  { value: 'PRODUCTION_ISSUE', label: 'เบิกผลิต' },
];

function getTypeBadge(type: string) {
  switch (type) {
    case 'INBOUND':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
          <ArrowDownLeft className="w-3 h-3" /> รับเข้า
        </span>
      );
    case 'OUTBOUND':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
          <ArrowUpRight className="w-3 h-3" /> จ่ายออก
        </span>
      );
    case 'PRODUCTION_ISSUE':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
          <ArrowUpRight className="w-3 h-3" /> เบิกผลิต
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700">
          {type}
        </span>
      );
  }
}

function getRowBg(type: string) {
  switch (type) {
    case 'INBOUND': return 'bg-emerald-50/40';
    case 'OUTBOUND': return 'bg-amber-50/30';
    case 'PRODUCTION_ISSUE': return 'bg-purple-50/30';
    default: return '';
  }
}

function groupByDate(transactions: Transaction[]) {
  const groups: { date: string; items: Transaction[] }[] = [];
  const seen = new Map<string, Transaction[]>();
  for (const tx of transactions) {
    const d = formatDate(tx.transactionDate);
    if (!seen.has(d)) { seen.set(d, []); groups.push({ date: d, items: seen.get(d)! }); }
    seen.get(d)!.push(tx);
  }
  return groups;
}

export default function TransactionsPage() {
  const { user, isAdmin, isProd } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [totalShown, setTotalShown] = useState(100);

  useEffect(() => {
    fetchData();
  }, [typeFilter, search]);

  async function fetchData() {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (typeFilter !== 'all') params.set('type', typeFilter);
      if (search) params.set('search', search);
      const res = await fetch(`/api/transactions?${params}`);
      const data = await res.json();
      setTransactions(Array.isArray(data) ? data : []);
      setTotalShown(Array.isArray(data) ? data.length : 0);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  const groups = groupByDate(transactions);

  return (
    <div className="space-y-5 pb-20 md:pb-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <History className="w-5 h-5 text-blue-600" /> ประวัติรับ-จ่าย
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">บันทึกความเคลื่อนไหวทุกรายการ ตรวจสอบย้อนหลังได้</p>
        </div>

        {(isAdmin || isProd) ? (
          <div className="flex items-center gap-2">
            <Link
              href="/production?tab=history&createBackdate=true"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
            >
              <CalendarPlus className="w-3.5 h-3.5" />
              <span>➕ ทำใบเบิกผลิตย้อนหลัง</span>
            </Link>
            <Link
              href="/production?tab=history"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
            >
              <span>ประวัติใบเบิกผลิต</span>
            </Link>
          </div>
        ) : (
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs text-slate-600">
            <span className="w-2 h-2 rounded-full bg-slate-400" />
            <span>โหมดดูประวัติ (อ่านอย่างเดียว)</span>
            {!user && (
              <Link href="/login?next=/transactions" className="text-purple-600 hover:text-purple-700 font-bold underline ml-1">
                เข้าสู่ระบบ
              </Link>
            )}
          </div>
        )}
      </div>

      {/* Filter + Search */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาวัตถุดิบ, เลขล็อต, เอกสาร..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Type filter */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                typeFilter === f.value
                  ? f.value === 'INBOUND' ? 'bg-emerald-600 text-white'
                  : f.value === 'OUTBOUND' ? 'bg-amber-500 text-white'
                  : f.value === 'PRODUCTION_ISSUE' ? 'bg-purple-600 text-white'
                  : 'bg-blue-600 text-white'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Limit notice */}
      {totalShown >= 100 && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          แสดง {totalShown} รายการล่าสุด — ใช้ช่องค้นหาเพื่อกรองดูรายการเก่ากว่า
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
          <p className="text-sm text-slate-400">กำลังโหลด...</p>
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-slate-200 text-center">
          <History className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-800">ไม่พบรายการ</h3>
          <p className="text-xs text-slate-400 mt-1">ลองเปลี่ยนตัวกรองหรือคำค้นหา</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.date}>
              {/* Date group header */}
              <div className="flex items-center gap-2 mb-2">
                <span className="text-xs font-bold text-slate-600">{group.date}</span>
                <span className="text-[11px] text-slate-400">({group.items.length} รายการ)</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase border-b border-slate-200 text-[10px]">
                      <tr>
                        <th className="py-2 px-3">เวลา</th>
                        <th className="py-2 px-3">ประเภท</th>
                        <th className="py-2 px-3">วัตถุดิบ</th>
                        <th className="py-2 px-3">เลขล็อต</th>
                        <th className="py-2 px-3 text-right">จำนวน</th>
                        <th className="py-2 px-3 text-right">คงเหลือล็อต</th>
                        <th className="py-2 px-3">เอกสาร / หมายเหตุ</th>
                        <th className="py-2 px-3">ผู้บันทึก</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {group.items.map((tx) => (
                        <tr key={tx.id} className={`hover:brightness-95 transition ${getRowBg(tx.type)}`}>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {new Date(tx.transactionDate).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2.5 px-3">{getTypeBadge(tx.type)}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-slate-900">{tx.material.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{tx.material.code}</div>
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            <div className="font-bold text-blue-700">{tx.lot?.lotNumber || '-'}</div>
                            {tx.lot?.expDate && (
                              <div className="text-[10px] text-slate-400 font-normal font-sans">
                                EXP: {formatDate(tx.lot.expDate)}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            <span className={tx.type === 'INBOUND' ? 'text-emerald-700' : 'text-rose-600'}>
                              {tx.type === 'INBOUND' ? '+' : '-'}{tx.quantity.toLocaleString()}
                            </span>
                            <span className="text-slate-400 font-normal ml-1">{tx.material.baseUnit}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right text-slate-600">
                            {tx.lotBalanceAfter !== null ? `${tx.lotBalanceAfter.toLocaleString()} ${tx.material.baseUnit}` : '-'}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-mono text-slate-600 flex items-center gap-1.5 flex-wrap">
                              <span>{tx.documentRef || '-'}</span>
                              {tx.documentRef && tx.documentRef.startsWith('PRD-') && (
                                <Link
                                  href={`/production?tab=history&search=${tx.documentRef}`}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10px] font-semibold rounded border border-blue-200"
                                  title="ดูประวัติและพิมพ์ใบเบิก"
                                >
                                  <Printer className="w-3 h-3" />
                                  <span>ใบเบิก</span>
                                </Link>
                              )}
                            </div>
                            {tx.remarks && <div className="text-[10px] text-slate-400 mt-0.5">{tx.remarks}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500">{tx.createdBy || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

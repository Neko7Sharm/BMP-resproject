'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Layers,
  Plus,
  Edit2,
  Trash2,
  X,
  Package,
  Save,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface Section {
  id: string;
  code: string;
  name: string;
  description: string | null;
  _count?: { materials: number };
}

const SECTION_COLORS = [
  'bg-amber-100 text-amber-800 border-amber-200',
  'bg-blue-100 text-blue-800 border-blue-200',
  'bg-purple-100 text-purple-800 border-purple-200',
  'bg-teal-100 text-teal-800 border-teal-200',
  'bg-orange-100 text-orange-800 border-orange-200',
  'bg-rose-100 text-rose-800 border-rose-200',
  'bg-indigo-100 text-indigo-800 border-indigo-200',
];

export default function SectionsPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit modal
  const [editingSection, setEditingSection] = useState<Section | null>(null);
  const [editCode, setEditCode] = useState('');
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchSections();
  }, []);

  async function fetchSections() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/sections');
      const data = await res.json();
      setSections(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/sections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: newCode, name: newName, description: newDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'เพิ่มโซนไม่สำเร็จ');
        return;
      }
      setShowAddModal(false);
      setNewCode('');
      setNewName('');
      setNewDesc('');
      fetchSections();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  function openEdit(section: Section) {
    setEditingSection(section);
    setEditCode(section.code);
    setEditName(section.name);
    setEditDesc(section.description || '');
    setErrorMsg(null);
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSection) return;
    setIsUpdating(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sections/${editingSection.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: editCode, name: editName, description: editDesc }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'แก้ไขโซนไม่สำเร็จ');
        return;
      }
      setEditingSection(null);
      fetchSections();
    } catch (e) {
      console.error(e);
    } finally {
      setIsUpdating(false);
    }
  }

  async function handleDelete(section: Section) {
    if (!confirm(`ยืนยันการลบโซน "${section.name}" (${section.code}) ออกจากระบบใช่หรือไม่?`)) return;
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/sections/${section.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || 'ลบโซนไม่สำเร็จ');
        return;
      }
      fetchSections();
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-600" />
            จัดการโซนและพื้นที่คลังสินค้า (Warehouse Sections)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดโซนจัดเก็บ 7 ประเภทสำหรับจัดหมวดหมู่วัตถุดิบและสินค้า พร้อมปรับแต่งชื่อโซนได้เอง
          </p>
        </div>

        <button
          onClick={() => {
            setNewCode(`SEC-${String(sections.length + 1).padStart(2, '0')}`);
            setNewName('');
            setNewDesc('');
            setErrorMsg(null);
            setShowAddModal(true);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มโซนคลังใหม่</span>
        </button>
      </div>

      {/* Error Banner */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-rose-800 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="ml-auto text-rose-600 hover:text-rose-800">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sections Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-slate-500">กำลังโหลดข้อมูลโซนคลัง...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {sections.map((section, idx) => {
            const colorClass = SECTION_COLORS[idx % SECTION_COLORS.length];
            return (
              <div
                key={section.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col"
              >
                <div className={`px-5 py-4 flex items-center gap-3 border-b border-slate-100`}>
                  <div className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${colorClass}`}>
                    {section.code}
                  </div>
                  <h3 className="font-bold text-slate-900 text-base leading-tight">{section.name}</h3>
                </div>

                <div className="px-5 py-3 flex-1 space-y-2">
                  {section.description && (
                    <p className="text-xs text-slate-500 leading-relaxed">{section.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-2">
                    <Package className="w-3.5 h-3.5 text-slate-400" />
                    <span>
                      วัตถุดิบ/สินค้า:{' '}
                      <strong className="text-slate-800">
                        {section._count?.materials ?? 0} รายการ
                      </strong>
                    </span>
                  </div>
                </div>

                <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <Link
                    href={`/inventory?sectionId=${section.id}`}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                  >
                    <Package className="w-3 h-3" />
                    <span>ดูของในโซน</span>
                  </Link>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openEdit(section)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                      title="แก้ไขชื่อโซน"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(section)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                      title="ลบโซนนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Add Section Card */}
          <button
            onClick={() => {
              setNewCode(`SEC-${String(sections.length + 1).padStart(2, '0')}`);
              setNewName('');
              setNewDesc('');
              setErrorMsg(null);
              setShowAddModal(true);
            }}
            className="bg-white rounded-2xl border-2 border-dashed border-slate-300 hover:border-blue-400 hover:bg-blue-50/30 shadow-sm p-6 flex flex-col items-center justify-center gap-3 transition group min-h-[160px]"
          >
            <div className="w-10 h-10 rounded-full bg-slate-100 group-hover:bg-blue-100 flex items-center justify-center transition">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-blue-600 transition" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-slate-600 group-hover:text-blue-700 transition">
                เพิ่มโซนคลังใหม่
              </p>
              <p className="text-xs text-slate-400 mt-0.5">กดเพื่อสร้างโซนจัดเก็บเพิ่มเติม</p>
            </div>
          </button>
        </div>
      )}

      {/* --- ADD SECTION MODAL --- */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">เพิ่มโซนคลังสินค้าใหม่</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdd} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสโซน (Section Code) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น SEC-08"
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อโซน *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น วัตถุดิบแห้ง"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบายโซน (ไม่บังคับ)
                </label>
                <input
                  type="text"
                  placeholder="เช่น จัดเก็บผงแห้ง สารสกัด และเคมีภัณฑ์ชนิดแห้ง"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกโซนใหม่'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT SECTION MODAL --- */}
      {editingSection && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">แก้ไขโซนคลังสินค้า</h3>
              <button onClick={() => setEditingSection(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdate} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสโซน (Section Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={editCode}
                    onChange={(e) => setEditCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    ชื่อโซน *
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบายโซน
                </label>
                <input
                  type="text"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  {errorMsg}
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingSection(null)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isUpdating ? 'กำลังบันทึก...' : 'บันทึกการแก้ไข'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

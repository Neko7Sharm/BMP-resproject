'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FlaskConical, 
  Plus, 
  Package, 
  Trash2, 
  Calculator, 
  AlertCircle,
  Layers,
  ArrowRight,
  Edit2,
  X,
  Info,
  CheckCircle2,
  Loader2,
  MapPin,
} from 'lucide-react';

interface RecipeItem {
  id: string;
  materialId: string;
  quantityRequired: number;
  unit: string;
  material: {
    id: string;
    code: string;
    name: string;
    baseUnit: string;
  };
}

interface Section {
  id: string;
  code: string;
  name: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  description: string | null;
  outputSectionId: string | null;
  outputSection: Section | null;
  recipeItems: RecipeItem[];
}

interface Material {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
}

interface RecipeRowState {
  materialId: string;       // '__NEW__' when isCustom=true
  quantityRequired: number;
  unit: string;
  isCustom?: boolean;
  customCode?: string;
  customName?: string;
  customBaseUnit?: string;  // 'kg' | 'L' | etc.
}

function isLiquidUnit(unit: string) {
  const u = (unit || '').toLowerCase();
  return u === 'l' || u === 'ml' || u.includes('ลิตร') || u.includes('มล');
}

function getAvailableUnitsForMaterial(baseUnit: string) {
  if (isLiquidUnit(baseUnit)) {
    return [
      { value: 'L', label: 'L (ลิตร)' },
      { value: 'ml', label: 'ml (มิลลิลิตร)' },
    ];
  }
  return [
    { value: 'kg', label: 'kg (กิโลกรัม)' },
    { value: 'g', label: 'g (กรัม)' },
  ];
}

export default function RecipesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create / Edit Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [unit, setUnit] = useState('ขวด');
  const [desc, setDesc] = useState('');
  const [outputSectionId, setOutputSectionId] = useState('');
  const [recipeRows, setRecipeRows] = useState<RecipeRowState[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Modal
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [prodRes, matRes, secRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/materials'),
        fetch('/api/sections'),
      ]);
      const prodData = await prodRes.json();
      const matData = await matRes.json();
      const secData = await secRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
      setMaterials(Array.isArray(matData) ? matData : []);
      setSections(Array.isArray(secData) ? secData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenCreateModal() {
    setEditingProduct(null);
    setCode(`FG-${Date.now().toString().slice(-4)}`);
    setName('');
    setUnit('ขวด');
    setDesc('');
    setOutputSectionId('');
    if (materials.length > 0) {
      const defaultUnit = isLiquidUnit(materials[0].baseUnit) ? 'L' : 'kg';
      setRecipeRows([
        {
          materialId: materials[0].id,
          quantityRequired: 0.1,
          unit: defaultUnit,
        },
      ]);
    } else {
      setRecipeRows([]);
    }
    setShowModal(true);
  }

  function handleOpenEditModal(p: Product) {
    setEditingProduct(p);
    setCode(p.code);
    setName(p.name);
    setUnit(p.unit);
    setDesc(p.description || '');
    setOutputSectionId(p.outputSectionId || '');
    setRecipeRows(
      p.recipeItems.map((item) => ({
        materialId: item.materialId,
        quantityRequired: item.quantityRequired,
        unit: item.unit || item.material?.baseUnit || 'kg',
      }))
    );
    setShowModal(true);
  }

  function handleAddRecipeRow() {
    if (materials.length > 0) {
      const defaultUnit = isLiquidUnit(materials[0].baseUnit) ? 'L' : 'kg';
      setRecipeRows([
        ...recipeRows,
        {
          materialId: materials[0].id,
          quantityRequired: 0.05,
          unit: defaultUnit,
        },
      ]);
    } else {
      handleAddCustomRecipeRow();
    }
  }

  function handleAddCustomRecipeRow() {
    setRecipeRows([
      ...recipeRows,
      {
        materialId: '__NEW__',
        quantityRequired: 0.05,
        unit: 'kg',
        isCustom: true,
        customCode: '',
        customName: '',
        customBaseUnit: 'kg',
      },
    ]);
  }

  function handleRemoveRecipeRow(index: number) {
    setRecipeRows(recipeRows.filter((_, i) => i !== index));
  }

  function handleMaterialChange(index: number, newMatId: string) {
    setRecipeRows((prev) => {
      const updated = [...prev];
      if (newMatId === '__NEW__') {
        // Switch to custom mode
        updated[index] = {
          ...updated[index],
          materialId: '__NEW__',
          isCustom: true,
          customCode: '',
          customName: '',
          customBaseUnit: 'kg',
          unit: 'kg',
        };
      } else {
        // Switch back to existing material
        const newMat = materials.find((m) => m.id === newMatId);
        const defaultUnit = newMat ? (isLiquidUnit(newMat.baseUnit) ? 'L' : 'kg') : 'kg';
        updated[index] = {
          ...updated[index],
          materialId: newMatId,
          isCustom: false,
          customCode: undefined,
          customName: undefined,
          customBaseUnit: undefined,
          unit: defaultUnit,
        };
      }
      return updated;
    });
  }

  function handleCustomFieldChange(
    index: number,
    field: 'customCode' | 'customName' | 'customBaseUnit',
    value: string
  ) {
    setRecipeRows((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // Auto-sync unit when base unit changes
      if (field === 'customBaseUnit') {
        updated[index].unit = isLiquidUnit(value) ? 'L' : 'kg';
      }
      return updated;
    });
  }

  function handleUnitChange(index: number, newUnit: string) {
    setRecipeRows((prev) => {
      const updated = [...prev];
      const oldUnit = updated[index].unit;
      const oldQty = updated[index].quantityRequired;
      let newQty = oldQty;

      // Smart auto-conversion between kg <-> g and L <-> ml
      if ((oldUnit === 'kg' && newUnit === 'g') || (oldUnit === 'L' && newUnit === 'ml')) {
        newQty = Number((oldQty * 1000).toFixed(4));
      } else if ((oldUnit === 'g' && newUnit === 'kg') || (oldUnit === 'ml' && newUnit === 'L')) {
        newQty = Number((oldQty / 1000).toFixed(4));
      }

      updated[index] = {
        ...updated[index],
        unit: newUnit,
        quantityRequired: newQty,
      };
      return updated;
    });
  }

  async function handleSaveProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!code || !name || recipeRows.length === 0) {
      alert('กรุณากรอกข้อมูลสินค้าและเลือกวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }

    // Validate custom rows
    for (const row of recipeRows) {
      if (row.isCustom) {
        if (!row.customCode?.trim() || !row.customName?.trim()) {
          alert('กรุณากรอกรหัสและชื่อวัตถุดิบใหม่ทุกแถวที่เลือก "อื่นๆ"');
          return;
        }
      }
    }

    setIsSubmitting(true);
    try {
      // Step 1: Auto-create any custom (new) materials
      const resolvedRows = await Promise.all(
        recipeRows.map(async (row) => {
          if (!row.isCustom) return row;

          // Create new material via API
          const matRes = await fetch('/api/materials', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code: row.customCode!.trim().toUpperCase(),
              name: row.customName!.trim(),
              baseUnit: row.customBaseUnit || 'kg',
              minSafetyStock: 0,
            }),
          });

          if (!matRes.ok) {
            const err = await matRes.json();
            throw new Error(`สร้างวัตถุดิบ "${row.customName}" ไม่สำเร็จ: ${err.error || ''}`);
          }

          const newMat = await matRes.json();
          return { ...row, materialId: newMat.id, isCustom: false };
        })
      );

      // Step 2: Save product with resolved materialIds
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name,
          unit,
          description: desc,
          outputSectionId: outputSectionId || null,
          recipeItems: resolvedRows,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'บันทึกสูตรไม่สำเร็จ');
      }
    } catch (e: any) {
      alert(e?.message || 'เกิดข้อผิดพลาด');
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProduct() {
    if (!deletingProduct) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/products/${deletingProduct.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeletingProduct(null);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'ลบสูตรไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <div className="space-y-6 pb-20 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-indigo-600" />
            สูตรการผลิตสินค้า (Bill of Materials - BOM)
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            กำหนดอัตราส่วนวัตถุดิบต่อ 1 หน่วยสินค้า • รองรับของแข็ง (kg, g) และของเหลว (L, ml) พร้อมคำนวณเบิกผลิตอัตโนมัติ
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างสูตรสินค้าใหม่</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-slate-300" />
          <p className="text-sm">กำลังโหลดรายการสูตรสินค้า...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">ยังไม่มีสูตรสินค้าในระบบ</h3>
          <p className="text-xs text-slate-500 mt-1">กดปุ่มสร้างสูตรสินค้าใหม่เพื่อกำหนดสัดส่วนวัตถุดิบ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between hover:border-slate-300 transition"
            >
              <div className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{p.name}</h3>
                    <div className="text-xs font-mono font-semibold text-indigo-700 mt-0.5">
                      {p.code} • หน่วยผลิต: {p.unit}
                    </div>
                    {p.outputSection && (
                      <div className="flex items-center gap-1 mt-1">
                        <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
                        <span className="text-[11px] text-teal-700 font-semibold">
                          เก็บหลังผลิต: {p.outputSection.code} — {p.outputSection.name}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                      {p.recipeItems.length} วัตถุดิบ
                    </span>
                    <button
                      onClick={() => handleOpenEditModal(p)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition"
                      title="แก้ไขสูตรนี้"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeletingProduct(p)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition"
                      title="ลบสูตรนี้"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {p.description}
                  </p>
                )}

                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase tracking-wide mb-2">
                    สัดส่วนวัตถุดิบต่อ 1 {p.unit}:
                  </h4>
                  <div className="space-y-1.5">
                    {p.recipeItems.map((item) => {
                      const isSubUnit = 
                        (item.unit === 'g' && item.material.baseUnit === 'kg') ||
                        (item.unit === 'ml' && item.material.baseUnit === 'L');

                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <div>
                              <span className="font-semibold text-slate-800">
                                {item.material.name}
                              </span>
                              <span className="text-[10px] text-slate-400 font-mono ml-1">
                                ({item.material.code})
                              </span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="font-bold text-slate-900 text-xs">
                              {item.quantityRequired.toLocaleString()} {item.unit}
                            </span>
                            {isSubUnit && (
                              <div className="text-[10px] text-slate-400">
                                (= {(item.quantityRequired / 1000).toFixed(4)} {item.material.baseUnit} ในคลัง)
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  สูตรพร้อมเบิกผลิต
                </span>
                <Link
                  href={`/production?productId=${p.id}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition"
                >
                  <Calculator className="w-3.5 h-3.5" />
                  <span>คำนวณเบิกผลิตสินค้านี้</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Modal: Create / Edit Product & BOM ── */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingProduct ? `แก้ไขสูตรสินค้า: ${editingProduct.name}` : 'สร้างสูตรการผลิตสินค้าใหม่ (BOM)'}
                </h3>
                <p className="text-xs text-slate-400">กำหนดสินค้าและอัตราส่วนการใช้วัตถุดิบ</p>
              </div>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    รหัสสินค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 text-xs font-mono font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    หน่วยนับสินค้า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ชิ้น, ขวด, กล่อง"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  ชื่อสินค้าสำเร็จรูป *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สเปรย์แอลกอฮอล์ 100ml, เจลล้างมือ"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-bold border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  คำอธิบายสูตร
                </label>
                <input
                  type="text"
                  placeholder="เช่น สูตรความเข้มข้น 75% กลิ่นอโรม่า"
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Output Section Picker */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-3">
                <label className="block text-xs font-bold text-teal-800 mb-1.5 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5" />
                  โซนคลังที่เก็บสินค้าหลังผลิต
                </label>
                <select
                  value={outputSectionId}
                  onChange={(e) => setOutputSectionId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-teal-200 rounded-lg bg-white focus:ring-2 focus:ring-teal-400 outline-none font-medium"
                >
                  <option value="">— ไม่ระบุโซน (ไม่บังคับ) —</option>
                  {sections.map((s) => (
                    <option key={s.id} value={s.id}>
                      [{s.code}] {s.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-teal-600 mt-1">
                  เลือกโซนในคลังที่จะนำสินค้าเข้าเก็บเมื่อผลิตเสร็จ
                </p>
              </div>

              {/* Recipe Items Form */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-xs font-bold text-slate-700 uppercase">
                      วัตถุดิบที่ต้องใช้ต่อ 1 {unit || 'หน่วย'}:
                    </label>
                    <p className="text-[11px] text-slate-400">
                      ของแข็งเลือก <strong>kg หรือ g</strong> • ของเหลวเลือก <strong>L หรือ ml</strong> ได้ทันที
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAddCustomRecipeRow}
                      className="text-xs text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg transition"
                      title="เพิ่มวัตถุดิบที่ยังไม่มีในคลัง"
                    >
                      <Plus className="w-3.5 h-3.5 text-amber-600" /> วัตถุดิบใหม่ (อื่นๆ)
                    </button>
                    <button
                      type="button"
                      onClick={handleAddRecipeRow}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-1 px-2.5 py-1 rounded-lg hover:bg-indigo-50 transition"
                    >
                      <Plus className="w-3.5 h-3.5" /> เพิ่มวัตถุดิบในคลัง
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                  {recipeRows.map((row, index) => {
                    const mat = materials.find((m) => m.id === row.materialId);

                    return (
                      <div
                        key={index}
                        className={`flex flex-col gap-2 p-2.5 rounded-xl border transition ${
                          row.isCustom
                            ? 'bg-amber-50 border-amber-300'
                            : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        {/* Row header: Material selector + remove */}
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <select
                              value={row.isCustom ? '__NEW__' : row.materialId}
                              onChange={(e) => handleMaterialChange(index, e.target.value)}
                              className={`w-full px-2.5 py-1.5 text-xs border rounded-lg font-medium outline-none focus:ring-2 ${
                                row.isCustom
                                  ? 'border-amber-300 bg-amber-100 text-amber-800 focus:ring-amber-400'
                                  : 'border-slate-200 bg-white focus:ring-indigo-500'
                              }`}
                            >
                              {materials.map((m) => (
                                <option key={m.id} value={m.id}>
                                  [{m.code}] {m.name} ({m.baseUnit})
                                </option>
                              ))}
                              <option value="__NEW__">＋ อื่นๆ / วัตถุดิบใหม่ที่ยังไม่มีในระบบ...</option>
                            </select>
                          </div>
                          {/* Remove Row Button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveRecipeRow(index)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* Custom material inline form */}
                        {row.isCustom && (
                          <div className="grid grid-cols-3 gap-1.5">
                            <div>
                              <label className="block text-[10px] font-bold text-amber-700 mb-0.5">รหัส *</label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น RM-099"
                                value={row.customCode || ''}
                                onChange={(e) => handleCustomFieldChange(index, 'customCode', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs font-mono font-bold border border-amber-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-400 uppercase"
                              />
                            </div>
                            <div className="col-span-1">
                              <label className="block text-[10px] font-bold text-amber-700 mb-0.5">ชื่อวัตถุดิบ *</label>
                              <input
                                type="text"
                                required
                                placeholder="เช่น น้ำหอมกลิ่น A"
                                value={row.customName || ''}
                                onChange={(e) => handleCustomFieldChange(index, 'customName', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-amber-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-400"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-amber-700 mb-0.5">หน่วยหลัก</label>
                              <select
                                value={row.customBaseUnit || 'kg'}
                                onChange={(e) => handleCustomFieldChange(index, 'customBaseUnit', e.target.value)}
                                className="w-full px-2 py-1.5 text-xs border border-amber-300 rounded-lg bg-white outline-none focus:ring-2 focus:ring-amber-400 font-bold"
                              >
                                <option value="kg">kg (กก.)</option>
                                <option value="g">g (กรัม)</option>
                                <option value="L">L (ลิตร)</option>
                                <option value="ml">ml (มล.)</option>
                                <option value="ชิ้น">ชิ้น</option>
                                <option value="กล่อง">กล่อง</option>
                                <option value="ถุง">ถุง</option>
                              </select>
                            </div>
                          </div>
                        )}

                        {/* Quantity + Unit row */}
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-slate-500 shrink-0">จำนวนต่อ 1 {unit || 'หน่วย'}:</span>
                          <div className="w-28">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              required
                              placeholder="จำนวน"
                              value={row.quantityRequired}
                              onChange={(e) => {
                                const updated = [...recipeRows];
                                updated[index].quantityRequired = parseFloat(e.target.value) || 0;
                                setRecipeRows(updated);
                              }}
                              className="w-full px-2 py-1.5 text-xs text-right font-bold border border-slate-200 rounded-lg bg-white outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Unit Selector */}
                          <select
                            value={row.unit}
                            onChange={(e) => handleUnitChange(index, e.target.value)}
                            className="px-2 py-1.5 text-xs font-bold border border-indigo-200 rounded-lg bg-indigo-50 text-indigo-900 outline-none focus:ring-2 focus:ring-indigo-500"
                          >
                            <optgroup label="ของแข็ง (Solid)">
                              <option value="kg">kg (กก.)</option>
                              <option value="g">g (กรัม)</option>
                            </optgroup>
                            <optgroup label="ของเหลว (Liquid)">
                              <option value="L">L (ลิตร)</option>
                              <option value="ml">ml (มล.)</option>
                            </optgroup>
                            {!['kg', 'g', 'l', 'ml'].includes(row.unit.toLowerCase()) && (
                              <optgroup label="หน่วยเดิม">
                                <option value={row.unit}>{row.unit}</option>
                              </optgroup>
                            )}
                          </select>

                          {/* Custom badge */}
                          {row.isCustom && (
                            <span className="text-[10px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.5 rounded-full shrink-0">
                              ใหม่
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition shadow-sm"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : editingProduct ? 'บันทึกการแก้ไข' : 'บันทึกสูตรสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deletingProduct && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-slate-200">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900">ยืนยันการลบสูตรสินค้า</h3>
              <p className="text-xs text-slate-600 mt-1">
                คุณต้องการลบสูตร <strong>"{deletingProduct.name}"</strong> ({deletingProduct.code}) ใช่หรือไม่?
              </p>
            </div>
            <div className="flex gap-2.5 mt-5">
              <button
                onClick={() => setDeletingProduct(null)}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition disabled:opacity-50"
              >
                {isDeleting ? 'กำลังลบ...' : 'ยืนยันการลบ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

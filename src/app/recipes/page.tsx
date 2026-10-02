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
  ArrowRight
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

interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  description: string | null;
  recipeItems: RecipeItem[];
}

export default function RecipesPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Product Modal State
  const [showModal, setShowModal] = useState(false);
  const [newCode, setNewCode] = useState('');
  const [newName, setNewName] = useState('');
  const [newUnit, setNewUnit] = useState('ขวด');
  const [newDesc, setNewDesc] = useState('');
  const [recipeRows, setRecipeRows] = useState<
    { materialId: string; quantityRequired: number; unit: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    setIsLoading(true);
    try {
      const [prodRes, matRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/materials'),
      ]);
      const prodData = await prodRes.json();
      const matData = await matRes.json();
      setProducts(Array.isArray(prodData) ? prodData : []);
      setMaterials(Array.isArray(matData) ? matData : []);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  function handleOpenModal() {
    setNewCode(`FG-${Date.now().toString().slice(-4)}`);
    setNewName('');
    setNewUnit('ขวด');
    setNewDesc('');
    if (materials.length > 0) {
      setRecipeRows([
        {
          materialId: materials[0].id,
          quantityRequired: 0.1,
          unit: materials[0].baseUnit,
        },
      ]);
    } else {
      setRecipeRows([]);
    }
    setShowModal(true);
  }

  function handleAddRecipeRow() {
    if (materials.length === 0) return;
    setRecipeRows([
      ...recipeRows,
      {
        materialId: materials[0].id,
        quantityRequired: 0.05,
        unit: materials[0].baseUnit,
      },
    ]);
  }

  function handleRemoveRecipeRow(index: number) {
    setRecipeRows(recipeRows.filter((_, i) => i !== index));
  }

  async function handleCreateProduct(e: React.FormEvent) {
    e.preventDefault();
    if (!newCode || !newName || recipeRows.length === 0) {
      alert('กรุณากรอกข้อมูลสินค้าและเลือกวัตถุดิบอย่างน้อย 1 รายการ');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          name: newName,
          unit: newUnit,
          description: newDesc,
          recipeItems: recipeRows,
        }),
      });

      if (res.ok) {
        setShowModal(false);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error || 'สร้างสูตรไม่สำเร็จ');
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FlaskConical className="w-6 h-6 text-indigo-600" />
            สูตรการผลิตสินค้า (Bill of Materials - BOM)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            กำหนดสัดส่วนวัตถุดิบต่อ 1 หน่วยสินค้า เพื่อใช้คำนวณเบิกวัตถุดิบและตัดสต็อกอัตโนมัติ
          </p>
        </div>

        <button
          onClick={handleOpenModal}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition"
        >
          <Plus className="w-4 h-4" />
          <span>สร้างสูตรสินค้าใหม่</span>
        </button>
      </div>

      {isLoading ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center text-slate-500">
          กำลังโหลดรายการสูตรสินค้า...
        </div>
      ) : products.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
          <FlaskConical className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-800">ยังไม่มีสูตรสินค้าในระบบ</h3>
          <p className="text-xs text-slate-500 mt-1">กดปุ่มสร้างสูตรสินค้าใหม่เพื่อกำหนดสัดส่วนวัตถุดิบ</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col justify-between"
            >
              <div className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-slate-900">{p.name}</h3>
                    </div>
                    <div className="text-xs font-mono font-semibold text-indigo-700 mt-0.5">
                      {p.code} • หน่วยผลิต: {p.unit}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {p.recipeItems.length} วัตถุดิบ
                  </span>
                </div>

                {p.description && (
                  <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {p.description}
                  </p>
                )}

                <div className="mt-4">
                  <h4 className="text-xs font-bold text-slate-600 uppercase mb-2">
                    สัดส่วนวัตถุดิบต่อ 1 {p.unit}:
                  </h4>
                  <div className="space-y-1.5">
                    {p.recipeItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2">
                          <Package className="w-3.5 h-3.5 text-slate-400" />
                          <span className="font-semibold text-slate-800">
                            {item.material.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            ({item.material.code})
                          </span>
                        </div>
                        <span className="font-bold text-slate-900">
                          {item.quantityRequired} {item.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs text-slate-400">สูตรพร้อมใช้งาน</span>
                <Link
                  href={`/production?productId=${p.id}`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition"
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

      {/* Create Product & BOM Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-slate-900 mb-4">
              กำหนดสินค้าและสูตรการผลิตใหม่ (BOM)
            </h3>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    รหัสสินค้า *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCode}
                    onChange={(e) => setNewCode(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    หน่วยนับสินค้า *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="เช่น ชิ้น, ขวด, กล่อง"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  ชื่อสินค้าสำเร็จรูป *
                </label>
                <input
                  type="text"
                  required
                  placeholder="เช่น สเปรย์แอลกอฮอล์ 100ml, เจลล้างมือ"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
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
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>

              {/* Recipe Items Form */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700 uppercase">
                    วัตถุดิบที่ต้องใช้ต่อ 1 {newUnit || 'หน่วย'}:
                  </label>
                  <button
                    type="button"
                    onClick={handleAddRecipeRow}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> เพิ่มวัตถุดิบ
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {recipeRows.map((row, index) => {
                    const mat = materials.find((m) => m.id === row.materialId);
                    return (
                      <div
                        key={index}
                        className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
                      >
                        <select
                          value={row.materialId}
                          onChange={(e) => {
                            const newMat = materials.find((m) => m.id === e.target.value);
                            const updated = [...recipeRows];
                            updated[index].materialId = e.target.value;
                            if (newMat) updated[index].unit = newMat.baseUnit;
                            setRecipeRows(updated);
                          }}
                          className="flex-1 px-2 py-1.5 text-xs border border-slate-200 rounded bg-white font-medium"
                        >
                          {materials.map((m) => (
                            <option key={m.id} value={m.id}>
                              [{m.code}] {m.name}
                            </option>
                          ))}
                        </select>

                        <div className="w-24">
                          <input
                            type="number"
                            step="any"
                            placeholder="จำนวน"
                            value={row.quantityRequired}
                            onChange={(e) => {
                              const updated = [...recipeRows];
                              updated[index].quantityRequired = parseFloat(e.target.value) || 0;
                              setRecipeRows(updated);
                            }}
                            className="w-full px-2 py-1.5 text-xs text-right font-bold border border-slate-200 rounded bg-white"
                          />
                        </div>

                        <span className="text-xs font-semibold text-slate-500 w-10">
                          {row.unit}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleRemoveRecipeRow(index)}
                          className="p-1 text-slate-400 hover:text-rose-600"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-sm font-semibold bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'กำลังบันทึก...' : 'บันทึกสูตรสินค้า'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

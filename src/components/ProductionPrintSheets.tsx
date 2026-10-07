'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { ArrowLeft, FileDown, SlidersHorizontal, Info, Printer } from 'lucide-react';
import { formatDate } from '@/lib/dateUtils';

interface RecipeItemData {
  id: string;
  quantityRequired: number;
  unit: string;
  notes: string | null;
  material: {
    id: string;
    code: string;
    name: string;
    baseUnit: string;
  };
}

interface RequisitionItemData {
  id: string;
  quantityDeducted: number;
  lot: {
    id: string;
    lotNumber: string;
    expDate: string | Date | null;
    material: {
      id: string;
      code: string;
      name: string;
      baseUnit: string;
    };
  };
}

interface OrderData {
  id: string;
  orderNo: string;
  targetQuantity: number;
  status: string;
  requestedBy: string | null;
  approvedBy: string | null;
  notes: string | null;
  createdAt: string | Date;
  product: {
    id: string;
    code: string;
    name: string;
    unit: string;
    recipeItems?: RecipeItemData[];
  };
  requisitionItems: RequisitionItemData[];
}

export default function ProductionPrintSheets({ order }: { order: OrderData }) {
  // Print view mode: both, fr31, or fr14
  const [activeTab, setActiveTab] = useState<'both' | 'fr31' | 'fr14'>('both');
  const [showConfig, setShowConfig] = useState(false);

  // Form editable states
  const initialDate = useMemo(() => formatDate(order.createdAt), [order.createdAt]);

  // Default EXP: 1 year after createdAt
  const initialExpDate = useMemo(() => {
    const d = new Date(order.createdAt);
    d.setFullYear(d.getFullYear() + 1);
    d.setDate(d.getDate() - 1);
    return formatDate(d);
  }, [order.createdAt]);

  const [prodDate, setProdDate] = useState(initialDate);
  const [orderNumber, setOrderNumber] = useState(order.orderNo);
  const [productName, setProductName] = useState(order.product.name);

  // Extract or generate Lot No.
  const defaultLot = useMemo(() => {
    if (order.notes && order.notes.trim()) {
      const match = order.notes.match(/(?:LOT|Lot|รุ่น)[\.\:\s]*([A-Za-z0-9\/\-]+)/i);
      if (match) return match[1];
    }
    const prefix = order.product.code ? order.product.code.slice(0, 4).toUpperCase() : 'LOT';
    const datePart = new Date(order.createdAt);
    const yr = (datePart.getFullYear() + 543).toString().slice(-2);
    const mo = String(datePart.getMonth() + 1).padStart(2, '0');
    return `${prefix}-${yr}${mo}/1`;
  }, [order]);

  const [lotNo, setLotNo] = useState(defaultLot);
  const [workInstruction, setWorkInstruction] = useState('WI 3-1-1');
  const [revision, setRevision] = useState('21');
  const [totalProduced, setTotalProduced] = useState(`${order.targetQuantity} ${order.product.unit}`);
  const [packSize, setPackSize] = useState('25 kg/กระสอบ');
  const [packagingType, setPackagingType] = useState('กระสอบพลาสติกสาน');
  const [mfdDate, setMfdDate] = useState(initialDate);
  const [expDate, setExpDate] = useState(initialExpDate);
  const [scaleId, setScaleId] = useState('');

  // Handle browser print
  const handlePrint = () => {
    window.print();
  };

  // Prepare items for FR 3-1 (22 rows fixed height matching template)
  const TOTAL_FR31_ROWS = 22;
  const fr31Items = useMemo(() => {
    if (order.product.recipeItems && order.product.recipeItems.length > 0) {
      return order.product.recipeItems.map((item, idx) => ({
        no: `${idx + 1}`,
        name: item.material.name,
        qty: `${(item.quantityRequired * order.targetQuantity).toLocaleString()} ${item.unit || item.material.baseUnit}`,
        notes: item.notes || '',
      }));
    }

    // Fallback if recipe items are not linked: group requisitionItems by material
    const matMap = new Map<string, { name: string; qty: number; unit: string }>();
    order.requisitionItems.forEach((req) => {
      const mat = req.lot.material;
      const cur = matMap.get(mat.id) || { name: mat.name, qty: 0, unit: mat.baseUnit };
      cur.qty += req.quantityDeducted;
      matMap.set(mat.id, cur);
    });

    return Array.from(matMap.values()).map((item, idx) => ({
      no: `${idx + 1}`,
      name: item.name,
      qty: `${item.qty.toLocaleString()} ${item.unit}`,
      notes: '',
    }));
  }, [order]);

  const blankFR31Count = Math.max(0, TOTAL_FR31_ROWS - fr31Items.length);

  // Prepare items for FR 1-4 (36 dotted rows fixed height matching template)
  // Each item gets a primary row and a dotted secondary row like the user's template
  const TOTAL_FR14_ROWS = 36;
  const fr14Rows = useMemo(() => {
    const rows: {
      no: string;
      name: string;
      reqQty: string;
      lotNo: string;
      issueQty: string;
      scale: string;
      isSubItem?: boolean;
    }[] = [];

    if (order.requisitionItems && order.requisitionItems.length > 0) {
      order.requisitionItems.forEach((item, idx) => {
        // Main data row
        rows.push({
          no: `${idx + 1}`,
          name: item.lot.material.name,
          reqQty: `${item.quantityDeducted.toLocaleString()} ${item.lot.material.baseUnit}`,
          lotNo: item.lot.lotNumber,
          issueQty: `${item.quantityDeducted.toLocaleString()} ${item.lot.material.baseUnit}`,
          scale: scaleId,
        });
        // Blank dotted row for handwriting or multi-lot note
        rows.push({
          no: '',
          name: '',
          reqQty: '',
          lotNo: '',
          issueQty: '',
          scale: '',
        });
      });
    } else if (order.product.recipeItems && order.product.recipeItems.length > 0) {
      order.product.recipeItems.forEach((item, idx) => {
        rows.push({
          no: `${idx + 1}`,
          name: item.material.name,
          reqQty: `${(item.quantityRequired * order.targetQuantity).toLocaleString()} ${item.unit || item.material.baseUnit}`,
          lotNo: '',
          issueQty: '',
          scale: '',
        });
        rows.push({
          no: '',
          name: '',
          reqQty: '',
          lotNo: '',
          issueQty: '',
          scale: '',
        });
      });
    }

    return rows;
  }, [order, scaleId]);

  const blankFR14Count = Math.max(0, TOTAL_FR14_ROWS - fr14Rows.length);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20 print:p-0 print:m-0 print:space-y-0 print:pb-0 print:max-w-none">
      {/* Top Controls Bar (Hidden during print) */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm no-print space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/production"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>ย้อนกลับ</span>
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-900">
                  แบบฟอร์มเบิกผลิต (FR 3-1 และ FR 1-4)
                </h1>
                <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded font-mono font-bold">
                  {order.orderNo}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                จัดหน้ากระดาษตรงตามฟอร์มจริงเป๊ะ <strong>A4 แนวตั้ง รวม 2 แผ่น</strong> (แผ่นที่ 1: FR 3-1, แผ่นที่ 2: FR 1-4)
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition border ${
                showConfig
                  ? 'bg-slate-800 text-white border-slate-800'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showConfig ? 'ซ่อนตัวปรับแต่ง' : 'ปรับข้อมูลในฟอร์ม'}</span>
            </button>

            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-200 transition"
            >
              <Printer className="w-4 h-4" />
              <span>พิมพ์เอกสาร (A4 x 2 แผ่น)</span>
            </button>
          </div>
        </div>

        {/* Tab Selector: Choose which form to view/print */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          <span className="text-xs font-semibold text-slate-600 mr-2">มุมมองเอกสาร:</span>
          <button
            onClick={() => setActiveTab('both')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'both'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            📑 พิมพ์ทั้ง 2 แผ่น (A4 แนวตั้ง 2 หน้า)
          </button>
          <button
            onClick={() => setActiveTab('fr31')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'fr31'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            1️⃣ เฉพาะ ฟอร์มการผลิต (FR 3-1 แผ่นที่ 1)
          </button>
          <button
            onClick={() => setActiveTab('fr14')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'fr14'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            2️⃣ เฉพาะ ฟอร์มเบิก-จ่าย (FR 1-4 แผ่นที่ 2)
          </button>
        </div>

        {/* Quick Edit Config Drawer */}
        {showConfig && (
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs">
            <div className="font-bold text-slate-800 pb-1 border-b border-slate-200">
              แก้ไขข้อมูลหัวฟอร์มและฉลาก (ข้อมูลจะอัปเดตบนแบบฟอร์มทันทีก่อนพิมพ์):
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-slate-600 font-semibold mb-1">วันที่ผลิต (DD-MM-YYYY):</label>
                <input
                  type="text"
                  value={prodDate}
                  onChange={(e) => {
                    setProdDate(e.target.value);
                    setMfdDate(e.target.value);
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">รุ่นการผลิต (Lot No.):</label>
                <input
                  type="text"
                  value={lotNo}
                  onChange={(e) => setLotNo(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs font-bold text-blue-700"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">วิธีปฏิบัติงาน (WI):</label>
                <input
                  type="text"
                  value={workInstruction}
                  onChange={(e) => setWorkInstruction(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">Revision:</label>
                <input
                  type="text"
                  value={revision}
                  onChange={(e) => setRevision(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">จำนวนที่ผลิต:</label>
                <input
                  type="text"
                  value={totalProduced}
                  onChange={(e) => setTotalProduced(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">ขนาดการบรรจุ:</label>
                <input
                  type="text"
                  value={packSize}
                  onChange={(e) => setPackSize(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">ชนิดบรรจุภัณฑ์:</label>
                <input
                  type="text"
                  value={packagingType}
                  onChange={(e) => setPackagingType(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-slate-600 font-semibold mb-1">วันหมดอายุ (EXP):</label>
                <input
                  type="text"
                  value={expDate}
                  onChange={(e) => setExpDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded text-xs"
                />
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2 p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-800">
          <Info className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>ตั้งค่าการพิมพ์ A4 แนวตั้ง:</strong> ในหน้าต่างพิมพ์ ให้เลือก <em>Orientation เป็น "Portrait" (แนวตั้ง)</em> และเลือก <em>Margins เป็น "None" หรือ "Default"</em> เพื่อให้พิมพ์ออกมาเป็น 2 แผ่น A4 พอดี
          </span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* FORM 1: ฟอร์มการผลิต (FR 3-1) - หน้าตาตรงตามรูปที่ 1 เต็มแผ่น A4          */}
      {/* ========================================================================= */}
      {(activeTab === 'both' || activeTab === 'fr31') && (
        <div className="print-page print-page-1 bg-white p-4 sm:p-6 text-black font-sans leading-tight min-h-[283mm] print:p-0 print:m-0 print:w-full print:h-[283mm] print:max-h-[283mm] print:overflow-hidden print:flex print:flex-col print:justify-between shadow-md mb-8 rounded-lg print:shadow-none print:rounded-none">
          {/* Main Outer Box with 1.5px Solid Black Border - Height 276mm fits full A4 page */}
          <div className="border-[1.5px] border-black bg-white flex flex-col justify-between h-[276mm] max-h-[276mm] print:h-[276mm]">
            {/* Gray Header Banner */}
            <div className="bg-[#e5e5e5] h-[9mm] flex items-center justify-center border-b border-black shrink-0">
              <h1 className="text-sm sm:text-base font-bold text-black tracking-wide">
                ฟอร์มการผลิต (FR 3-1)
              </h1>
            </div>

            {/* Meta Section (3 Rows) */}
            <div className="text-[11px] sm:text-xs text-black shrink-0">
              {/* Row 1: วันที่ผลิต & เลขที่ (dotted bottom divider) */}
              <div className="h-[7.5mm] flex border-b border-dotted border-black px-2 items-center justify-between">
                <div className="flex items-center">
                  <span className="font-bold mr-1.5">วันที่ผลิต :</span>
                  <span>{prodDate}</span>
                </div>
                <div className="flex items-center pr-12 sm:pr-20">
                  <span className="font-bold mr-1.5">เลขที่ :</span>
                  <span className="font-mono">{orderNumber}</span>
                </div>
              </div>

              {/* Row 2: รายการผลิต & รุ่นการผลิต (dotted bottom divider) */}
              <div className="h-[7.5mm] flex border-b border-dotted border-black px-2 items-center justify-between">
                <div className="flex items-center">
                  <span className="font-bold mr-1.5">รายการผลิต :</span>
                  <span className="font-semibold">{productName}</span>
                </div>
                <div className="flex items-center pr-12 sm:pr-20">
                  <span className="font-bold mr-1.5">รุ่นการผลิต :</span>
                  <span className="font-bold font-mono">{lotNo}</span>
                </div>
              </div>

              {/* Row 3: วิธีปฏิบัติงาน & Revision (solid bottom divider) */}
              <div className="h-[7.5mm] flex border-b border-black px-2 items-center justify-between">
                <div className="flex items-center">
                  <span className="font-bold mr-1.5">วิธีปฏิบัติงาน :</span>
                  <span>{workInstruction}</span>
                </div>
                <div className="flex items-center pr-12 sm:pr-20">
                  <span className="underline text-blue-700 font-bold mr-1.5">Revision :</span>
                  <span>{revision}</span>
                </div>
              </div>
            </div>

            {/* BOM Table - 22 rows distributed evenly to fill ~180mm */}
            <table className="w-full text-[11px] sm:text-xs border-collapse border-b border-black table-fixed flex-1">
              <thead>
                <tr className="bg-[#e5e5e5] text-black font-bold border-b border-black text-center h-[8.5mm]">
                  <th className="w-12 border-r border-black font-bold align-middle">ลำดับ</th>
                  <th className="border-r border-black text-center font-bold align-middle">รายการ</th>
                  <th className="w-36 sm:w-44 border-r border-black text-center font-bold align-middle">
                    จำนวน/หน่วยนับ
                  </th>
                  <th className="w-32 sm:w-40 text-center font-bold align-middle">หมายเหตุ</th>
                </tr>
              </thead>
              <tbody>
                {fr31Items.map((item, idx) => {
                  const isSub = item.no.includes('.');
                  return (
                    <tr key={`fr31-row-${idx}`} className="border-b border-black h-[8.18mm] text-center" style={{ height: '8.18mm' }}>
                      <td className="border-r border-black text-center font-mono font-medium align-middle px-1">
                        {item.no || '\u00A0'}
                      </td>
                      <td className={`border-r border-black align-middle text-left px-3 ${isSub ? 'pl-6' : ''}`}>
                        {item.name || '\u00A0'}
                      </td>
                      <td className="border-r border-black text-center font-medium align-middle px-2">
                        {item.qty || '\u00A0'}
                      </td>
                      <td className="text-center text-slate-700 align-middle px-2">
                        {item.notes || '\u00A0'}
                      </td>
                    </tr>
                  );
                })}

                {/* Blank rows filling exactly up to 22 rows like template */}
                {Array.from({ length: blankFR31Count }).map((_, idx) => (
                  <tr key={`fr31-blank-${idx}`} className="border-b border-black h-[8.18mm]" style={{ height: '8.18mm' }}>
                    <td className="border-r border-black text-center align-middle">&nbsp;</td>
                    <td className="border-r border-black align-middle">&nbsp;</td>
                    <td className="border-r border-black text-center align-middle">&nbsp;</td>
                    <td className="text-center align-middle">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Bottom Split Section (Packaging Specs & Label Info - 4 rows x 6.5mm = 26mm) */}
            <div className="flex border-b border-black text-[11px] sm:text-xs shrink-0">
              {/* Left Column (Packaging Specs, ~70%) */}
              <div className="w-[70%] border-r border-black divide-y divide-black">
                <div className="h-[6.5mm] px-2 flex items-center">
                  <span className="font-bold w-28 shrink-0">จำนวนที่ผลิต :</span>
                  <span>{totalProduced}</span>
                </div>
                <div className="h-[6.5mm] px-2 flex items-center">
                  <span className="font-bold w-28 shrink-0">ขนาดการบรรจุ  :</span>
                  <span>{packSize}</span>
                </div>
                <div className="h-[6.5mm] px-2 flex items-center">
                  <span className="font-bold w-28 shrink-0">ชนิดบรรจุภัณฑ์ :</span>
                  <span>{packagingType}</span>
                </div>
                <div className="h-[6.5mm] px-2 flex items-center">
                  <span>&nbsp;</span>
                </div>
              </div>

              {/* Right Column (Label Info, ~30%) */}
              <div className="w-[30%] divide-y divide-black">
                <div className="h-[6.5mm] bg-[#e5e5e5] flex items-center justify-center font-bold">
                  การระบุฉลาก
                </div>
                <div className="h-[6.5mm] flex items-center">
                  <span className="w-16 px-1.5 font-bold border-r border-black shrink-0">LOT. :</span>
                  <span className="px-1.5 font-mono font-bold flex-1">{lotNo}</span>
                </div>
                <div className="h-[6.5mm] flex items-center">
                  <span className="w-16 px-1.5 font-bold border-r border-black shrink-0 underline text-blue-700">
                    MFD. :
                  </span>
                  <span className="px-1.5 font-mono flex-1">{mfdDate}</span>
                </div>
                <div className="h-[6.5mm] flex items-center">
                  <span className="w-16 px-1.5 font-bold border-r border-black shrink-0 underline text-blue-700">
                    EXP. :
                  </span>
                  <span className="px-1.5 font-mono flex-1">{expDate}</span>
                </div>
              </div>
            </div>

            {/* Signatures Section - Height 26mm */}
            <div className="h-[26mm] shrink-0 px-4 flex items-center text-[11px] sm:text-xs">
              <div className="grid grid-cols-2 gap-4 w-full">
                {/* Left: ผู้จัดทำ */}
                <div className="space-y-1 text-center">
                  <p>ผู้จัดทำ  : ..................................................</p>
                  <p>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
                  <p className="pt-0.5">
                    ตำแหน่ง : &nbsp;&nbsp;&nbsp;&nbsp;หัวหน้าแผนกผลิต
                  </p>
                </div>

                {/* Right: ผู้อนุมัติ */}
                <div className="space-y-1 text-center">
                  <p>ผู้อนุมัติ : .................................................</p>
                  <p>( &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; )</p>
                  <p className="pt-0.5">
                    ตำแหน่ง : &nbsp;&nbsp;&nbsp;&nbsp;ผู้จัดการฝ่ายโรงงาน
                  </p>
                </div>
              </div>
            </div>

            {/* Bottom Gray Footer Strip (matches template - Height 3.5mm) */}
            <div className="h-[3.5mm] shrink-0 bg-[#e5e5e5] border-t border-black"></div>
          </div>

          {/* Document Reference Footer outside border - Height 5mm */}
          <div className="h-[5mm] shrink-0 pt-1 text-right text-[10px] text-black font-mono">
            <span>FR 3-<span className="underline">1 : 2</span> : 01/11/60</span>
          </div>
        </div>
      )}

      {/* Spacer between forms on screen */}
      {activeTab === 'both' && (
        <div className="no-print py-4 flex items-center justify-center">
          <div className="h-px bg-slate-300 w-full" />
          <span className="px-4 text-xs font-semibold text-slate-500 whitespace-nowrap bg-slate-100 rounded-full py-1">
            แผ่นที่ 2 ของ A4 แนวตั้ง: ฟอร์มเบิก-จ่าย (FR 1-4)
          </span>
          <div className="h-px bg-slate-300 w-full" />
        </div>
      )}

      {/* ========================================================================= */}
      {/* FORM 2: ฟอร์มเบิก-จ่าย (FR 1-4) - หน้าตาตรงตามรูปที่ 2 เต็มแผ่น A4         */}
      {/* ========================================================================= */}
      {(activeTab === 'both' || activeTab === 'fr14') && (
        <div className="print-page print-page-2 bg-white p-4 sm:p-6 text-black font-sans leading-tight min-h-[283mm] print:p-0 print:m-0 print:w-full print:h-[283mm] print:max-h-[283mm] print:overflow-hidden print:flex print:flex-col print:justify-between shadow-md mb-8 rounded-lg print:shadow-none print:rounded-none">
          {/* Main Outer Box with 1.5px Solid Black Border - Height 276mm fits full A4 page */}
          <div className="border-[1.5px] border-black bg-white flex flex-col justify-between h-[276mm] max-h-[276mm] print:h-[276mm]">
            {/* Gray Header Banner */}
            <div className="bg-[#e5e5e5] h-[9mm] flex items-center justify-center border-b border-black shrink-0">
              <h1 className="text-sm sm:text-base font-bold text-black tracking-wide">
                ฟอร์มเบิก-จ่าย (FR 1-4)
              </h1>
            </div>

            {/* Meta Section (2 Rows) */}
            <div className="text-[11px] sm:text-xs text-black shrink-0">
              {/* Row 1: วัน/เดือน/ปี & เลขที่ (dotted bottom divider) */}
              <div className="h-[7.5mm] flex border-b border-dotted border-black px-2 items-center justify-between">
                <div className="flex items-center">
                  <span className="font-bold mr-1.5">วัน/เดือน/ปี  :</span>
                  <span>{prodDate}</span>
                </div>
                <div className="flex items-center pr-12 sm:pr-20">
                  <span className="font-bold mr-1.5">เลขที่ :</span>
                  <span className="font-mono">{orderNumber}</span>
                </div>
              </div>

              {/* Row 2: การเบิกวัตถุดิบเพื่อการผลิต, รุ่นการผลิต, เลขที่การผลิต (solid bottom divider) */}
              <div className="h-[8.5mm] flex flex-wrap items-center justify-between border-b border-black px-2 gap-y-1">
                <div className="flex items-center">
                  <span className="font-bold mr-1.5">การเบิกวัตถุดิบเพื่อการผลิต :</span>
                  <span className="font-semibold">{productName}</span>
                </div>
                <div className="flex items-center">
                  <span className="font-bold mr-1.5">รุ่นการผลิต (Lot No.) :</span>
                  <span className="font-bold font-mono">{lotNo}</span>
                </div>
                <div className="flex items-center pr-6">
                  <span className="underline text-blue-700 font-bold mr-1.5">เลขที่การผลิต :</span>
                  <span className="font-mono">{orderNumber}</span>
                </div>
              </div>
            </div>

            {/* Table of Requisition & Issuance (36 rows x 5.85mm = 210.6mm) */}
            <table className="w-full text-[11px] sm:text-xs border-collapse border-b border-black table-fixed flex-1">
              <thead>
                {/* Level 1 Group Header */}
                <tr className="border-b border-black text-center font-bold h-[6.5mm]">
                  <th colSpan={3} className="border-r border-black align-middle">
                    รายการเบิก
                  </th>
                  <th colSpan={3} className="align-middle">
                    รายการจ่าย
                  </th>
                </tr>

                {/* Level 2 Column Headers */}
                <tr className="border-b border-black text-center font-bold h-[9mm]">
                  <th className="w-10 border-r border-black font-bold align-middle">ลำดับ</th>
                  <th className="border-r border-black text-center font-bold align-middle">ชื่อวัตถุดิบ</th>
                  <th className="w-20 sm:w-24 border-r border-black text-center font-bold align-middle">
                    จำนวนเบิก
                  </th>
                  <th className="w-24 sm:w-28 border-r border-black text-center font-bold align-middle leading-tight">
                    วัตถุดิบ
                    <br />
                    Lot No.
                  </th>
                  <th className="w-20 sm:w-24 border-r border-black text-center font-bold align-middle">
                    จำนวนจ่าย
                  </th>
                  <th className="w-32 sm:w-40 text-center font-bold align-middle leading-tight">
                    ใช้งานเครื่องชั่ง
                    <br />
                    <span className="underline text-blue-700 font-bold">(PD-BLA-.......)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {fr14Rows.map((row, idx) => {
                  const isSub = row.no.includes('.');
                  return (
                    <tr
                      key={`fr14-row-${idx}`}
                      className="border-b border-dotted border-black h-[5.85mm]"
                      style={{ height: '5.85mm' }}
                    >
                      <td className="border-r border-black text-center font-mono align-middle px-1">
                        {row.no || '\u00A0'}
                      </td>
                      <td className={`border-r border-black align-middle text-left px-2 ${isSub ? 'pl-5' : ''}`}>
                        {row.name || '\u00A0'}
                      </td>
                      <td className="border-r border-black text-center font-medium align-middle px-1">
                        {row.reqQty || '\u00A0'}
                      </td>
                      <td className="border-r border-black text-center font-mono font-bold align-middle px-1">
                        {row.lotNo || '\u00A0'}
                      </td>
                      <td className="border-r border-black text-center font-bold align-middle px-1">
                        {row.issueQty || '\u00A0'}
                      </td>
                      <td className="text-center font-mono text-[10px] align-middle px-1">
                        {row.scale || '\u00A0'}
                      </td>
                    </tr>
                  );
                })}

                {/* Blank dotted rows filling up to 36 rows matching template */}
                {Array.from({ length: blankFR14Count }).map((_, idx) => (
                  <tr
                    key={`fr14-blank-${idx}`}
                    className="border-b border-dotted border-black h-[5.85mm]"
                    style={{ height: '5.85mm' }}
                  >
                    <td className="border-r border-black text-center align-middle">&nbsp;</td>
                    <td className="border-r border-black align-middle">&nbsp;</td>
                    <td className="border-r border-black text-center align-middle">&nbsp;</td>
                    <td className="border-r border-black text-center align-middle">&nbsp;</td>
                    <td className="border-r border-black text-center align-middle">&nbsp;</td>
                    <td className="text-center align-middle">&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Signatures Section (3 Columns with vertical dividers - Height 25mm) */}
            <div className="h-[25mm] shrink-0 grid grid-cols-3 divide-x divide-black text-[11px] sm:text-xs border-t border-black">
              {/* Col 1: ผู้เบิกและตรวจสอบ */}
              <div className="p-2 py-3 space-y-1">
                <p>ผู้เบิกและตรวจสอบ : ....................................</p>
                <p className="pt-0.5">
                  ตำแหน่ง : &nbsp;&nbsp;&nbsp;&nbsp;หัวหน้าแผนกผลิต
                </p>
              </div>

              {/* Col 2: ผู้จ่าย */}
              <div className="p-2 py-3 space-y-1">
                <p>ผู้จ่าย : ....................................</p>
                <p className="pt-0.5">
                  ตำแหน่ง : &nbsp;&nbsp;&nbsp;&nbsp;หัวหน้าแผนกคลังสินค้า
                </p>
              </div>

              {/* Col 3: ผู้จัดเตรียม */}
              <div className="p-2 py-3 space-y-1">
                <p>ผู้จัดเตรียม : ....................................</p>
                <p className="pt-0.5">
                  ตำแหน่ง : &nbsp;&nbsp;&nbsp;&nbsp;พนักงานแผนกคลังสินค้า
                </p>
              </div>
            </div>
          </div>

          {/* Document Reference Footer outside border - Height 5mm */}
          <div className="h-[5mm] shrink-0 pt-1 text-right text-[10px] text-black font-mono">
            <span>FR 1-<span className="underline">4 : 5</span> : 01/05/67</span>
          </div>
        </div>
      )}
    </div>
  );
}

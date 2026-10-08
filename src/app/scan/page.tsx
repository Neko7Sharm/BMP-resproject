'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ScanLine, Upload, Loader2, CheckCircle2, AlertCircle, Edit2,
  Save, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Database,
  ChevronDown, Plus, Trash2, X, Image, Info, Eye, Check,
  ArrowRight, Package, History, Sparkles, Zap
} from 'lucide-react';
import { useScan, StockRow, ScanResult } from '@/context/ScanContext';
import { optimizeImageForOCR } from '@/lib/imageOptimizer';

interface Section { id: string; code: string; name: string; }
interface Material {
  id: string;
  code: string;
  name: string;
  baseUnit: string;
  sectionId: string | null;
  section?: Section | null;
}

// ---------- Main Page ----------
export default function ScanPage() {
  const {
    isAnalyzing,
    analyzeProgress,
    analyzeStepText,
    scanResult,
    engine,
    engineMsg,
    errorMsg,
    imageURL,
    imageBase64,
    imageMime,
    imageStats,
    showKeyModal,
    keyModalReason,
    openKeyModal,
    closeKeyModal,
    setImageData,
    startScan,
    setScanResult,
    setErrorMsg,
    resetScan,
  } = useScan();

  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [commitDone, setCommitDone]   = useState(false);
  const [commitStats, setCommitStats] = useState<any>(null);
  const [zoom, setZoom] = useState(100);
  const [sections, setSections] = useState<Section[]>([]);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [isDragging, setIsDragging]   = useState(false);
  const [hasApiKey, setHasApiKey]     = useState<boolean | null>(null);
  const [systemKeyAvailable, setSystemKeyAvailable] = useState(false);
  const [sharedKeyAvailable, setSharedKeyAvailable] = useState(false);
  const [keyInput, setKeyInput] = useState('');
  const [keyError, setKeyError] = useState<string | null>(null);
  const [isSavingKey, setIsSavingKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sections & materials on mount; check API status
  useEffect(() => {
    fetch('/api/sections').then(r => r.json()).then(d => setSections(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/materials').then(r => r.json()).then(d => setMaterials(Array.isArray(d) ? d : [])).catch(() => {});
    refreshKeyStatus();
  }, []);

  // When user selects an existing material from dropdown
  const handleSelectMaterial = (matId: string, currentScan: ScanResult | null) => {
    setSelectedMaterialId(matId);
    if (!matId) return;

    const matched = materials.find(m => m.id === matId);
    if (matched) {
      if (matched.sectionId) {
        setSelectedSectionId(matched.sectionId);
      }
      if (currentScan) {
        setScanResult({
          ...currentScan,
          materialName: matched.name,
          unit: matched.baseUnit || currentScan.unit,
        });
      }
    }
  };

  // Auto match scanned material name to existing material
  const autoMatchMaterial = (scannedName: string, currentMaterials: Material[], resData: ScanResult) => {
    const cleanScanned = scannedName.toLowerCase().replace(/\s+/g, '');
    const matched = currentMaterials.find(m => {
      const cleanExisting = m.name.toLowerCase().replace(/\s+/g, '');
      return cleanExisting === cleanScanned ||
             cleanExisting.includes(cleanScanned) ||
             cleanScanned.includes(cleanExisting);
    });

    if (matched) {
      setSelectedMaterialId(matched.id);
      if (matched.sectionId) {
        setSelectedSectionId(matched.sectionId);
      }
      resData.materialName = matched.name;
      if (matched.baseUnit) resData.unit = matched.baseUnit;
    }
  };

  // Read file → optimize on client (downscale to max 2048px + JPEG 85%) → store in ScanContext
  const processFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) { setErrorMsg('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)'); return; }
    if (file.size > 20 * 1024 * 1024) { setErrorMsg('ไฟล์ใหญ่เกิน 20MB กรุณาลดขนาดก่อนอัปโหลด'); return; }
    setErrorMsg(null); setCommitDone(false); setCommitStats(null);
    setSelectedMaterialId(''); setSelectedSectionId('');
    setIsOptimizing(true);

    try {
      const opt = await optimizeImageForOCR(file);
      setImageData(opt.previewUrl, opt.base64, opt.mimeType, {
        originalKB: opt.originalSizeKB,
        optimizedKB: opt.optimizedSizeKB,
      });
    } catch (err: any) {
      console.error('Image optimization error:', err);
      // Fallback: load raw
      const url = URL.createObjectURL(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        const b64 = (e.target?.result as string).replace(/^data:image\/\w+;base64,/, '');
        setImageData(url, b64, file.type);
      };
      reader.readAsDataURL(file);
    } finally {
      setIsOptimizing(false);
    }
  }, [setErrorMsg, setImageData]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const refreshKeyStatus = () => {
    fetch('/api/ai/ocr-stock-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CHECK_KEY' }) })
      .then(r => r.json())
      .then(d => {
        setHasApiKey(d.hasApiKey === true);
        setSystemKeyAvailable(d.systemKeyAvailable === true);
        setSharedKeyAvailable(d.sharedKeyAvailable === true);
      })
      .catch(() => setHasApiKey(false));
  };

  const handleSaveKeyAndRetry = async () => {
    if (!keyInput.trim()) return;
    setIsSavingKey(true);
    setKeyError(null);
    try {
      const res = await fetch('/api/settings/apikey', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: keyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { setKeyError(data.error || 'บันทึก API Key ไม่สำเร็จ'); return; }
      closeKeyModal();
      setKeyInput('');
      refreshKeyStatus();
      // สแกนต่อทันทีด้วยรูปเดิม (ไม่ต้องอัปโหลดใหม่)
      if (imageBase64) startScan();
    } catch (e: any) {
      setKeyError(e.message);
    } finally {
      setIsSavingKey(false);
    }
  };

  // Analyze image via AI (Delegates to global ScanContext so it keeps running in background)
  const handleAnalyze = async () => {
    const success = await startScan();
    // Auto-match material after successful scan if materialName detected
    // Note: scanResult will be set by context, matching is handled reactively
  };

  // Reactively auto match material when scanResult appears or changes
  useEffect(() => {
    if (scanResult?.materialName && materials.length > 0 && !selectedMaterialId) {
      autoMatchMaterial(scanResult.materialName, materials, scanResult);
    }
  }, [scanResult, materials, selectedMaterialId]);

  // Edit a cell in the staging table
  const updateRow = (rowId: string, field: keyof StockRow, value: string | number) => {
    if (!scanResult) return;
    setScanResult({
      ...scanResult,
      rows: scanResult.rows.map(r => r.id === rowId ? { ...r, [field]: value } : r),
    });
  };

  const deleteRow = (rowId: string) => {
    if (!scanResult) return;
    setScanResult({ ...scanResult, rows: scanResult.rows.filter(r => r.id !== rowId) });
  };

  // Normalize date input to DD/MM/YYYY with 4-digit CE year
  const normalizeDateToCE = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    // YYYY-MM-DD
    const isoMatch = trimmed.match(/^(\d{2,4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
    if (isoMatch && parseInt(isoMatch[1]) > 31) {
      let y = parseInt(isoMatch[1]);
      if (y > 2400) y -= 543;
      else if (y < 100) y = y >= 40 ? (y + 2500) - 543 : 2000 + y;
      const m = String(parseInt(isoMatch[2])).padStart(2, '0');
      const d = String(parseInt(isoMatch[3])).padStart(2, '0');
      return `${d}/${m}/${y}`;
    }
    // DD/MM/YYYY
    const dmyMatch = trimmed.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/);
    if (dmyMatch) {
      const d = String(parseInt(dmyMatch[1])).padStart(2, '0');
      const m = String(parseInt(dmyMatch[2])).padStart(2, '0');
      let y = parseInt(dmyMatch[3]);
      if (y > 2400) y -= 543;
      else if (y < 100) y = y >= 40 ? (y + 2500) - 543 : 2000 + y;
      return `${d}/${m}/${y}`;
    }
    return trimmed;
  };

  // Normalize expDate input to DD-MM-YYYY with 4-digit CE year
  const normalizeExpDateToCE = (val: string): string => {
    if (!val) return '';
    const trimmed = val.trim();
    // YYYY-MM-DD or YYYY/MM/DD (year first, > 31)
    const isoMatch = trimmed.match(/^(\d{2,4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
    if (isoMatch && parseInt(isoMatch[1]) > 31) {
      let y = parseInt(isoMatch[1]);
      if (y > 2400) y -= 543;
      else if (y < 100) y = y >= 40 ? (y + 2500) - 543 : 2000 + y;
      const m = String(parseInt(isoMatch[2])).padStart(2, '0');
      const d = String(parseInt(isoMatch[3])).padStart(2, '0');
      return `${d}-${m}-${y}`;
    }
    // DD/MM/YYYY or DD-MM-YYYY (day first, year last > 1000)
    const dmyMatch = trimmed.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/);
    if (dmyMatch) {
      const d = String(parseInt(dmyMatch[1])).padStart(2, '0');
      const m = String(parseInt(dmyMatch[2])).padStart(2, '0');
      let y = parseInt(dmyMatch[3]);
      if (y > 2400) y -= 543;
      else if (y < 100) y = y >= 40 ? (y + 2500) - 543 : 2000 + y;
      return `${d}-${m}-${y}`;
    }
    return trimmed;
  };

  // เปลี่ยนปีในสตริงวันที่ (รองรับทั้ง DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY)
  const replaceYearInDate = (dateStr: string, newYear: number): string => {
    if (!dateStr || !newYear) return dateStr;
    const trimmed = dateStr.trim();
    // แมตช์ วัน/เดือน/ปี เช่น 07/08/2026 หรือ 07-08-2025
    const m = trimmed.match(/^(\d{1,2})([-\/\.])(\d{1,2})([-\/\.])(\d{2,4})$/);
    if (m) {
      const d = m[1].padStart(2, '0');
      const sep1 = m[2];
      const mo = m[3].padStart(2, '0');
      const sep2 = m[4];
      return `${d}${sep1}${mo}${sep2}${newYear}`;
    }
    return dateStr;
  };

  // อัปเดตปีของใบ และปรับปีของวันผลิต (date) ในทุกแถวตามปีใหม่ทันที
  const updateFormYear = (newYear: number | null, cardNoOverride?: string) => {
    if (!scanResult) return;
    const targetCardNo = cardNoOverride !== undefined ? cardNoOverride : scanResult.cardNo;
    const sheet = scanResult.sheetNumber || '';
    const newYearInfo = newYear ? `ปี ค.ศ. ${newYear}${sheet ? ` (ใบที่ ${sheet})` : ''}` : '';

    // ถ้ามีการระบุปี ค.ศ. 4 หลักที่ถูกต้อง ให้แก้ปีของวันผลิต (date) ในทุกรายการด้วย
    const updatedRows = (newYear && newYear >= 1900 && newYear <= 2100)
      ? scanResult.rows.map(r => ({
          ...r,
          date: replaceYearInDate(r.date, newYear),
        }))
      : scanResult.rows;

    setScanResult({
      ...scanResult,
      cardNo: targetCardNo,
      formYear: newYear,
      formYearInfo: newYearInfo,
      rows: updatedRows,
    });
  };

  // Parse card number (e.g. 01/26 -> sheet 01, year 2026)
  const parseCardNoInfo = (val: string) => {
    if (!val) return { sheet: '', year: null, text: '' };
    const m = val.trim().match(/^([A-Za-z0-9\.\-]+)\s*[\/\-]\s*(\d{2,4})$/);
    if (m) {
      const sheet = m[1];
      let rawY = parseInt(m[2]);
      if (rawY > 2400) rawY -= 543;
      else if (rawY < 100) rawY = rawY >= 40 ? (rawY + 2500) - 543 : 2000 + rawY;
      return {
        sheet,
        year: rawY,
        text: `ใบที่ ${sheet} ของปี ค.ศ. ${rawY}`,
      };
    }
    return { sheet: '', year: null, text: '' };
  };

  const handleCardNoChange = (newVal: string) => {
    if (!scanResult) return;
    const parsed = parseCardNoInfo(newVal);
    if (parsed.year !== null) {
      // ถ้าพบปีจากเลขที่ใบ เช่น 01/26 -> อัปเดตปีและปรับวันผลิตทุกแถวอัตโนมัติ
      updateFormYear(parsed.year, newVal);
    } else {
      setScanResult({
        ...scanResult,
        cardNo: newVal,
      });
    }
  };

  const addRow = () => {
    if (!scanResult) return;
    const now = new Date();
    const d = String(now.getDate()).padStart(2, '0');
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const y = now.getFullYear();
    const newRow: StockRow = {
      id: `r-${Date.now()}`,
      date: `${d}/${m}/${y}`,
      lotNumber: '', inboundQty: 0, outboundQty: 0, balanceQty: 0, totalQty: 0, expDate: '', remarks: '',
    };
    setScanResult({ ...scanResult, rows: [...scanResult.rows, newRow] });
  };

  // Commit to DB
  const handleCommit = async () => {
    if (!scanResult) return;
    if (!window.confirm(`ยืนยันการนำเข้า ${scanResult.rows.length} รายการเข้าฐานข้อมูลใช่หรือไม่?`)) return;
    setIsCommitting(true); setErrorMsg(null);
    try {
      const res = await fetch('/api/ai/ocr-stock-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'COMMIT',
          dataToCommit: {
            materialId: selectedMaterialId || null,
            materialName: scanResult.materialName,
            baseUnit: scanResult.unit,
            sectionId: selectedSectionId || null,
            documentRef: scanResult.cardNo ? `STOCK-CARD-${scanResult.cardNo}` : 'STOCK-CARD-IMPORT',
            creator: scanResult.creator,
            formYear: scanResult.formYear || null,
            rows: scanResult.rows,
          },
        }),
      });
      const data = await res.json();
      if (!res.ok) { setErrorMsg(data.error || 'บันทึกข้อมูลไม่สำเร็จ'); return; }
      setCommitDone(true); setCommitStats(data);
    } catch (e: any) {
      setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + e.message);
    } finally {
      setIsCommitting(false);
    }
  };

  const resetAll = () => {
    resetScan();
    setCommitDone(false); setCommitStats(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ---------- Render ----------
  const currentStep = commitDone ? 4 : scanResult ? 3 : (isAnalyzing || imageURL) ? 2 : 1;

  return (
    <div className="space-y-5 pb-20 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <ScanLine className="w-5 h-5 text-purple-600" />
            AI สแกน Stock Card
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            อัปโหลดภาพใบสต็อกการ์ด → AI ตรวจจับตาราง & ลายมือไทย → ตรวจสอบก่อนบันทึกจริง
          </p>
        </div>
        {scanResult && (
          <button onClick={resetAll} className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition">
            <RefreshCw className="w-3.5 h-3.5" />
            <span>สแกนใหม่</span>
          </button>
        )}
      </div>

      {/* Step Indicator */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 sm:p-4 shadow-2xs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          {[
            { step: 1, title: 'อัปโหลดภาพ', desc: 'JPG/PNG Stock Card' },
            { step: 2, title: 'วิเคราะห์ AI', desc: 'ถอดตาราง & ลายมือ' },
            { step: 3, title: 'ตรวจทาน & แก้ไข', desc: 'ตารางพร้อมแก้ inline' },
            { step: 4, title: 'บันทึกสต็อก', desc: 'อัปเดตลงฐานข้อมูล' },
          ].map((s) => {
            const isDone = currentStep > s.step;
            const isCurrent = currentStep === s.step;
            return (
              <div
                key={s.step}
                className={`flex items-center gap-2.5 p-2 sm:p-2.5 rounded-xl transition ${
                  isCurrent
                    ? 'bg-purple-50/80 border border-purple-200 shadow-2xs'
                    : isDone
                    ? 'bg-emerald-50/50 border border-emerald-100'
                    : 'bg-slate-50/60 border border-transparent opacity-60'
                }`}
              >
                <div
                  className={`w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 transition ${
                    isDone
                      ? 'bg-emerald-600 text-white'
                      : isCurrent
                      ? 'bg-purple-600 text-white shadow-xs shadow-purple-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {isDone ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : s.step}
                </div>
                <div className="min-w-0">
                  <div className={`text-xs font-bold truncate ${isCurrent ? 'text-purple-950' : isDone ? 'text-emerald-950' : 'text-slate-700'}`}>
                    {s.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {s.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Status */}
      {hasApiKey === false && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-900 flex-1">
            <strong>ยังไม่มี Gemini API Key ในระบบ</strong> — ใส่ key ครั้งเดียว ทุกคนที่ใช้งานจะใช้สแกนร่วมกันได้ทันที
          </div>
          <button
            onClick={() => openKeyModal('ยังไม่มี API Key ในระบบ กรุณาใส่ key เพื่อเปิดใช้งานการสแกน')}
            className="shrink-0 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition"
          >
            ใส่ API Key
          </button>
        </div>
      )}
      {hasApiKey === true && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <strong>Gemini AI พร้อมใช้งาน</strong>
          <span className="flex-1">— {sharedKeyAvailable && !systemKeyAvailable ? 'ใช้ API Key กลางที่ตั้งไว้ในระบบ' : 'ใช้ API ของระบบ'}</span>
          <button
            onClick={() => openKeyModal('เปลี่ยน API Key กลางที่ใช้ร่วมกันทุกคน')}
            className="shrink-0 underline text-emerald-700 hover:text-emerald-900"
          >
            เปลี่ยน key
          </button>
        </div>
      )}

      {/* Error */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
          <div className="text-sm text-rose-800 flex-1">{errorMsg}</div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-600">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Commit Success */}
      {commitDone && commitStats && (
        <div className="p-5 bg-gradient-to-br from-emerald-50 via-teal-50 to-emerald-100/70 border border-emerald-200 rounded-2xl shadow-sm">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md shadow-emerald-200">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-200/80 text-emerald-800 mb-1">
                  นำเข้าข้อมูลสมบูรณ์
                </span>
                <h3 className="font-extrabold text-emerald-950 text-base">
                  บันทึกข้อมูล Stock Card สำเร็จเรียบร้อย!
                </h3>
                <p className="text-xs text-emerald-800 mt-0.5">
                  วัตถุดิบ: <strong className="text-emerald-950">{commitStats.materialName}</strong> •{' '}
                  สร้าง/ปรับปรุง <strong className="text-emerald-950">{commitStats.createdLots} ล็อต</strong> •{' '}
                  บันทึกความเคลื่อนไหว <strong className="text-emerald-950">{commitStats.importedTransactions} รายการ</strong>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <button
                onClick={resetAll}
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                สแกนใบถัดไป
              </button>
              <Link
                href="/inventory"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <Package className="w-3.5 h-3.5 text-blue-600" />
                ดูสต็อกในคลัง
              </Link>
              <Link
                href="/transactions"
                className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-xs"
              >
                <History className="w-3.5 h-3.5 text-slate-600" />
                ดูประวัติสต็อก
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Two-column layout: Image viewer | Staging data */}
      <div className={`grid grid-cols-1 ${scanResult ? 'lg:grid-cols-2' : ''} gap-6 items-start`}>

        {/* ---- LEFT: Image upload + preview ---- */}
        <div className="space-y-4">
          {!imageURL ? (
            /* Drop zone */
            <div
              onDragEnter={() => setIsDragging(true)}
              onDragLeave={() => setIsDragging(false)}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center gap-4 cursor-pointer transition ${
                isDragging ? 'border-purple-400 bg-purple-50' : 'border-slate-300 hover:border-purple-400 hover:bg-slate-50'
              }`}
            >
              <div className="w-16 h-16 rounded-2xl bg-purple-100 flex items-center justify-center">
                <Image className="w-8 h-8 text-purple-500" />
              </div>
              <div className="text-center">
                <p className="text-base font-semibold text-slate-700">ลากรูปมาวางที่นี่</p>
                <p className="text-sm text-slate-400 mt-1">หรือคลิกเพื่อเลือกไฟล์รูปภาพ Stock Card</p>
                <p className="text-xs text-slate-400 mt-1">รองรับ JPG, PNG, WEBP ขนาดไม่เกิน 12MB</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-semibold hover:bg-purple-700 transition">
                <Upload className="w-4 h-4" />
                <span>เลือกไฟล์รูป</span>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelect} />
            </div>
          ) : (
            /* Image viewer */
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              {/* Toolbar */}
              <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5 truncate">
                    <Image className="w-3.5 h-3.5 text-purple-500 shrink-0" />
                    ภาพ Stock Card
                  </span>
                  {imageStats && (
                    <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800" title={`ขนาดเดิม ${imageStats.originalKB} KB ปรับเหลือ ${imageStats.optimizedKB} KB เพื่อเร่งความเร็ว AI`}>
                      <Zap className="w-3 h-3 text-emerald-600" />
                      ลดเหลือ {imageStats.optimizedKB} KB (เร็วขึ้น)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setZoom(z => Math.max(50, z - 20))} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ZoomOut className="w-3.5 h-3.5" /></button>
                  <span className="text-xs font-mono text-slate-600 w-10 text-center">{zoom}%</span>
                  <button onClick={() => setZoom(z => Math.min(200, z + 20))} className="p-1.5 rounded hover:bg-slate-200 text-slate-600"><ZoomIn className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setZoom(100)} className="p-1.5 rounded hover:bg-slate-200 text-slate-600" title="รีเซ็ตซูม"><RotateCcw className="w-3.5 h-3.5" /></button>
                  <div className="w-px h-4 bg-slate-200 mx-1" />
                  <button onClick={resetAll} className="p-1.5 rounded hover:bg-rose-100 text-rose-500" title="ลบรูป"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
              {/* Image */}
              <div className="overflow-auto max-h-[70vh] bg-slate-100">
                <div className="p-3 inline-block min-w-full">
                  <img
                    src={imageURL}
                    alt="Stock Card"
                    style={{ width: `${zoom}%`, maxWidth: 'none' }}
                    className="rounded-lg shadow-sm cursor-zoom-in"
                    onClick={() => setZoom(z => z < 150 ? z + 20 : 100)}
                  />
                </div>
              </div>
              {/* Analyze Button */}
              {!scanResult && (
                <div className="p-4 border-t border-slate-100 bg-white">
                  <button
                    onClick={handleAnalyze}
                    disabled={isAnalyzing || isOptimizing}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm shadow-purple-200"
                  >
                    {isOptimizing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />กำลังบีบอัดและเตรียมภาพ...</>
                    ) : isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />กำลังวิเคราะห์ภาพด้วย AI (รันในพื้นหลังได้)...</>
                    ) : (
                      <><ScanLine className="w-4 h-4" />วิเคราะห์ภาพด้วย AI</>
                    )}
                  </button>
                  {isAnalyzing && (
                    <div className="mt-4 p-4 bg-purple-50/70 border border-purple-100 rounded-xl space-y-2.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-purple-900 flex items-center gap-1.5">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                          กำลังประมวลผล {analyzeProgress}%
                        </span>
                        <span className="text-[11px] text-purple-600 font-mono font-semibold">
                          {analyzeProgress}%
                        </span>
                      </div>

                      {/* Progress Bar Container */}
                      <div className="w-full bg-purple-200/60 h-2.5 rounded-full overflow-hidden p-0.5">
                        <div
                          className="bg-gradient-to-r from-purple-600 via-indigo-600 to-purple-500 h-full rounded-full transition-all duration-300 ease-out shadow-xs"
                          style={{ width: `${analyzeProgress}%` }}
                        ></div>
                      </div>

                      <p className="text-[11px] text-slate-500 text-center truncate">
                        {analyzeStepText}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ---- RIGHT: Staging data (only when scan result exists) ---- */}
        {scanResult && (
          <div className="space-y-4">
            {/* Engine badge */}
            {engineMsg && (
              <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                engine === 'gemini-vision'
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-800'
                  : 'bg-amber-50 border border-amber-200 text-amber-800'
              }`}>
                {engine === 'gemini-vision'
                  ? <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                  : <Info className="w-4 h-4 shrink-0 mt-0.5" />
                }
                {engineMsg}
              </div>
            )}

            {/* Material info */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">ข้อมูลวัตถุดิบ (แก้ไขได้)</h3>
                <span className="text-xs text-slate-400">กรุณาตรวจสอบก่อนบันทึก</span>
              </div>
              <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 p-3 bg-purple-50/60 border border-purple-200/80 rounded-xl flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs font-bold text-purple-900 block mb-1">
                      📦 เป็นวัตถุดิบเดิมที่มีในคลังอยู่แล้วหรือไม่?
                    </label>
                    <select
                      value={selectedMaterialId}
                      onChange={e => handleSelectMaterial(e.target.value, scanResult)}
                      className="w-full px-3 py-2 text-sm font-semibold border border-purple-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none bg-white text-slate-800"
                    >
                      <option value="">-- ไม่ใช่ / สร้างวัตถุดิบใหม่ --</option>
                      {materials.map(m => (
                        <option key={m.id} value={m.id}>
                          {m.code} — {m.name} ({m.baseUnit}) {m.section ? `[โซน: ${m.section.name}]` : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedMaterialId && (
                    <div className="text-xs text-purple-700 bg-white/80 px-3 py-2 rounded-lg border border-purple-100 flex items-center gap-1.5 self-stretch sm:self-auto">
                      <CheckCircle2 className="w-4 h-4 text-purple-600 shrink-0" />
                      <span>ใช้ชื่อ, หน่วยนับ และโซนคลังเดิมอัตโนมัติ</span>
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    ชื่อวัตถุดิบ {selectedMaterialId && <span className="text-purple-600 font-normal">(อ้างอิงจากคลังเดิม)</span>}
                  </label>
                  <input
                    type="text"
                    value={scanResult.materialName}
                    disabled={!!selectedMaterialId}
                    onChange={e => setScanResult({ ...scanResult, materialName: e.target.value })}
                    className={`w-full px-3 py-2 text-sm font-bold border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none ${
                      selectedMaterialId ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">หน่วยนับ</label>
                  <input
                    type="text"
                    value={scanResult.unit}
                    disabled={!!selectedMaterialId}
                    onChange={e => setScanResult({ ...scanResult, unit: e.target.value })}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none ${
                      selectedMaterialId ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed' : 'bg-white border-slate-200'
                    }`}
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    โซนคลัง {selectedMaterialId && <span className="text-purple-600 font-normal">(โซนเดิม)</span>}
                  </label>
                  <select
                    value={selectedSectionId}
                    disabled={!!selectedMaterialId}
                    onChange={e => setSelectedSectionId(e.target.value)}
                    className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 outline-none ${
                      selectedMaterialId ? 'bg-slate-100 border-slate-200 text-slate-700 cursor-not-allowed' : 'bg-white border-slate-200'
                    }`}
                  >
                    <option value="">-- ไม่ระบุโซน --</option>
                    {sections.map(s => (
                      <option key={s.id} value={s.id}>{s.code} — {s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-600">เลขที่ของฟอร์ม / ใบการ์ด</label>
                    {scanResult.formYearInfo && (
                      <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full border border-purple-200">
                        {scanResult.formYearInfo}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={scanResult.cardNo}
                    placeholder="เช่น 01/26 หรือ 006/26"
                    onChange={e => handleCardNoChange(e.target.value)}
                    className="w-full px-3 py-2 text-sm font-mono font-bold text-slate-800 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    เช่น <span className="font-mono font-semibold text-purple-700">01/26</span> = ใบที่ 1 ของปี ค.ศ. 2026
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">
                    ปีที่ผลิต / ปีของฟอร์ม (ค.ศ.)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={scanResult.formYear ?? ''}
                      placeholder="เช่น 2026"
                      onChange={e => {
                        const val = e.target.value.trim();
                        const y = val ? parseInt(val) : null;
                        updateFormYear(y);
                      }}
                      className="w-full px-3 py-2 text-sm font-bold font-mono text-purple-900 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-[11px] font-bold text-slate-400">
                      ค.ศ.
                    </span>
                  </div>
                  <p className="text-[10px] text-purple-600 font-medium mt-1">
                    ✨ เมื่อเปลี่ยนปี ระบบจะแก้วันผลิตของทุกรายการในตารางให้อัตโนมัติ
                  </p>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">ผู้จัดทำ</label>
                  <input
                    type="text"
                    value={scanResult.creator}
                    placeholder="เช่น แสงอรุณ ศรีสุข"
                    onChange={e => setScanResult({ ...scanResult, creator: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 block mb-1">ตำแหน่ง</label>
                  <input
                    type="text"
                    value={scanResult.position}
                    placeholder="เช่น หัวหน้าแผนกคลังสินค้า"
                    onChange={e => setScanResult({ ...scanResult, position: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Staging table */}
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  รายการเคลื่อนไหว ({scanResult.rows.length} แถว)
                </h3>
                <button onClick={addRow} className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800 px-2 py-1 rounded hover:bg-purple-50 transition">
                  <Plus className="w-3.5 h-3.5" />เพิ่มแถว
                </button>
              </div>
              <div className="overflow-x-auto max-h-[55vh] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-slate-50 border-b border-slate-100 sticky top-0">
                    <tr>
                      {['#', 'วันที่', 'Lot No.', 'รับเข้า', 'จ่ายออก', 'คงเหลือ/Lot', 'รวมทั้งหมด', 'EXP Date', 'หมายเหตุ', ''].map(h => (
                        <th key={h} className="px-2 py-2 text-left font-semibold text-slate-600 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {scanResult.rows.map((row, idx) => (
                      <tr key={row.id} className="hover:bg-purple-50/40 transition">
                        {/* Row Number */}
                        <td className="px-2 py-1.5 text-center text-slate-400 font-mono text-[11px] w-8">
                          {idx + 1}
                        </td>
                        {/* Date */}
                        <td className="px-1.5 py-1">
                          <input
                            type="text"
                            value={row.date}
                            placeholder="วว/ดด/ค.ศ."
                            onChange={e => updateRow(row.id, 'date', e.target.value)}
                            onBlur={e => updateRow(row.id, 'date', normalizeDateToCE(e.target.value))}
                            className="w-24 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 rounded text-xs font-mono outline-none transition"
                            title="วันที่ (ระบุเป็นปี ค.ศ. เช่น 07/08/2026)"
                          />
                        </td>
                        {/* Lot */}
                        <td className="px-1.5 py-1">
                          <input
                            type="text"
                            value={row.lotNumber}
                            placeholder="เช่น 100726"
                            onChange={e => updateRow(row.id, 'lotNumber', e.target.value)}
                            className="w-24 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 rounded text-xs font-bold font-mono text-purple-900 outline-none transition"
                          />
                        </td>
                        {/* Inbound */}
                        <td className="px-1.5 py-1">
                          <input
                            type="number"
                            value={row.inboundQty === 0 ? '' : row.inboundQty}
                            placeholder="0"
                            onChange={e => updateRow(row.id, 'inboundQty', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-emerald-500 rounded text-xs font-semibold text-emerald-700 text-right outline-none transition"
                          />
                        </td>
                        {/* Outbound */}
                        <td className="px-1.5 py-1">
                          <input
                            type="number"
                            value={row.outboundQty === 0 ? '' : row.outboundQty}
                            placeholder="0"
                            onChange={e => updateRow(row.id, 'outboundQty', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-rose-500 rounded text-xs font-semibold text-rose-600 text-right outline-none transition"
                          />
                        </td>
                        {/* Balance */}
                        <td className="px-1.5 py-1">
                          <input
                            type="number"
                            value={row.balanceQty === 0 ? '' : row.balanceQty}
                            placeholder="0"
                            onChange={e => updateRow(row.id, 'balanceQty', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 rounded text-xs text-slate-800 text-right outline-none transition"
                          />
                        </td>
                        {/* Total */}
                        <td className="px-1.5 py-1">
                          <input
                            type="number"
                            value={row.totalQty === 0 ? '' : row.totalQty}
                            placeholder="0"
                            onChange={e => updateRow(row.id, 'totalQty', parseFloat(e.target.value) || 0)}
                            className="w-20 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 rounded text-xs text-slate-500 text-right outline-none transition"
                          />
                        </td>
                        {/* EXP Date */}
                        <td className="px-1.5 py-1">
                          <input
                            type="text"
                            value={row.expDate}
                            placeholder="DD-MM-YYYY"
                            onChange={e => updateRow(row.id, 'expDate', e.target.value)}
                            onBlur={e => updateRow(row.id, 'expDate', normalizeExpDateToCE(e.target.value))}
                            className="w-28 px-2 py-1 bg-amber-50/60 hover:bg-white focus:bg-white border border-transparent hover:border-amber-300 focus:border-amber-500 rounded text-xs font-mono text-amber-900 outline-none transition"
                            title="วันหมดอายุ (ปี ค.ศ. เช่น 19-08-2027)"
                          />
                        </td>
                        {/* Remarks */}
                        <td className="px-1.5 py-1">
                          <input
                            type="text"
                            value={row.remarks}
                            placeholder="หมายเหตุ"
                            onChange={e => updateRow(row.id, 'remarks', e.target.value)}
                            className="w-32 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 rounded text-xs text-slate-600 outline-none transition"
                          />
                        </td>
                        {/* Actions */}
                        <td className="px-2 py-1.5 text-center">
                          <button
                            type="button"
                            onClick={() => deleteRow(row.id)}
                            className="p-1 text-slate-300 hover:text-rose-600 hover:bg-rose-50 rounded transition"
                            title="ลบแถวนี้"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Commit button */}
            {!commitDone && (
              <button
                onClick={handleCommit}
                disabled={isCommitting || scanResult.rows.length === 0}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition shadow-sm shadow-emerald-200"
              >
                {isCommitting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />กำลังบันทึกลงฐานข้อมูล...</>
                  : <><Database className="w-4 h-4" />บันทึก {scanResult.rows.length} รายการลงฐานข้อมูล</>
                }
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── Modal: ใส่ Gemini API Key (ใช้ร่วมกันทุกคน เก็บใน DB) ── */}
      {showKeyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">ต้องใช้ Gemini API Key</h3>
                <p className="text-xs text-amber-700 mt-1">{keyModalReason}</p>
              </div>
              <button onClick={closeKeyModal} className="text-slate-400 hover:text-slate-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 mb-3">
              ใส่ key ครั้งเดียว ระบบจะเก็บไว้ให้ <strong>ทุกคนที่ใช้งานเว็บนี้ใช้ร่วมกัน</strong> สร้าง key ฟรีได้ที่{' '}
              <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
                Google AI Studio
              </a>
            </div>

            <input
              type="password"
              autoComplete="off"
              placeholder="วาง Gemini API Key ที่นี่"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              className="w-full px-3 py-2.5 text-sm font-mono border border-slate-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
            />
            {keyError && <p className="text-xs text-rose-600 mt-2">{keyError}</p>}

            <div className="flex gap-2.5 mt-4">
              <button
                onClick={closeKeyModal}
                className="flex-1 px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleSaveKeyAndRetry}
                disabled={isSavingKey || !keyInput.trim()}
                className="flex-1 px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition"
              >
                {isSavingKey ? 'กำลังตรวจสอบ...' : 'บันทึกและสแกนต่อ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

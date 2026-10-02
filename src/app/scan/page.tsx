'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import {
  ScanLine, Upload, Loader2, CheckCircle2, AlertCircle, Edit2,
  Save, RefreshCw, ZoomIn, ZoomOut, RotateCcw, Database,
  ChevronDown, Plus, Trash2, X, Image, Info, Eye, Check,
  ArrowRight, Package, History
} from 'lucide-react';

// ---------- Types ----------
interface StockRow {
  id: string;
  date: string;
  lotNumber: string;
  inboundQty: number;
  outboundQty: number;
  balanceQty: number;
  totalQty: number;
  expDate: string;
  remarks: string;
}

interface ScanResult {
  materialName: string;
  unit: string;
  cardNo: string;
  creator: string;
  position: string;
  rows: StockRow[];
}

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
  const [imageURL, setImageURL] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string>('');
  const [imageMime, setImageMime] = useState<string>('image/jpeg');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [engine, setEngine]           = useState<string>('');
  const [engineMsg, setEngineMsg]     = useState<string>('');
  const [errorMsg, setErrorMsg]       = useState<string | null>(null);
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
  const [analyzeProgress, setAnalyzeProgress] = useState(0);
  const [analyzeStepText, setAnalyzeStepText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load sections & materials on mount; check API status
  useEffect(() => {
    fetch('/api/sections').then(r => r.json()).then(d => setSections(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/materials').then(r => r.json()).then(d => setMaterials(Array.isArray(d) ? d : [])).catch(() => {});
    fetch('/api/ai/ocr-stock-card', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'CHECK_KEY' }) })
      .then(r => r.json())
      .then(d => setHasApiKey(d.hasApiKey === true))
      .catch(() => setHasApiKey(false));
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

  // Read file → base64 + preview URL
  const processFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setErrorMsg('รองรับเฉพาะไฟล์รูปภาพ (JPG, PNG, WEBP)'); return; }
    if (file.size > 12 * 1024 * 1024) { setErrorMsg('ไฟล์ใหญ่เกิน 12MB กรุณาลดขนาดก่อนอัปโหลด'); return; }
    setErrorMsg(null); setScanResult(null); setCommitDone(false); setCommitStats(null);
    setSelectedMaterialId(''); setSelectedSectionId('');
    const url = URL.createObjectURL(file);
    setImageURL(url);
    setImageMime(file.type);
    const reader = new FileReader();
    reader.onload = (e) => {
      const b64 = e.target?.result as string;
      setImageBase64(b64.replace(/^data:image\/\w+;base64,/, ''));
    };
    reader.readAsDataURL(file);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // Analyze image via AI
  const handleAnalyze = async () => {
    if (!imageBase64) { setErrorMsg('กรุณาอัปโหลดรูปภาพก่อน'); return; }
    setIsAnalyzing(true);
    setErrorMsg(null);
    setScanResult(null);
    setAnalyzeProgress(5);
    setAnalyzeStepText('กำลังเตรียมข้อมูลรูปภาพ...');

    // Progress simulation timer
    let currentPct = 5;
    const progressTimer = setInterval(() => {
      currentPct += Math.floor(Math.random() * 8) + 3;
      if (currentPct > 92) {
        currentPct = 92;
      }
      setAnalyzeProgress(currentPct);

      if (currentPct < 25) {
        setAnalyzeStepText('กำลังอัปโหลดรูปภาพไปยังเซิร์ฟเวอร์...');
      } else if (currentPct < 55) {
        setAnalyzeStepText('Gemini AI กำลังตรวจจับตารางและลายมือภาษาไทย...');
      } else if (currentPct < 80) {
        setAnalyzeStepText('กำลังสกัดเลขล็อต ยอดรับ-จ่าย และวันหมดอายุ...');
      } else {
        setAnalyzeStepText('กำลังจัดหมวดหมู่และตรวจสอบความถูกต้อง...');
      }
    }, 400);

    try {
      const res = await fetch('/api/ai/ocr-stock-card', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ANALYZE', imageBase64, mimeType: imageMime }),
      });
      const data = await res.json();
      clearInterval(progressTimer);

      if (!res.ok || !data.success) {
        setAnalyzeProgress(0);
        setErrorMsg(data.error || data.hint || 'AI วิเคราะห์ไม่สำเร็จ');
        return;
      }

      setAnalyzeProgress(100);
      setAnalyzeStepText('ประมวลผลสำเร็จเรียบร้อย!');

      const resData: ScanResult = data.data;
      if (resData.materialName && materials.length > 0) {
        autoMatchMaterial(resData.materialName, materials, resData);
      }

      // Small delay so user sees 100% completion before switching view
      setTimeout(() => {
        setScanResult(resData);
        setEngine(data.engine || '');
        setEngineMsg(data.message || '');
        setIsAnalyzing(false);
      }, 500);
    } catch (e: any) {
      clearInterval(progressTimer);
      setAnalyzeProgress(0);
      setErrorMsg('เชื่อมต่อเซิร์ฟเวอร์ไม่สำเร็จ: ' + e.message);
      setIsAnalyzing(false);
    }
  };

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

  const addRow = () => {
    if (!scanResult) return;
    const newRow: StockRow = {
      id: `r-${Date.now()}`,
      date: new Date().toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: 'numeric' }),
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
    setImageURL(null); setImageBase64(''); setScanResult(null);
    setErrorMsg(null); setCommitDone(false); setCommitStats(null);
    setEngine(''); setEngineMsg('');
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

      {/* API Key Notice */}
      {hasApiKey === false && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
          <Info className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800">
            <strong>โหมดตัวอย่าง (Demo Mode)</strong> — ยังไม่ได้ตั้งค่า Gemini API Key
            ระบบจะแสดงข้อมูลตัวอย่างจากใบการ์ดตัวอย่างแทนการวิเคราะห์ภาพจริง
            <br />
            <span className="font-medium">วิธีตั้งค่า:</span> เปิดไฟล์{' '}
            <code className="bg-amber-100 px-1 rounded font-mono text-xs">.env.local</code>{' '}
            ในโฟลเดอร์โปรเจกต์ แล้วใส่ key จาก{' '}
            <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noopener noreferrer" className="underline font-semibold">
              Google AI Studio
            </a>
          </div>
        </div>
      )}
      {hasApiKey === true && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          <strong>Gemini AI พร้อมใช้งาน</strong> — ระบบจะวิเคราะห์ภาพจริงด้วย Google Gemini Vision
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
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                  <Image className="w-3.5 h-3.5 text-purple-500" />
                  ภาพต้นฉบับ Stock Card
                </span>
                <div className="flex items-center gap-1">
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
                    disabled={isAnalyzing}
                    className="w-full py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition"
                  >
                    {isAnalyzing ? (
                      <><Loader2 className="w-4 h-4 animate-spin" />กำลังวิเคราะห์ภาพด้วย AI...</>
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
                  <label className="text-xs font-semibold text-slate-600 block mb-1">เลขที่ใบการ์ด</label>
                  <input
                    type="text"
                    value={scanResult.cardNo}
                    onChange={e => setScanResult({ ...scanResult, cardNo: e.target.value })}
                    className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
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
                            placeholder="วว/ดด/ปปปป"
                            onChange={e => updateRow(row.id, 'date', e.target.value)}
                            className="w-24 px-2 py-1 bg-slate-50 hover:bg-white focus:bg-white border border-transparent hover:border-slate-200 focus:border-purple-500 rounded text-xs font-mono outline-none transition"
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
                            placeholder="YYYY-MM-DD"
                            onChange={e => updateRow(row.id, 'expDate', e.target.value)}
                            className="w-28 px-2 py-1 bg-amber-50/60 hover:bg-white focus:bg-white border border-transparent hover:border-amber-300 focus:border-amber-500 rounded text-xs font-mono text-amber-900 outline-none transition"
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
    </div>
  );
}

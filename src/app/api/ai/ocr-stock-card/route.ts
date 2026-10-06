import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// ---- AI Analysis Helper with Multi-Model Fallback & Retry ----
async function analyzeImageWithGemini(imageBase64: string, mimeType: string): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    return { success: false, reason: 'NO_API_KEY' };
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // List of vision-capable models verified to work with your API key
  const candidateModels = [
    'gemini-3.5-flash',
    'gemini-3.7-flash',
    'gemini-flash-latest',
  ];

  const prompt = `คุณเป็นผู้เชี่ยวชาญอ่านเอกสารใบสต็อกการ์ดคลังสินค้า (Stock Card / FR 1-6) ลายมือภาษาไทยและตัวเลข
วิเคราะห์รูปภาพนี้และสกัดข้อมูลทุกแถวออกมาเป็น JSON เท่านั้น ห้ามมีข้อความอื่น

กฎสำคัญ:
- ช่องที่เขียน "-" ให้ใส่ 0
- ช่องที่เขียนเครื่องหมายฟันหนู (") หรือ "   " หรือ " (" หรือ ditto ให้คัดลอกค่า lotNumber ของบรรทัดก่อนหน้ามาใช้แทน
- ***สำคัญมากเรื่องปีและวันที่***:
  * ปีในทุกช่องทั้ง date และ expDate ต้องเป็นปี คริสต์ศักราช (ค.ศ. / CE / A.D.) 4 หลักเสมอ เช่น 2024, 2025, 2026, 2027
  * หากในเอกสารเป็นปี พ.ศ. (เช่น 2568, 2569) ให้คำนวณแปลงเป็น ค.ศ. เสมอ (ลบ 543 เช่น 2569 -> 2026, 2568 -> 2025)
  * หากในเอกสารเขียนปี พ.ศ. แบบ 2 หลัก (เช่น 68, 69) ให้แปลงเป็น ค.ศ. (เช่น 68 -> 2025, 69 -> 2026)
  * หากในเอกสารเขียนปี ค.ศ. แบบ 2 หลัก (เช่น 26, 27) ให้แปลงเป็น ค.ศ. 4 หลัก (เช่น 2026, 2027)
- ช่อง date: ต้องเป็น format "วว/ดด/ปปปป" โดยที่ "ปปปป" ต้องเป็นปี ค.ศ. 4 หลักเท่านั้น (เช่น 07/08/2026) ห้ามเป็น พ.ศ.
- ช่อง expDate: สกัดวันหมดอายุ EXP จากช่องหมายเหตุหรือช่องระบุวันหมดอายุ ถ้ามี ให้ใส่ใน expDate เป็น format "DD-MM-YYYY" โดยที่ปีต้องเป็น ค.ศ. 4 หลักเท่านั้น (เช่น 19-08-2027) ถ้าไม่มีให้เป็น ""
- ตัวเลขทุกค่าให้เป็น number ไม่ใส่ comma
- ***การสกัดเลขที่ของฟอร์ม (เลขที่ใบการ์ด / Card No.)***:
  * ในเอกสารมักเขียนในรูปแบบ [ลำดับใบ]/[ปี] เช่น "01/26", "006/26" หรือ "01/69"
  * เลขด้านหลังเครื่องหมาย / หรือ - คือปีที่ผลิตหรือปีของฟอร์ม (เช่น 26 คือปี ค.ศ. 2026, 69 คือ พ.ศ. 2569 -> ค.ศ. 2026)
  * ให้สกัด "cardNo" เป็นข้อความเดิม เช่น "01/26" หรือ "006/26"
  * ให้สกัด "formYear" เป็นตัวเลขปี ค.ศ. 4 หลัก เช่น 2026 (ถ้าเป็น พ.ศ. ให้แปลงเป็น ค.ศ. เสมอ)
  * ให้สกัด "sheetNumber" เป็นเลขลำดับใบ เช่น "01" หรือ "006"

รูปแบบ JSON ที่ต้องการ:
{
  "materialName": "ชื่อวัตถุดิบจากช่องรายการ",
  "unit": "หน่วยนับ เช่น kg ลิตร กรัม",
  "cardNo": "เลขที่ใบการ์ด เช่น 01/26 หรือ 006/26",
  "formYear": 2026,
  "sheetNumber": "01",
  "creator": "ชื่อผู้จัดทำ",
  "position": "ตำแหน่ง",
  "rows": [
    {
      "id": "row-1",
      "date": "วว/ดด/ปปปป (ปี ค.ศ. 4 หลัก เช่น 07/08/2026)",
      "lotNumber": "รหัสล็อต",
      "inboundQty": 0,
      "outboundQty": 0,
      "balanceQty": 0,
      "totalQty": 0,
      "expDate": "DD-MM-YYYY (ปี ค.ศ. 4 หลัก เช่น 19-08-2027) หรือ empty string ถ้าไม่มี",
      "remarks": "หมายเหตุ"
    }
  ]
}

ตอบเฉพาะ JSON ล้วน ไม่ต้องมี markdown code block`;

  const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
  const imagePart = { inlineData: { data: cleanBase64, mimeType: mimeType || 'image/jpeg' } };

  let lastError: any = null;

  for (const modelName of candidateModels) {
    // Retry up to 1 time per candidate model with a brief backoff
    for (let attempt = 1; attempt <= 2; attempt++) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          ],
        });

        const result = await model.generateContent([prompt, imagePart]);
        const text = result.response.text().trim();

        const jsonStr = text
          .replace(/^```json\s*/i, '')
          .replace(/^```\s*/i, '')
          .replace(/\s*```$/i, '')
          .trim();

        return { success: true, data: JSON.parse(jsonStr), usedModel: modelName };
      } catch (err: any) {
        lastError = err;
        // Only retry on 429 rate limit (not on 404 model-not-found)
        const isRateLimit = err?.message?.includes('429') || err?.message?.includes('high demand');
        if (isRateLimit && attempt === 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
          continue;
        }
        // For any other error (404, 500, etc.), skip to next model immediately
        break;
      }
    }
  }

  throw lastError;
}

// ---- Helper: Convert any year (พ.ศ. or 2-digit) to 4-digit CE (ค.ศ.) ----
function convertYearToCE(rawYear: number): number {
  if (isNaN(rawYear)) return new Date().getFullYear();
  if (rawYear > 2400) {
    // Buddhist Era 4 digits: e.g. 2568, 2569 -> 2025, 2026
    return rawYear - 543;
  }
  if (rawYear < 100) {
    // 2-digit year: in Thai stock cards, >= 40 indicates Buddhist Era (e.g. 68 -> 2568 -> 2025, 69 -> 2569 -> 2026)
    if (rawYear >= 40) {
      return (rawYear + 2500) - 543;
    }
    // <= 39 indicates CE 2-digit (e.g. 26 -> 2026, 27 -> 2027)
    return 2000 + rawYear;
  }
  return rawYear;
}

// ---- Normalize Date to DD/MM/YYYY with 4-digit CE year ----
function normalizeDateStr(rawDate: string): string {
  if (!rawDate || typeof rawDate !== 'string') return '';
  const trimmed = rawDate.trim();
  if (!trimmed) return '';

  // Match YYYY-MM-DD
  const isoMatch = trimmed.match(/^(\d{2,4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (isoMatch && parseInt(isoMatch[1]) > 31) {
    const y = convertYearToCE(parseInt(isoMatch[1]));
    const m = String(parseInt(isoMatch[2])).padStart(2, '0');
    const d = String(parseInt(isoMatch[3])).padStart(2, '0');
    return `${d}/${m}/${y}`;
  }

  // Match DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/);
  if (dmyMatch) {
    const d = String(parseInt(dmyMatch[1])).padStart(2, '0');
    const m = String(parseInt(dmyMatch[2])).padStart(2, '0');
    const y = convertYearToCE(parseInt(dmyMatch[3]));
    return `${d}/${m}/${y}`;
  }

  return trimmed;
}

// ---- Normalize EXP Date to DD-MM-YYYY with 4-digit CE year ----
function normalizeExpDateStr(rawExp: string, remarks?: string): string {
  let target = (rawExp || '').trim();

  // If expDate is empty, try to extract from remarks (e.g. "EXP. 7/8/27" or "EXP 19/08/69")
  if (!target && remarks) {
    const m = remarks.match(/(?:EXP|หมดอายุ|BBF)[\.\:\s]*(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})/i)
           || remarks.match(/(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})/);
    if (m) {
      const d = String(parseInt(m[1])).padStart(2, '0');
      const mo = String(parseInt(m[2])).padStart(2, '0');
      const y = convertYearToCE(parseInt(m[3]));
      return `${d}-${mo}-${y}`;
    }
    return '';
  }

  if (!target) return '';

  // Check if YYYY-MM-DD (year first, > 31)
  const ymdMatch = target.match(/^(\d{2,4})[-\/\.](\d{1,2})[-\/\.](\d{1,2})$/);
  if (ymdMatch && parseInt(ymdMatch[1]) > 31) {
    const y = convertYearToCE(parseInt(ymdMatch[1]));
    const m = String(parseInt(ymdMatch[2])).padStart(2, '0');
    const d = String(parseInt(ymdMatch[3])).padStart(2, '0');
    return `${d}-${m}-${y}`;
  }

  // Check if DD/MM/YYYY (day first, year last)
  const dmyMatch = target.match(/^(\d{1,2})[-\/\.](\d{1,2})[-\/\.](\d{2,4})$/);
  if (dmyMatch) {
    const d = String(parseInt(dmyMatch[1])).padStart(2, '0');
    const m = String(parseInt(dmyMatch[2])).padStart(2, '0');
    const y = convertYearToCE(parseInt(dmyMatch[3]));
    return `${d}-${m}-${y}`;
  }

  return target;
}

// ---- Parse Form / Card Number: extract sheet number and manufacturing/form year ----
function parseFormNumber(cardNoStr: string): { sheetNumber: string; formYear: number | null; formYearInfo: string } {
  if (!cardNoStr || typeof cardNoStr !== 'string') {
    return { sheetNumber: '', formYear: null, formYearInfo: '' };
  }
  const trimmed = cardNoStr.trim();
  // Matches patterns like "01/26", "006/26", "1/2026", "01-26", "006/69"
  const m = trimmed.match(/^([A-Za-z0-9\.\-]+)\s*[\/\-]\s*(\d{2,4})$/);
  if (m) {
    const sheet = m[1];
    const rawY = parseInt(m[2]);
    const yearCE = convertYearToCE(rawY);
    return {
      sheetNumber: sheet,
      formYear: yearCE,
      formYearInfo: `ใบที่ ${sheet} ของปี ค.ศ. ${yearCE}`,
    };
  }
  return { sheetNumber: '', formYear: null, formYearInfo: '' };
}

// ---- Normalize all dates in scanned rows to CE year ----
function normalizeAllDatesToCE(rows: any[]): any[] {
  return rows.map((row) => ({
    ...row,
    date: normalizeDateStr(row.date),
    expDate: normalizeExpDateStr(row.expDate, row.remarks),
  }));
}

// ---- Smart Lot Number resolution ----
function resolveLotNumbers(rows: any[]): any[] {
  let lastLot = '';
  return rows.map((row) => {
    const lotRaw = String(row.lotNumber || '').trim();
    if (
      lotRaw === '' ||
      lotRaw === '"' ||
      lotRaw === '″' ||
      lotRaw === 'n' ||
      lotRaw === '"' ||
      lotRaw.toLowerCase() === 'ditto' ||
      lotRaw === '\u201d' ||
      lotRaw === '\u2033'
    ) {
      row.lotNumber = lastLot;
    } else {
      lastLot = lotRaw;
    }
    return row;
  });
}

// ---- POST Handler ----
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, imageBase64, mimeType, dataToCommit } = body;

    // === ACTION: CHECK API KEY ===
    if (action === 'CHECK_KEY') {
      const apiKey = process.env.GEMINI_API_KEY;
      return NextResponse.json({ hasApiKey: !!(apiKey && apiKey.trim() !== '') });
    }

    // === ACTION: ANALYZE IMAGE ===
    if (action === 'ANALYZE') {
      const apiKey = process.env.GEMINI_API_KEY;

      // Try Gemini Vision first if API key exists
      if (apiKey && apiKey.trim() !== '' && imageBase64) {
        try {
          const aiResult = await analyzeImageWithGemini(imageBase64, mimeType || 'image/jpeg');
          if (aiResult.success) {
            const data = aiResult.data;
            data.rows = resolveLotNumbers(data.rows || []);
            data.rows = normalizeAllDatesToCE(data.rows);

            // Extract or enrich formYear and sheetNumber from cardNo (e.g. 01/26 -> sheet 01, year 2026)
            const parsedForm = parseFormNumber(data.cardNo || '');
            if (!data.formYear && parsedForm.formYear) {
              data.formYear = parsedForm.formYear;
            } else if (data.formYear) {
              data.formYear = convertYearToCE(Number(data.formYear));
            }
            if (!data.sheetNumber && parsedForm.sheetNumber) {
              data.sheetNumber = parsedForm.sheetNumber;
            }
            data.formYearInfo = parsedForm.formYearInfo || (data.formYear ? `ปี ค.ศ. ${data.formYear}` : '');

            return NextResponse.json({
              success: true,
              data,
              engine: 'gemini-vision',
              message: `วิเคราะห์ภาพสำเร็จ (โมเดล ${aiResult.usedModel || 'Gemini'}) ตรวจสอบปี ค.ศ. เรียบร้อย`,
            });
          }
        } catch (aiErr: any) {
          console.error('Gemini Vision error:', aiErr.message);
          return NextResponse.json({
            success: false,
            error: `AI ไม่สามารถอ่านภาพได้: ${aiErr.message}`,
            hint: 'กรุณาตรวจสอบ GEMINI_API_KEY ในไฟล์ .env.local หรือลองถ่ายภาพใหม่ที่ชัดเจนกว่าเดิม',
          }, { status: 422 });
        }
      }

      // Fallback: return sample data from the uploaded stock card image
      const fallbackData = {
        materialName: 'แอลกอฮอล์ 95% (Ethanol 95%)',
        unit: 'kg',
        cardNo: '006/26',
        formYear: 2026,
        sheetNumber: '006',
        formYearInfo: 'ใบที่ 006 ของปี ค.ศ. 2026',
        creator: 'แสงอรุณ ศรีสุข',
        position: 'หัวหน้าแผนกคลังสินค้า',
        rows: [
          { id: 'r1',  date: '07/08/2026', lotNumber: '100726', inboundQty: 0,    outboundQty: 394, balanceQty: 909,  totalQty: 4617, expDate: '',           remarks: '' },
          { id: 'r2',  date: '10/08/2026', lotNumber: '100726', inboundQty: 0,    outboundQty: 300, balanceQty: 609,  totalQty: 4317, expDate: '',           remarks: '' },
          { id: 'r3',  date: '17/08/2026', lotNumber: '080826', inboundQty: 1879, outboundQty: 0,   balanceQty: 1879, totalQty: 6196, expDate: '2027-08-07', remarks: 'EXP. 7/8/27' },
          { id: 'r4',  date: '17/08/2026', lotNumber: '100726', inboundQty: 0,    outboundQty: 609, balanceQty: 0,    totalQty: 5587, expDate: '',           remarks: '' },
          { id: 'r5',  date: '17/08/2026', lotNumber: '140726', inboundQty: 0,    outboundQty: 388, balanceQty: 1472, totalQty: 5199, expDate: '',           remarks: '' },
          { id: 'r6',  date: '18/08/2026', lotNumber: '140726', inboundQty: 0,    outboundQty: 1240,balanceQty: 232,  totalQty: 3959, expDate: '',           remarks: '' },
          { id: 'r7',  date: '21/08/2026', lotNumber: '200826', inboundQty: 1894, outboundQty: 0,   balanceQty: 1894, totalQty: 5853, expDate: '2027-08-19', remarks: 'EXP. 19/8/27' },
          { id: 'r8',  date: '20/08/2026', lotNumber: '140726', inboundQty: 0,    outboundQty: 232, balanceQty: 0,    totalQty: 5621, expDate: '',           remarks: '' },
          { id: 'r9',  date: '20/08/2026', lotNumber: '210726', inboundQty: 0,    outboundQty: 268, balanceQty: 1580, totalQty: 5403, expDate: '',           remarks: '' },
          { id: 'r10', date: '26/08/2026', lotNumber: '210726', inboundQty: 0,    outboundQty: 591, balanceQty: 989,  totalQty: 4812, expDate: '',           remarks: '' },
          { id: 'r11', date: '27/08/2026', lotNumber: '210726', inboundQty: 0,    outboundQty: 240, balanceQty: 749,  totalQty: 4572, expDate: '',           remarks: '' },
          { id: 'r12', date: '01/09/2026', lotNumber: '210726', inboundQty: 0,    outboundQty: 608, balanceQty: 141,  totalQty: 3964, expDate: '',           remarks: '' },
          { id: 'r13', date: '01/09/2026', lotNumber: '210726', inboundQty: 0,    outboundQty: 141, balanceQty: 0,    totalQty: 3823, expDate: '',           remarks: '' },
          { id: 'r14', date: '01/09/2026', lotNumber: '080826', inboundQty: 0,    outboundQty: 159, balanceQty: 1720, totalQty: 3664, expDate: '',           remarks: '' },
          { id: 'r15', date: '02/09/2026', lotNumber: '080826', inboundQty: 0,    outboundQty: 300, balanceQty: 1420, totalQty: 3364, expDate: '',           remarks: '' },
          { id: 'r16', date: '08/09/2026', lotNumber: '080826', inboundQty: 0,    outboundQty: 300, balanceQty: 1120, totalQty: 3064, expDate: '',           remarks: '' },
          { id: 'r17', date: '10/09/2026', lotNumber: '080826', inboundQty: 0,    outboundQty: 300, balanceQty: 820,  totalQty: 2764, expDate: '',           remarks: '' },
          { id: 'r18', date: '14/09/2026', lotNumber: '120926', inboundQty: 1873, outboundQty: 0,   balanceQty: 1873, totalQty: 4637, expDate: '2027-09-11', remarks: 'EXP. 11/9/27' },
          { id: 'r19', date: '17/09/2026', lotNumber: '080826', inboundQty: 0,    outboundQty: 320, balanceQty: 500,  totalQty: 4137, expDate: '',           remarks: '' },
          { id: 'r20', date: '23/09/2026', lotNumber: '080826', inboundQty: 0,    outboundQty: 18,  balanceQty: 482,  totalQty: 4119, expDate: '',           remarks: '' },
        ],
      };

      return NextResponse.json({
        success: true,
        data: fallbackData,
        engine: 'demo-mode',
        message: !apiKey || apiKey.trim() === ''
          ? '⚠️ ยังไม่ได้ตั้ง Gemini API Key — แสดงตัวอย่างข้อมูลจากใบการ์ดจริง กรุณาตั้งค่า API Key เพื่อเปิดใช้งาน AI วิเคราะห์ภาพจริง'
          : 'วิเคราะห์ด้วย Template Engine (ไม่มี API Key)',
      });
    }

    // === ACTION: COMMIT TO DATABASE ===
    if (action === 'COMMIT') {
      const { materialId, materialName, baseUnit, sectionId, documentRef, creator, formYear, rows } = dataToCommit;

      if (!rows || !Array.isArray(rows) || rows.length === 0) {
        return NextResponse.json({ error: 'ไม่มีรายการที่จะบันทึก' }, { status: 400 });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Find or create Material
        let mat: any = null;
        if (materialId) {
          mat = await tx.material.findUnique({ where: { id: materialId } });
        }
        // If not selected by ID, check if a material with the same name already exists
        if (!mat && materialName) {
          mat = await tx.material.findFirst({
            where: {
              name: {
                equals: materialName.trim(),
              },
            },
          });
        }
        if (!mat) {
          const code = `RM-SCAN-${Date.now().toString().slice(-5)}`;
          mat = await tx.material.create({
            data: {
              code,
              name: materialName || 'วัตถุดิบจาก Stock Card',
              baseUnit: baseUnit || 'kg',
              sectionId: sectionId || null,
            },
          });
        }

        let importedTx = 0;
        let createdLots = 0;
        const lotMap = new Map<string, string>(); // lotNumber -> lotId

        for (const row of rows) {
          const lotNum = String(row.lotNumber || 'DEFAULT').trim();
          const inQty  = Number(row.inboundQty)  || 0;
          const outQty = Number(row.outboundQty) || 0;
          const balQty = Number(row.balanceQty)  || 0;

          // Parse date (support Christian AD and Buddhist BE years like 2568, 68)
          let txDate = new Date();
          if (row.date) {
            const parts = row.date.split(/[\/\-\.]/);
            if (parts.length === 3) {
              let y = parseInt(parts[2]);
              const m = parseInt(parts[1]) - 1;
              const d = parseInt(parts[0]);
              if (y > 2400) y -= 543; // Buddhist Era: e.g. 2568 -> 2025, 2569 -> 2026
              else if (y < 100) {
                // If 2 digits like '68' or '69', assume Buddhist Era if > 40
                if (y >= 40) y = (y + 2500) - 543;
                else y += 2000;
              }
              txDate = new Date(y, m, d);
            }
          }

          // Parse expiry (support Christian AD and Buddhist BE)
          let expDate: Date | null = null;
          if (row.expDate && row.expDate.trim() !== '') {
            const expParts = row.expDate.trim().split(/[\/\-\.]/);
            if (expParts.length === 3) {
              let y = parseInt(expParts[0]);
              let m = parseInt(expParts[1]) - 1;
              let d = parseInt(expParts[2]);
              // If format is DD/MM/YYYY
              if (parseInt(expParts[2]) > 1000 || parseInt(expParts[2]) < 100) {
                d = parseInt(expParts[0]);
                m = parseInt(expParts[1]) - 1;
                y = parseInt(expParts[2]);
              }
              if (y > 2400) y -= 543;
              else if (y < 100) {
                if (y >= 40) y = (y + 2500) - 543;
                else y += 2000;
              }
              expDate = new Date(y, m, d);
            } else {
              expDate = new Date(row.expDate);
              if (isNaN(expDate.getTime())) expDate = null;
            }
          }
          if (!expDate && row.remarks) {
            const m = row.remarks.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
            if (m) {
              let y = parseInt(m[3]);
              if (y > 2400) y -= 543;
              else if (y < 100) {
                if (y >= 40) y = (y + 2500) - 543;
                else y += 2000;
              }
              expDate = new Date(y, parseInt(m[2]) - 1, parseInt(m[1]));
            }
          }

          // Find or create lot (by lotNumber, scoped to this material)
          let lotId = lotMap.get(lotNum);
          let targetLot: any = null;

          if (lotId) {
            targetLot = await tx.materialLot.findUnique({ where: { id: lotId } });
          } else {
            targetLot = await tx.materialLot.findFirst({
              where: { materialId: mat.id, lotNumber: lotNum },
            });
          }

          if (!targetLot && (inQty > 0 || balQty > 0)) {
            const mfgDate = formYear ? new Date(formYear, 0, 1) : null;
            targetLot = await tx.materialLot.create({
              data: {
                materialId: mat.id,
                lotNumber: lotNum,
                receiveDate: txDate,
                mfgDate,
                expDate,
                initialQuantity: inQty > 0 ? inQty : balQty,
                quantityRemaining: balQty,
                status: balQty <= 0 ? 'EXHAUSTED' : 'ACTIVE',
              },
            });
            createdLots++;
          } else if (targetLot) {
            // Update remaining quantity and status based on this transaction row
            const newBal = balQty;
            const newStatus = newBal <= 0 ? 'EXHAUSTED' : 'ACTIVE';
            targetLot = await tx.materialLot.update({
              where: { id: targetLot.id },
              data: {
                quantityRemaining: newBal,
                expDate: expDate || targetLot.expDate,
                status: newStatus,
              },
            });
          }

          if (targetLot) {
            lotId = targetLot.id;
            lotMap.set(lotNum, targetLot.id);
          }

          // Write transaction record
          if (inQty > 0) {
            await tx.stockTransaction.create({
              data: {
                materialId: mat.id,
                lotId: lotId || null,
                type: 'INBOUND',
                quantity: inQty,
                lotBalanceAfter: balQty,
                totalStockAfter: Number(row.totalQty) || null,
                transactionDate: txDate,
                documentRef: documentRef || 'STOCK-CARD-IMPORT',
                remarks: row.remarks || `รับเข้าล็อต ${lotNum}`,
                createdBy: creator || 'ระบบนำเข้า OCR',
              },
            });
            importedTx++;
          } else if (outQty > 0) {
            await tx.stockTransaction.create({
              data: {
                materialId: mat.id,
                lotId: lotId || null,
                type: 'OUTBOUND',
                quantity: outQty,
                lotBalanceAfter: balQty,
                totalStockAfter: Number(row.totalQty) || null,
                transactionDate: txDate,
                documentRef: documentRef || 'STOCK-CARD-IMPORT',
                remarks: row.remarks || `จ่ายออกล็อต ${lotNum}`,
                createdBy: creator || 'ระบบนำเข้า OCR',
              },
            });
            importedTx++;
          }
        }

        return {
          materialId: mat.id,
          materialName: mat.name,
          importedTransactions: importedTx,
          createdLots,
        };
      });

      return NextResponse.json({ success: true, ...result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error: any) {
    console.error('OCR Stock Card Error:', error);
    return NextResponse.json(
      { error: error.message || 'เกิดข้อผิดพลาดในระบบ' },
      { status: 500 }
    );
  }
}

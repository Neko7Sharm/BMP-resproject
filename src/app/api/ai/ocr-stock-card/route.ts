import { NextResponse } from 'next/server';
import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import prisma from '@/lib/prisma';

// ---- AI Analysis Helper with Multi-API-Key & Multi-Model Fallback ----
async function analyzeImageWithGemini(imageBase64: string, mimeType: string): Promise<any> {
  // Collect all available API keys from environment variables
  const apiKeys: string[] = [];
  const primaryKey = process.env.GEMINI_API_KEY;
  if (primaryKey && primaryKey.trim() !== '') apiKeys.push(primaryKey.trim());
  // Additional fallback keys: GEMINI_API_KEY_2, GEMINI_API_KEY_3, ...
  for (let i = 2; i <= 10; i++) {
    const extraKey = process.env[`GEMINI_API_KEY_${i}`];
    if (extraKey && extraKey.trim() !== '') apiKeys.push(extraKey.trim());
  }

  if (apiKeys.length === 0) {
    return { success: false, reason: 'NO_API_KEY' };
  }

  // List of vision-capable models verified to work with your API key
  const candidateModels = [
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
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

  // Outer loop: try each API key in order (rotate on 429 rate limit)
  for (let keyIdx = 0; keyIdx < apiKeys.length; keyIdx++) {
    const currentKey = apiKeys[keyIdx];
    const genAI = new GoogleGenerativeAI(currentKey);
    let keyRateLimited = false;

    // Inner loop: try each model with the current API key
    for (const modelName of candidateModels) {
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

          return { success: true, data: JSON.parse(jsonStr), usedModel: modelName, usedKeyIndex: keyIdx + 1 };
        } catch (err: any) {
          lastError = err;
          const isRateLimit = err?.message?.includes('429') || err?.message?.includes('quota') || err?.message?.includes('high demand');
          if (isRateLimit) {
            // Rate limited on this key — switch to next API key
            keyRateLimited = true;
            console.warn(`API key #${keyIdx + 1} rate limited (429), switching to next key...`);
            break;
          }
          // Retry once on transient errors, skip model on others
          if (attempt === 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
            continue;
          }
          break;
        }
      }
      if (keyRateLimited) break; // Stop trying models with this key, rotate to next key
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
      // Check all available keys (GEMINI_API_KEY, GEMINI_API_KEY_2, ...)
      const hasAnyKey = !!(process.env.GEMINI_API_KEY?.trim()) ||
        Array.from({ length: 9 }, (_, i) => process.env[`GEMINI_API_KEY_${i + 2}`])
          .some(k => k && k.trim() !== '');
      return NextResponse.json({ hasApiKey: hasAnyKey });
    }

    // === ACTION: ANALYZE IMAGE ===
    if (action === 'ANALYZE') {
      // Check if any API key is available
      const hasAnyKey = !!(process.env.GEMINI_API_KEY?.trim()) ||
        Array.from({ length: 9 }, (_, i) => process.env[`GEMINI_API_KEY_${i + 2}`])
          .some(k => k && k.trim() !== '');

      // Try Gemini Vision first if any API key exists
      if (hasAnyKey && imageBase64) {
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

      // No API key available — return error
      return NextResponse.json({
        success: false,
        error: 'ยังไม่ได้ตั้งค่า Gemini API Key กรุณาเพิ่ม GEMINI_API_KEY ใน Environment Variables',
      }, { status: 401 });
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

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// GET: check current key status
export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  return NextResponse.json({
    hasApiKey: !!(apiKey && apiKey.trim() !== ''),
    preview: apiKey ? `${apiKey.slice(0, 6)}...${apiKey.slice(-4)}` : null,
  });
}

// POST: save API key to .env.local
export async function POST(request: Request) {
  try {
    const { apiKey } = await request.json();
    if (!apiKey || typeof apiKey !== 'string') {
      return NextResponse.json({ error: 'กรุณาระบุ API Key' }, { status: 400 });
    }

    const envPath = path.join(process.cwd(), '.env.local');
    let content = '';
    if (fs.existsSync(envPath)) {
      content = fs.readFileSync(envPath, 'utf-8');
    }

    // Replace or add GEMINI_API_KEY line
    const keyLine = `GEMINI_API_KEY=${apiKey.trim()}`;
    if (content.match(/^GEMINI_API_KEY=.*/m)) {
      content = content.replace(/^GEMINI_API_KEY=.*/m, keyLine);
    } else {
      content = content.trimEnd() + '\n' + keyLine + '\n';
    }

    fs.writeFileSync(envPath, content, 'utf-8');

    // Note: Next.js will pick up .env.local changes on next restart
    return NextResponse.json({
      success: true,
      message: 'บันทึก API Key เรียบร้อยแล้ว กรุณาเริ่มต้นเซิร์ฟเวอร์ใหม่เพื่อให้ระบบอ่านค่า (npm run dev)',
      preview: `${apiKey.trim().slice(0, 6)}...${apiKey.trim().slice(-4)}`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

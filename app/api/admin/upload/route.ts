import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadPeriods, DATA_DIR } from '@/lib/periods';
import { isGitHubConfigured, saveDataFile } from '@/lib/githubStorage';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const file   = formData.get('file') as File | null;
  const idxStr = formData.get('idx')  as string | null;
  if (!file || idxStr === null) return NextResponse.json({ error: 'file and idx required' }, { status: 400 });
  if (!file.name.endsWith('.xlsx')) return NextResponse.json({ error: 'Only .xlsx files accepted' }, { status: 400 });

  const idx    = parseInt(idxStr, 10);
  const period = (await loadPeriods()).find(p => p.idx === idx);
  if (!period) return NextResponse.json({ error: `Unknown period index ${idx}` }, { status: 400 });

  const buf = Buffer.from(await file.arrayBuffer());

  if (isGitHubConfigured()) {
    await saveDataFile(period.filename, buf);
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, period.filename), buf);
  }

  return NextResponse.json({ ok: true, period: period.label, filename: period.filename, size: buf.length });
}

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadPeriods, savePeriods, normalizePeriods, DATA_DIR } from '@/lib/periods';
import { isGitHubConfigured, saveDataFile } from '@/lib/githubStorage';
import { syncOnAddPeriod, fullSync } from '@/lib/syncDashboard';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let formData: FormData;
  try { formData = await request.formData(); }
  catch { return NextResponse.json({ error: 'Invalid form data' }, { status: 400 }); }

  const file      = formData.get('file')   as File   | null;
  const periodNum = formData.get('period') as string | null;
  const year      = formData.get('year')   as string | null;

  if (!file || !periodNum || !year) return NextResponse.json({ error: 'file, period, and year required' }, { status: 400 });
  if (!file.name.endsWith('.xlsx'))  return NextResponse.json({ error: 'Only .xlsx files accepted' }, { status: 400 });

  const label    = `P${periodNum} ${year}`;
  const filename = `P${periodNum} ${year}.xlsx`;
  const periods  = await loadPeriods();

  if (periods.find(p => p.label === label)) {
    return NextResponse.json({ error: `${label} already exists — use Replace instead` }, { status: 409 });
  }

  // Insert chronologically (not at the end) so a re-added earlier period goes
  // back into its own slot; idx always equals position.
  const updatedPeriods = normalizePeriods([...periods, { idx: -1, label, filename }]);
  const newEntry = updatedPeriods.find(p => p.label === label)!;
  const appendedAtEnd = newEntry.idx === updatedPeriods.length - 1;

  const buf = Buffer.from(await file.arrayBuffer());

  if (isGitHubConfigured()) {
    await saveDataFile(filename, buf);
  } else {
    fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(path.join(DATA_DIR, filename), buf);
  }

  await savePeriods(updatedPeriods);

  // Appending to the end only needs the new slot filled; inserting in the
  // middle shifts later periods, so rebuild everything from the files.
  if (appendedAtEnd) await syncOnAddPeriod(newEntry, buf, updatedPeriods);
  else await fullSync(updatedPeriods);

  return NextResponse.json({ ok: true, period: newEntry });
}

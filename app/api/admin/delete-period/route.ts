import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadPeriods, savePeriods, normalizePeriods, DATA_DIR } from '@/lib/periods';
import { fullSync } from '@/lib/syncDashboard';
import { isGitHubConfigured, deleteDataFile } from '@/lib/githubStorage';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function DELETE(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { idx } = await request.json() as { idx: number };
  const periods  = await loadPeriods();
  const period   = periods.find(p => p.idx === idx);
  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

  if (isGitHubConfigured()) {
    await deleteDataFile(period.filename);
  } else {
    const fpath = path.join(DATA_DIR, period.filename);
    if (fs.existsSync(fpath)) fs.unlinkSync(fpath);
  }

  // Renumber the remaining periods (no idx gaps) and rebuild the data so the
  // labels and data arrays stay aligned.
  const remaining = normalizePeriods(periods.filter(p => p.idx !== idx));
  await savePeriods(remaining);
  await fullSync(remaining);

  return NextResponse.json({ ok: true, removed: period.label });
}

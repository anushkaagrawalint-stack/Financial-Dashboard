import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadPeriods, savePeriods, DATA_DIR } from '@/lib/periods';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function DELETE(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { idx } = await request.json() as { idx: number };
  const periods  = loadPeriods();
  const period   = periods.find(p => p.idx === idx);
  if (!period) return NextResponse.json({ error: 'Period not found' }, { status: 404 });

  const fpath = path.join(DATA_DIR, period.filename);
  if (fs.existsSync(fpath)) fs.unlinkSync(fpath);

  savePeriods(periods.filter(p => p.idx !== idx));

  return NextResponse.json({ ok: true, removed: period.label });
}

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadPeriods } from '@/lib/periods';
import { fullSync } from '@/lib/syncDashboard';

export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const periods = await loadPeriods();
  const { warnings } = await fullSync(periods);

  return NextResponse.json({
    ok: true,
    output: `Processed ${periods.length} periods.` +
      (warnings.length ? `\n\nWarnings:\n${warnings.join('\n')}` : ''),
  });
}

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadPeriods, DATA_DIR } from '@/lib/periods';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const periods = (await loadPeriods()).map(p => {
    const fpath = path.join(DATA_DIR, p.filename);
    const exists = fs.existsSync(fpath);
    let size = 0, modified: string | null = null;
    if (exists) {
      const stat = fs.statSync(fpath);
      size     = stat.size;
      modified = stat.mtime.toISOString();
    }
    return { ...p, exists, size, modified };
  });

  return NextResponse.json({ periods });
}

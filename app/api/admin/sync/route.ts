import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { execFile } from 'child_process';
import path from 'path';

export const runtime = 'nodejs';

const SCRIPT = path.join(process.cwd(), 'scripts', 'update-data.py');

export async function POST(request: Request) {
  if (!verifyAdmin(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  return new Promise<NextResponse>(resolve => {
    execFile('python3', [SCRIPT], { cwd: process.cwd(), timeout: 120_000 }, (err, stdout, stderr) => {
      if (err && !stdout) {
        resolve(NextResponse.json({ ok: false, output: stderr || err.message }, { status: 500 }));
      } else {
        resolve(NextResponse.json({ ok: true, output: stdout + (stderr ? '\nSTDERR:\n' + stderr : '') }));
      }
    });
  });
}

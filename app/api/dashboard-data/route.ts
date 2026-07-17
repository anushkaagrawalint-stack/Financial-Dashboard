import { NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { isGitHubConfigured, getDashboardData } from '@/lib/githubStorage';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

// Module-level cache: keeps GitHub reads fast within a function instance lifetime.
// Cleared on every Vercel redeploy, so new deployments always start fresh.
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

export async function GET(request: Request) {
  if (!verifyAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const fresh = new URL(request.url).searchParams.get('fresh') === '1';

  if (!fresh && cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  let data: unknown = null;

  if (isGitHubConfigured()) {
    try { data = await getDashboardData(); } catch { }
  }

  if (!data) {
    try {
      const localPath = path.join(process.cwd(), 'lib', 'dashboard-data.json');
      data = JSON.parse(fs.readFileSync(localPath, 'utf8'));
    } catch { }
  }

  if (!data) {
    return NextResponse.json({ error: 'Dashboard data not available' }, { status: 503 });
  }

  cache = { data, ts: Date.now() };
  return NextResponse.json(data);
}

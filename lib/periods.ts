import fs from 'fs';
import path from 'path';
import { isGitHubConfigured, getPeriodsConfig, savePeriodsConfig } from '@/lib/githubStorage';

export interface PeriodEntry { idx: number; label: string; filename: string; }

export const PERIODS_CONFIG_PATH = path.join(process.cwd(), 'lib', 'periods-config.json');
export const DATA_DIR            = path.join(process.cwd(), 'Data');

function readLocalPeriods(): PeriodEntry[] {
  try {
    return JSON.parse(fs.readFileSync(PERIODS_CONFIG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export async function loadPeriods(): Promise<PeriodEntry[]> {
  if (isGitHubConfigured()) {
    try {
      const fromGH = await getPeriodsConfig<PeriodEntry[]>();
      if (fromGH !== null) return fromGH;
    } catch { }
  }
  return readLocalPeriods();
}

export async function savePeriods(periods: PeriodEntry[]): Promise<void> {
  if (isGitHubConfigured()) {
    await savePeriodsConfig(periods);
    return;
  }
  fs.writeFileSync(PERIODS_CONFIG_PATH, JSON.stringify(periods, null, 2));
}

// Invariant the whole dashboard relies on: periods are in chronological order
// (year, then period number) and each entry's idx equals its position. The
// labels list and every data array in dashboard-data.json are indexed by this.
export function normalizePeriods(periods: PeriodEntry[]): PeriodEntry[] {
  const key = (label: string) => {
    const m = label.match(/^P(\d+)\s+(\d{4})$/);
    return m ? +m[2] * 100 + +m[1] : Number.MAX_SAFE_INTEGER;
  };
  return [...periods]
    .sort((a, b) => key(a.label) - key(b.label) || a.idx - b.idx)
    .map((p, i) => ({ ...p, idx: i }));
}

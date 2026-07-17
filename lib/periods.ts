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

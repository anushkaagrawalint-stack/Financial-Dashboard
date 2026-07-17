import fs from 'fs';
import path from 'path';

export interface PeriodEntry { idx: number; label: string; filename: string; }

export const PERIODS_CONFIG_PATH = path.join(process.cwd(), 'lib', 'periods-config.json');
export const DATA_DIR            = path.join(process.cwd(), 'Data');

export function loadPeriods(): PeriodEntry[] {
  try {
    return JSON.parse(fs.readFileSync(PERIODS_CONFIG_PATH, 'utf8'));
  } catch {
    return [];
  }
}

export function savePeriods(periods: PeriodEntry[]): void {
  fs.writeFileSync(PERIODS_CONFIG_PATH, JSON.stringify(periods, null, 2));
}

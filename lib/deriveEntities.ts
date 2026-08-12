import type { DashboardData, EntityData, MetricData } from './types';

const BASE_ENTITY = 'Consolidated';
const EXCLUDED_ENTITY = 'Ballpark';
export const OPEN_LOCATIONS_ENTITY = 'Open Locations';

function subtractArr(a: (number | null)[], b: (number | null)[] | undefined): (number | null)[] {
  return a.map((av, i) => (av ?? 0) - (b?.[i] ?? 0));
}

// Synthesizes "Open Locations" — every location except Ballpark — by
// subtracting Ballpark's numbers from Consolidated's, key by key, for every
// metric (Actual/Budget/PY and the cumulative YTD arrays). Baked into D.t12
// once at load time as an ordinary-looking entity so every existing panel
// (which just reads D.t12[curEntity] like any real location) works with it
// automatically, with no per-panel special-casing.
export function withOpenLocations(D: DashboardData): DashboardData {
  const base = D.t12[BASE_ENTITY];
  if (!base) return D;
  const excluded = D.t12[EXCLUDED_ENTITY];

  const openLocations: EntityData = {};
  for (const key of Object.keys(base)) {
    const b = base[key];
    const x = excluded?.[key];
    const m: MetricData = {
      v: subtractArr(b.v, x?.v),
      p: b.p,
      b: subtractArr(b.b, x?.b),
      bp: b.bp,
      py: subtractArr(b.py, x?.py),
      pyp: b.pyp,
    };
    if (b.ytdV) m.ytdV = subtractArr(b.ytdV, x?.ytdV);
    if (b.ytdB) m.ytdB = subtractArr(b.ytdB, x?.ytdB);
    if (b.ytdPy) m.ytdPy = subtractArr(b.ytdPy, x?.ytdPy);
    openLocations[key] = m;
  }

  return { ...D, t12: { ...D.t12, [OPEN_LOCATIONS_ENTITY]: openLocations } };
}

// Lets any mounted Chart.js instance register itself so export code (which runs
// outside the chart's own component) can grab a PNG snapshot via toBase64Image().
// Keys are "<panel>:<chart>", e.g. "overview:revenue-trend".
import { useEffect, useRef } from 'react';

export interface ChartHandle { toBase64Image: (type?: string, quality?: number) => string; }

const registry = new Map<string, ChartHandle>();

export function registerChart(key: string, handle: ChartHandle | null | undefined) {
  if (handle) registry.set(key, handle);
  else registry.delete(key);
}

export function getChartImage(key: string): string | null {
  const h = registry.get(key);
  if (!h) return null;
  try { return h.toBase64Image('image/png', 1); }
  catch { return null; }
}

export function getChartImagesByPrefix(prefix: string): { key: string; image: string }[] {
  const out: { key: string; image: string }[] = [];
  for (const [key, h] of registry.entries()) {
    if (!key.startsWith(prefix)) continue;
    try { out.push({ key, image: h.toBase64Image('image/png', 1) }); }
    catch { /* skip charts that fail to render an image */ }
  }
  return out;
}

// Attach as `ref` on a react-chartjs-2 <Bar>/<Doughnut>/<Line> to auto-register
// it under `key` while mounted, and clean up on unmount.
export function useChartRegistration(key: string) {
  const ref = useRef<ChartHandle | null>(null);
  useEffect(() => {
    return () => registerChart(key, null);
  }, [key]);
  return (instance: ChartHandle | null | undefined) => {
    ref.current = instance ?? null;
    registerChart(key, instance);
  };
}

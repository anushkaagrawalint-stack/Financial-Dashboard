export interface MetricData {
  v: (number | null)[];
  p: (number | null)[];
  b: (number | null)[];
  bp: (number | null)[];
  py: (number | null)[];
  pyp: (number | null)[];
  // Cumulative-to-date values read directly from each period's own "YTD" columns
  // in the source P&L sheet (not summed from monthly v/b/py in JS).
  ytdV?: (number | null)[];
  ytdB?: (number | null)[];
  ytdPy?: (number | null)[];
}

export interface EntityData {
  [key: string]: MetricData;
}

export interface DashboardData {
  periods: string[];
  period_keys: string[];
  t12: {
    [entity: string]: EntityData;
  };
}

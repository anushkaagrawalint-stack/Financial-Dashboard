export interface MetricData {
  v: (number | null)[];
  p: (number | null)[];
  b: (number | null)[];
  bp: (number | null)[];
  py: (number | null)[];
  pyp: (number | null)[];
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

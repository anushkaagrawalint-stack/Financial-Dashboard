'use client';

import { useState, useRef, useEffect } from 'react';

interface Option { value: string; label: string; }
interface Group { label: string; options: Option[]; }

interface Props {
  value: string;
  onChange: (v: string) => void;
  periods?: string[];
}

type Parsed = { str: string; num: number; year: number };

function parsePeriods(periods: string[]): Parsed[] {
  return periods
    .map(p => { const m = p.match(/^P(\d+)\s+(\d{4})$/); return m ? { str: p, num: +m[1], year: +m[2] } : null; })
    .filter((x): x is Parsed => x !== null);
}

function buildGroups(periods: string[]): Group[] {
  const parsed = parsePeriods(periods);
  const last = parsed[parsed.length - 1];
  const latestYear = last?.year ?? new Date().getFullYear();
  const latestYY = String(latestYear).slice(2);

  // Last 12 label derived from actual data
  const last12Slice = parsed.slice(-12);
  const l12s = last12Slice[0];
  const l12e = last12Slice[last12Slice.length - 1];
  const last12Label = l12s && l12e
    ? `Last 12 Periods (P${l12s.num}'${String(l12s.year).slice(2)}–P${l12e.num}'${String(l12e.year).slice(2)})`
    : 'Last 12 Periods';

  // YTD for the latest year
  const ytdParsed = parsed.filter(p => p.year === latestYear);
  const ytdMax = ytdParsed[ytdParsed.length - 1]?.num ?? 0;
  const ytdKey = `ytd${latestYY}`;
  const ytdLabel = ytdMax > 0 ? `YTD ${latestYear} (P1–P${ytdMax})` : `YTD ${latestYear}`;

  // Unique years in order
  const years = Array.from(new Set(parsed.map(p => p.year)));

  // Range options
  const rangeOpts: Option[] = [{ value: 'last12', label: last12Label }];
  for (const y of years) {
    if (parsed.filter(p => p.year === y).length >= 12) {
      rangeOpts.push({ value: `fy${String(y).slice(2)}`, label: `Full Year ${y} (P1–P12)` });
    }
  }
  if (ytdMax > 0 && ytdMax < 12) {
    rangeOpts.push({ value: ytdKey, label: ytdLabel });
  }
  rangeOpts.push({ value: 'last6', label: 'Last 6 Periods' });
  rangeOpts.push({ value: 'last3', label: 'Last 3 Periods' });

  // Quarter options for all years in the data
  const quarterOpts: Option[] = [];
  for (const year of years) {
    const yy = String(year).slice(2);
    const yearParsed = parsed.filter(p => p.year === year);
    const maxPNum = yearParsed[yearParsed.length - 1]?.num ?? 0;
    for (let q = 1; q <= 4; q++) {
      const qs = (q - 1) * 3 + 1;
      const qe = q * 3;
      if (maxPNum < qs) break;
      const actualEnd = Math.min(qe, maxPNum);
      const complete = maxPNum >= qe;
      const range = qs === actualEnd ? `P${qs}` : `P${qs}–P${actualEnd}`;
      quarterOpts.push({
        value: `q${q}_${yy}`,
        label: `Q${q} ${year} (${range})${complete ? '' : ' (QTD)'}`,
      });
    }
  }

  // FY groups — one per year, only periods that exist in the data
  const fyGroups: Group[] = years.map(year => ({
    label: `FY ${year}`,
    options: parsed.filter(p => p.year === year).map(p => ({ value: p.str, label: p.str })),
  }));

  return [
    { label: 'Ranges', options: rangeOpts },
    { label: 'Quarters', options: quarterOpts },
    ...fyGroups,
  ];
}

function getLabel(value: string, groups: Group[]): string {
  for (const g of groups) {
    const opt = g.options.find(o => o.value === value);
    if (opt) return opt.label;
  }
  return value;
}

export default function PeriodSelect({ value, onChange, periods = [] }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groups = buildGroups(periods);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shortLabel = getLabel(value, groups).split(' (')[0].replace(/'/g, "'");

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        className="period-sel-btn"
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.2)',
          color: '#fff',
          fontFamily: 'Montserrat, sans-serif',
          fontSize: 12,
          fontWeight: 500,
          padding: '6px 28px 6px 10px',
          borderRadius: 7,
          cursor: 'pointer',
          outline: 'none',
          appearance: 'none',
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23ffffff'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'right 8px center',
          textAlign: 'left',
          whiteSpace: 'nowrap',
        }}
      >
        {shortLabel}
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 6px)',
          left: 0,
          zIndex: 500,
          background: '#fff',
          border: '1px solid rgba(124,58,237,0.2)',
          borderRadius: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.18)',
          minWidth: 240,
          maxWidth: 'calc(100vw - 28px)',
          maxHeight: 360,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '4px 0',
        }}>
          {groups.map((g, gi) => (
            <div key={g.label}>
              {gi > 0 && (
                <div style={{ height: 1, background: 'rgba(124,58,237,0.10)', margin: '2px 0' }} />
              )}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px 6px',
                background: 'rgba(124,58,237,0.07)',
                borderLeft: '3px solid #7c3aed',
                fontFamily: 'Montserrat, sans-serif',
                fontSize: 10,
                fontWeight: 800,
                textTransform: 'uppercase',
                letterSpacing: '1.1px',
                color: '#7c3aed',
                userSelect: 'none',
              }}>
                {g.label}
              </div>
              {g.options.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => { onChange(opt.value); setOpen(false); }}
                  style={{
                    padding: '7px 14px',
                    fontSize: 12,
                    fontWeight: opt.value === value ? 600 : 400,
                    color: opt.value === value ? '#7c3aed' : '#1a1f2e',
                    background: opt.value === value ? '#f5f0ff' : 'transparent',
                    cursor: 'pointer',
                    fontFamily: 'Montserrat, sans-serif',
                    whiteSpace: 'nowrap',
                  }}
                  onMouseEnter={e => {
                    if (opt.value !== value) (e.currentTarget as HTMLDivElement).style.background = '#faf8ff';
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLDivElement).style.background = opt.value === value ? '#f5f0ff' : 'transparent';
                  }}
                >
                  {opt.label}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useRef, useEffect } from 'react';

interface Option { value: string; label: string; }
interface Group { label: string; options: Option[]; }

const GROUPS: Group[] = [
  {
    label: 'Ranges',
    options: [
      { value: 'last12', label: "Last 12 Periods (P6'25–P5'26)" },
      { value: 'fy25',   label: 'Full Year 2025 (P1–P12)' },
      { value: 'ytd26',  label: 'YTD 2026 (P1–P5)' },
      { value: 'last6',  label: 'Last 6 Periods' },
      { value: 'last3',  label: 'Last 3 Periods' },
    ],
  },
  {
    label: 'Quarters',
    options: [
      { value: 'q1_25', label: 'Q1 2025 (P1–P3)' },
      { value: 'q2_25', label: 'Q2 2025 (P4–P6)' },
      { value: 'q3_25', label: 'Q3 2025 (P7–P9)' },
      { value: 'q4_25', label: 'Q4 2025 (P10–P12)' },
      { value: 'q1_26', label: 'Q1 2026 (P1–P3)' },
    ],
  },
  {
    label: 'FY 2025',
    options: ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12']
      .map(p => ({ value: `${p} 2025`, label: `${p} 2025` })),
  },
  {
    label: 'FY 2026',
    options: ['P1','P2','P3','P4','P5']
      .map(p => ({ value: `${p} 2026`, label: `${p} 2026` })),
  },
];

function getLabel(value: string): string {
  for (const g of GROUPS) {
    const opt = g.options.find(o => o.value === value);
    if (opt) return opt.label;
  }
  return value;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function PeriodSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const shortLabel = getLabel(value).split(' (')[0].replace(/'/g, "'");

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
          {GROUPS.map((g, gi) => (
            <div key={g.label}>
              {/* Section divider — subtle line between groups except before the first */}
              {gi > 0 && (
                <div style={{ height: 1, background: 'rgba(124,58,237,0.10)', margin: '2px 0' }} />
              )}
              {/* Group header: purple wash + left accent bar + ALL CAPS — clearly a label, not an option */}
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
                    if (opt.value !== value) {
                      (e.currentTarget as HTMLDivElement).style.background = '#faf8ff';
                    }
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

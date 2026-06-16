'use client';

import { useState, useRef, useEffect } from 'react';

const OPTIONS = [
  { value: 'Consolidated', label: 'All Locations' },
  { value: 'Ballpark', label: 'Ballpark' },
  { value: 'MVT', label: 'MVT' },
  { value: 'National Landing', label: 'National Landing' },
  { value: 'Mosaic', label: 'Mosaic' },
  { value: 'Rockville', label: 'Rockville' },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
}

export default function LocationSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const label = OPTIONS.find(o => o.value === value)?.label ?? value;

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
          fontSize: 13,
          fontWeight: 500,
          padding: '7px 30px 7px 12px',
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
        {label}
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
          minWidth: 200,
          maxWidth: 'calc(100vw - 28px)',
          overflowX: 'hidden',
          padding: '4px 0',
        }}>
          {OPTIONS.map(opt => (
            <div
              key={opt.value}
              onClick={() => { onChange(opt.value); setOpen(false); }}
              style={{
                padding: '8px 14px',
                fontSize: 13,
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
      )}
    </div>
  );
}

'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import type { DashboardData } from '@/lib/types';
import PeriodSelect from './PeriodSelect';
import LocationSelect from './LocationSelect';

interface HeaderProps {
  D: DashboardData;
  curEntity: string;
  curPeriod: string;
  activeTab: string;
  onEntityChange: (v: string) => void;
  onPeriodChange: (v: string) => void;
  onLogout: () => void;
}

const PERIOD_LABEL_MAP: Record<string, string> = {
  last12: "Last 12 Periods (P6'25–P5'26)",
  fy25: 'Full Year 2025 (P1–P12)',
  ytd26: 'YTD 2026 (P1–P5)',
  last6: 'Last 6 Periods',
  last3: 'Last 3 Periods',
  q1_25: 'Q1 2025 (P1–P3)',
  q2_25: 'Q2 2025 (P4–P6)',
  q3_25: 'Q3 2025 (P7–P9)',
  q4_25: 'Q4 2025 (P10–P12)',
  q1_26: 'Q1 2026 (P1–P3)',
};

function getPeriodBadge(curPeriod: string): string {
  return PERIOD_LABEL_MAP[curPeriod]?.split(' (')[0] ?? curPeriod;
}

export default function Header({ curEntity, curPeriod, activeTab, onEntityChange, onPeriodChange, onLogout }: HeaderProps) {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsAdmin(localStorage.getItem('wbr_role') === 'admin');
  }, []);

  return (
    <div className="hdr">
      <div className="hdr-brand">
        <div className="hdr-logo">
          <Image src="/rasa-logo.png" alt="RASA Logo" height={32} width={120} style={{ height: 32, width: 'auto' }} priority />
        </div>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span className="hdr-title">Financial Dashboard</span>
            <span className="hdr-badge">{getPeriodBadge(curPeriod)}</span>
          </div>
          <div className="hdr-sub">P1 2025 – P5 2026</div>
        </div>
      </div>

      <div className="hdr-right">
        <div className="hdr-controls">
          <div className="sel-wrap" style={{ display: activeTab === 'fullpnl' ? 'none' : '' }}>
            <span className="sel-label">Location</span>
            <LocationSelect value={curEntity} onChange={onEntityChange} />
          </div>

          <div className="sel-wrap">
            <span className="sel-label">Period</span>
            <PeriodSelect value={curPeriod} onChange={onPeriodChange} />
          </div>
        </div>

        <div className="hdr-kutlerri">
          <Image src="/kutlerri-logo.png" alt="Kutlerri Logo" height={28} width={120} style={{ height: 28, width: 'auto' }} priority />
        </div>

        {isAdmin && (
          <button className="logout-btn" style={{ marginRight: 6 }} onClick={() => router.push('/admin')}>Admin</button>
        )}
        <button className="logout-btn" onClick={onLogout}>Log out</button>
      </div>
    </div>
  );
}

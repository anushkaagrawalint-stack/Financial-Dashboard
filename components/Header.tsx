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

function getPeriodBadge(curPeriod: string): string {
  if (curPeriod === 'last12') return 'Last 12 Periods';
  if (curPeriod === 'last6') return 'Last 6 Periods';
  if (curPeriod === 'last3') return 'Last 3 Periods';
  if (/^ytd\d{2}$/.test(curPeriod)) return `YTD 20${curPeriod.slice(3)}`;
  if (/^fy\d{2}$/.test(curPeriod)) return `FY 20${curPeriod.slice(2)}`;
  if (/^q\d_\d{2}$/.test(curPeriod)) return `Q${curPeriod[1]} 20${curPeriod.slice(3)}`;
  return curPeriod;
}

export default function Header({ D, curEntity, curPeriod, activeTab, onEntityChange, onPeriodChange, onLogout }: HeaderProps) {
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
          {D.periods?.length > 0 && (
            <div className="hdr-sub">{D.periods[0]} – {D.periods[D.periods.length - 1]}</div>
          )}
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
            <PeriodSelect value={curPeriod} onChange={onPeriodChange} periods={D.periods} />
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

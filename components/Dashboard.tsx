'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import OverviewPanel from './panels/OverviewPanel';
import RevenuePanel from './panels/RevenuePanel';
import ExpensesPanel from './panels/ExpensesPanel';
import SummaryPanel from './panels/SummaryPanel';
import FullPnlPanel from './panels/FullPnlPanel';
import LocationsPanel from './panels/LocationsPanel';
import type { DashboardData } from '@/lib/types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'locations', label: 'Location Overview' },
  { id: 'revenue', label: 'Revenue Channels' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'summary', label: 'P&L Summary' },
  { id: 'fullpnl', label: 'Full P&L' },
];

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [curEntity, setCurEntity] = useState('Consolidated');
  const [curPeriod, setCurPeriod] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const tok = localStorage.getItem('wbr_token');
    if (!tok) { router.replace('/login'); return; }

    fetch('/api/dashboard-data', {
      headers: { Authorization: `Bearer ${tok}` },
    })
      .then(res => {
        if (res.status === 401) {
          localStorage.removeItem('wbr_token');
          localStorage.removeItem('wbr_role');
          document.cookie = 'wbr_token=; path=/; max-age=0; SameSite=Lax';
          setError('Session expired — redirecting to sign in…');
          setTimeout(() => router.replace('/login'), 2000);
          return null;
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((d: DashboardData | null) => {
        if (!d) return;
        setData(d);
        // Default to the most recent period
        if (d.periods?.length) setCurPeriod(d.periods[d.periods.length - 1]);
      })
      .catch(e => setError(e.message));
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('wbr_token');
    localStorage.removeItem('wbr_role');
    document.cookie = 'wbr_token=; path=/; max-age=0; SameSite=Lax';
    router.replace('/login');
  }

  if (error) {
    return (
      <div className="loading-screen">
        <span>Failed to load data: {error}</span>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="loading-screen">
        <div className="spinner" />
        <span>Loading…</span>
      </div>
    );
  }

  return (
    <>
      <Header
        D={data}
        curEntity={curEntity}
        curPeriod={curPeriod}
        activeTab={activeTab}
        onEntityChange={setCurEntity}
        onPeriodChange={setCurPeriod}
        onLogout={handleLogout}
      />

      <div className="tabs">
        {TABS.map(tab => (
          <div
            key={tab.id}
            className={`tab${activeTab === tab.id ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </div>
        ))}
      </div>

      <div className="main">
        {activeTab === 'overview' && (
          <OverviewPanel D={data} curEntity={curEntity} curPeriod={curPeriod} />
        )}
        {activeTab === 'locations' && (
          <LocationsPanel D={data} curPeriod={curPeriod} />
        )}
        {activeTab === 'revenue' && (
          <RevenuePanel D={data} curEntity={curEntity} curPeriod={curPeriod} />
        )}
        {activeTab === 'expenses' && (
          <ExpensesPanel D={data} curEntity={curEntity} curPeriod={curPeriod} />
        )}
        {activeTab === 'summary' && (
          <SummaryPanel D={data} curEntity={curEntity} curPeriod={curPeriod} />
        )}
        {activeTab === 'fullpnl' && (
          <FullPnlPanel D={data} curPeriod={curPeriod} />
        )}
      </div>

      <div className="footer">
        Kutlerri Analytics · R365 ·{' '}
        {data.periods.length > 0 ? `${data.periods[0]} – ${data.periods[data.periods.length - 1]}` : ''}
      </div>
    </>
  );
}

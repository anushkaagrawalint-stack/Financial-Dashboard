'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from './Header';
import OverviewPanel from './panels/OverviewPanel';
import RevenuePanel from './panels/RevenuePanel';
import ExpensesPanel from './panels/ExpensesPanel';
import SummaryPanel from './panels/SummaryPanel';
import FullPnlPanel from './panels/FullPnlPanel';
import D from '@/lib/dashboard-data.json';
import type { DashboardData } from '@/lib/types';

const data = D as unknown as DashboardData;

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'revenue', label: 'Revenue Channels' },
  { id: 'expenses', label: 'Expenses' },
  { id: 'summary', label: 'P&L Summary' },
  { id: 'fullpnl', label: 'Full P&L' },
];

export default function Dashboard() {
  const router = useRouter();
  const [authed, setAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [curEntity, setCurEntity] = useState('Consolidated');
  const [curPeriod, setCurPeriod] = useState('P5 2026');

  useEffect(() => {
    if (!localStorage.getItem('wbr_token')) {
      router.replace('/login');
    } else {
      setAuthed(true);
    }
  }, [router]);

  function handleLogout() {
    localStorage.removeItem('wbr_token');
    router.replace('/login');
  }

  if (!authed) {
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

      <div className="footer">Kutlerri Analytics · R365 /· P1 2025 – P5 2026</div>
    </>
  );
}

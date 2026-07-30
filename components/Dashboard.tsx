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
// Export All is commented out for now in favor of per-table/per-chart downloads.
// import { getChartImagesByPrefix } from '@/lib/chartRegistry';
// import { addOverviewSheet } from '@/lib/exportOverview';
// import { addLocationsSheet } from '@/lib/exportLocations';
// import { addRevenueSheet } from '@/lib/exportRevenue';
// import { addExpensesSheet } from '@/lib/exportExpenses';
// import { addSummarySheet } from '@/lib/exportSummary';
// import { addFullPnlSheet } from '@/lib/exportFullPnl';
// import { downloadWorkbook } from '@/lib/exportDownload';

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
  // const [exportingAll, setExportingAll] = useState(false); // Export All — commented out for now

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

  // Export All — commented out for now in favor of per-table/per-chart downloads.
  // function handleExportAll() {
  //   setExportingAll(true);
  // }
  //
  // // Tabs other than the active one are hidden-rendered off-screen (below) so
  // // their charts exist to be captured. The active tab's charts are already
  // // live in the registry — hidden-rendering it too would register a second
  // // instance under the same keys and wipe them out on unmount.
  // useEffect(() => {
  //   if (!exportingAll || !data) return;
  //   let cancelled = false;
  //   (async () => {
  //     // Give the hidden panels below time to mount and Chart.js time to paint.
  //     await new Promise(resolve => setTimeout(resolve, 600));
  //     if (cancelled) return;
  //     try {
  //       const ExcelJS = (await import('exceljs')).default;
  //       const wb = new ExcelJS.Workbook();
  //       addOverviewSheet(wb, data, curEntity, curPeriod, getChartImagesByPrefix('overview:'));
  //       addLocationsSheet(wb, data, curPeriod, getChartImagesByPrefix('locations:'));
  //       addRevenueSheet(wb, data, curEntity, curPeriod, getChartImagesByPrefix('revenue:'));
  //       addExpensesSheet(wb, data, curEntity, curPeriod, getChartImagesByPrefix('expenses:'));
  //       addSummarySheet(wb, data, curEntity, curPeriod, getChartImagesByPrefix('summary:'));
  //       addFullPnlSheet(wb, data, curPeriod, 'all');
  //       await downloadWorkbook(wb, `Financial Dashboard Export All - ${curEntity} - ${curPeriod}.xlsx`);
  //     } catch (e) {
  //       alert(e instanceof Error ? e.message : 'Export All failed');
  //     } finally {
  //       if (!cancelled) setExportingAll(false);
  //     }
  //   })();
  //   return () => { cancelled = true; };
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [exportingAll]);

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

      {/* Export All hidden-render container — commented out along with the feature above.
      {exportingAll && (
        <div style={{ position: 'fixed', top: 0, left: -99999, width: 1400, zIndex: -1, pointerEvents: 'none' }} aria-hidden>
          {activeTab !== 'overview' && <OverviewPanel D={data} curEntity={curEntity} curPeriod={curPeriod} />}
          {activeTab !== 'locations' && <LocationsPanel D={data} curPeriod={curPeriod} />}
          {activeTab !== 'revenue' && <RevenuePanel D={data} curEntity={curEntity} curPeriod={curPeriod} />}
          {activeTab !== 'expenses' && <ExpensesPanel D={data} curEntity={curEntity} curPeriod={curPeriod} />}
          {activeTab !== 'summary' && <SummaryPanel D={data} curEntity={curEntity} curPeriod={curPeriod} />}
        </div>
      )}
      */}

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

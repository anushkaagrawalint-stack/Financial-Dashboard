'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { DashboardData } from '@/lib/types';
import { agg, getIdx, fmt$, fmtPct, fmtVar, fmtVarPct, pctVar, varCls } from '@/lib/utils';
import { ALL_LOCS, SELECT_OPTIONS, GROUPS, PCT_LINE_KEYS, EXPENSE_KEYS, type SubItem } from '@/lib/fullPnlGroups';
import { computeDetailRow, ppDiff, type RowVals } from '@/lib/fullPnlCompute';
import { addFullPnlSheet } from '@/lib/exportFullPnl';
import { downloadWorkbook } from '@/lib/exportDownload';
import DownloadButton from '@/components/DownloadButton';

interface Props {
  D: DashboardData;
  curPeriod: string;
}

function cellFmtVal(v: number | null | undefined, pct: number | null | undefined): string {
  if (v == null) return '—';
  return fmt$(v) + ' (' + fmtPct(pct) + ')';
}

// ── Compare mode (All Locations): one combined "$ (%)" column per location ──

function rawCls(v: number, isExp: boolean): string {
  return v === 0 ? '' : varCls(v, isExp);
}

function LocCell({ D, loc, dataKey, idx, subtractKey, isExp }: { D: DashboardData; loc: string; dataKey: string; idx: number[]; subtractKey?: string; isExp?: boolean }) {
  const a = agg(D, loc, dataKey, idx);
  const v = subtractKey != null ? a.v - agg(D, loc, subtractKey, idx).v : a.v;
  const ts = agg(D, loc, 'Total Sales', idx).v || 1;
  const pct = v != null ? (v / ts) * 100 : null;
  return <td className={rawCls(v, !!isExp)} dangerouslySetInnerHTML={{ __html: cellFmtVal(v, pct) }} />;
}

function GrpRowComp({ D, lbl, dataKey, sub, locs, idx, open, onToggle, openSubs, onToggleSub, useEntity }: {
  D: DashboardData; lbl: string; dataKey: string; sub?: SubItem[];
  locs: string[]; idx: number[]; open: boolean; onToggle: () => void;
  openSubs: Set<string>; onToggleSub: (key: string) => void;
  useEntity?: string;
}) {
  const hasSub = sub && sub.length > 0;
  const isExp = EXPENSE_KEYS.has(dataKey);

  function renderCell(loc: string, key: string, subtractKey?: string) {
    if (useEntity) {
      if (loc !== 'Consolidated') return <td key={loc} dangerouslySetInnerHTML={{ __html: cellFmtVal(0, 0) }} />;
      const a = agg(D, useEntity, key, idx);
      const v = subtractKey != null ? a.v - agg(D, useEntity, subtractKey, idx).v : a.v;
      const ts = agg(D, 'Consolidated', 'Total Sales', idx).v || 1;
      const pct = v != null ? (v / ts) * 100 : null;
      return <td key={loc} className={rawCls(v, isExp)} dangerouslySetInnerHTML={{ __html: cellFmtVal(v, pct) }} />;
    }
    return <LocCell key={loc} D={D} loc={loc} dataKey={key} idx={idx} subtractKey={subtractKey} isExp={isExp} />;
  }

  const subRows: React.ReactNode[] = [];
  if (hasSub && open) {
    for (const s of sub!) {
      const hasChildren = !!(s.children && s.children.length > 0);
      const isSubOpen = openSubs.has(s.key);
      subRows.push(
        <tr key={s.key} className="sub-row"
          onClick={hasChildren ? () => onToggleSub(s.key) : undefined}
          style={{ cursor: hasChildren ? 'pointer' : undefined }}>
          <td style={{ paddingLeft: 34 }}>
            {hasChildren
              ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isSubOpen ? '▼' : '▶'}</span>
              : <span style={{ display: 'inline-block', width: 14 }} />
            }
            {s.lbl}
          </td>
          {locs.map(loc => renderCell(loc, s.key, s.subKey))}
        </tr>
      );
      if (hasChildren && isSubOpen) {
        for (const child of s.children!) {
          const hasGrandChildren = !!(child.children && child.children.length > 0);
          const isChildOpen = openSubs.has(child.key);
          subRows.push(
            <tr key={'c3-' + child.key} className="sub-row"
              onClick={hasGrandChildren ? () => onToggleSub(child.key) : undefined}
              style={{ cursor: hasGrandChildren ? 'pointer' : undefined }}>
              <td style={{ paddingLeft: 54 }}>
                {hasGrandChildren
                  ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isChildOpen ? '▼' : '▶'}</span>
                  : <span style={{ display: 'inline-block', width: 14 }} />
                }
                {child.lbl}
              </td>
              {locs.map(loc => renderCell(loc, child.key))}
            </tr>
          );
          if (hasGrandChildren && isChildOpen) {
            for (const gc of child.children!) {
              subRows.push(
                <tr key={'c4-' + gc.key} className="sub-row">
                  <td style={{ paddingLeft: 74 }}>
                    <span style={{ display: 'inline-block', width: 14 }} />
                    {gc.lbl}
                  </td>
                  {locs.map(loc => renderCell(loc, gc.key))}
                </tr>
              );
            }
          }
        }
      }
    }
  }

  return (
    <>
      <tr className="row-group-hdr" onClick={hasSub ? onToggle : undefined} style={hasSub ? { cursor: 'pointer' } : undefined}>
        <td>{hasSub && <span className="toggle-icon">{open ? '▼' : '▶'}</span>}{lbl}</td>
        {locs.map(loc => renderCell(loc, dataKey))}
      </tr>
      {subRows}
    </>
  );
}

function TotRow({ D, lbl, dataKey, locs, idx }: {
  D: DashboardData; lbl: string; dataKey: string; locs: string[]; idx: number[];
}) {
  return (
    <tr className="total-row">
      <td>{lbl}</td>
      {locs.map(loc => {
        const a = agg(D, loc, dataKey, idx);
        const ts = agg(D, loc, 'Total Sales', idx).v || 1;
        const pct = a.v ? (a.v / ts) * 100 : null;
        return <td key={loc} className={rawCls(a.v, EXPENSE_KEYS.has(dataKey))} dangerouslySetInnerHTML={{ __html: cellFmtVal(a.v, pct) }} />;
      })}
    </tr>
  );
}

function SecHdr({ label, colCount }: { label: string; colCount: number }) {
  return <tr className="sec-hdr"><td colSpan={colCount}>{label}</td></tr>;
}

// ── Detail mode (single entity): full Actual/Budget/PY + variance columns ──

function DetailCells({ row, isPctLine, isExp }: { row: RowVals | null; isPctLine?: boolean; isExp?: boolean }) {
  if (!row) {
    return <>{Array.from({ length: 10 }).map((_, i) => <td key={i}>—</td>)}</>;
  }
  const { v, b, py, actPct, budPct, pyPct } = row;
  const varBudPct = isPctLine ? ppDiff(actPct, budPct) : pctVar(v, b);
  const varPyPct = isPctLine ? ppDiff(actPct, pyPct) : pctVar(v, py);
  return (
    <>
      <td>{fmt$(v)}</td>
      <td>{fmtPct(actPct)}</td>
      <td>{fmt$(b)}</td>
      <td>{fmtPct(budPct)}</td>
      <td className={varCls(v - b, !!isExp)}>{fmtVar(v - b)}</td>
      <td className={varCls(varBudPct, !!isExp)}>{fmtVarPct(varBudPct)}</td>
      <td>{fmt$(py)}</td>
      <td>{fmtPct(pyPct)}</td>
      <td className={varCls(v - py, !!isExp)}>{fmtVar(v - py)}</td>
      <td className={varCls(varPyPct, !!isExp)}>{fmtVarPct(varPyPct)}</td>
    </>
  );
}

function DetailGrpRow({ D, selectedLoc, lbl, dataKey, sub, idx, open, onToggle, openSubs, onToggleSub, useEntity }: {
  D: DashboardData; selectedLoc: string; lbl: string; dataKey: string; sub?: SubItem[];
  idx: number[]; open: boolean; onToggle: () => void;
  openSubs: Set<string>; onToggleSub: (key: string) => void;
  useEntity?: string;
}) {
  const hasSub = sub && sub.length > 0;
  const rowVal = computeDetailRow(D, selectedLoc, dataKey, undefined, useEntity, idx);
  const isPctLine = PCT_LINE_KEYS.has(dataKey);
  const isExp = EXPENSE_KEYS.has(dataKey);

  const subRows: React.ReactNode[] = [];
  if (hasSub && open) {
    for (const s of sub!) {
      const hasChildren = !!(s.children && s.children.length > 0);
      const isSubOpen = openSubs.has(s.key);
      const sVal = computeDetailRow(D, selectedLoc, s.key, s.subKey, useEntity, idx);
      subRows.push(
        <tr key={s.key} className="sub-row"
          onClick={hasChildren ? () => onToggleSub(s.key) : undefined}
          style={{ cursor: hasChildren ? 'pointer' : undefined }}>
          <td style={{ paddingLeft: 34 }}>
            {hasChildren
              ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isSubOpen ? '▼' : '▶'}</span>
              : <span style={{ display: 'inline-block', width: 14 }} />
            }
            {s.lbl}
          </td>
          <DetailCells row={sVal} isPctLine={isPctLine} isExp={isExp} />
        </tr>
      );
      if (hasChildren && isSubOpen) {
        for (const child of s.children!) {
          const hasGrandChildren = !!(child.children && child.children.length > 0);
          const isChildOpen = openSubs.has(child.key);
          const childVal = computeDetailRow(D, selectedLoc, child.key, undefined, useEntity, idx);
          subRows.push(
            <tr key={'c3-' + child.key} className="sub-row"
              onClick={hasGrandChildren ? () => onToggleSub(child.key) : undefined}
              style={{ cursor: hasGrandChildren ? 'pointer' : undefined }}>
              <td style={{ paddingLeft: 54 }}>
                {hasGrandChildren
                  ? <span className="toggle-icon" style={{ fontSize: 9 }}>{isChildOpen ? '▼' : '▶'}</span>
                  : <span style={{ display: 'inline-block', width: 14 }} />
                }
                {child.lbl}
              </td>
              <DetailCells row={childVal} isPctLine={isPctLine} isExp={isExp} />
            </tr>
          );
          if (hasGrandChildren && isChildOpen) {
            for (const gc of child.children!) {
              const gcVal = computeDetailRow(D, selectedLoc, gc.key, undefined, useEntity, idx);
              subRows.push(
                <tr key={'c4-' + gc.key} className="sub-row">
                  <td style={{ paddingLeft: 74 }}>
                    <span style={{ display: 'inline-block', width: 14 }} />
                    {gc.lbl}
                  </td>
                  <DetailCells row={gcVal} isPctLine={isPctLine} isExp={isExp} />
                </tr>
              );
            }
          }
        }
      }
    }
  }

  return (
    <>
      <tr className="row-group-hdr" onClick={hasSub ? onToggle : undefined} style={hasSub ? { cursor: 'pointer' } : undefined}>
        <td>{hasSub && <span className="toggle-icon">{open ? '▼' : '▶'}</span>}{lbl}</td>
        <DetailCells row={rowVal} isPctLine={isPctLine} isExp={isExp} />
      </tr>
      {subRows}
    </>
  );
}

function DetailTotRow({ D, selectedLoc, lbl, dataKey, idx }: {
  D: DashboardData; selectedLoc: string; lbl: string; dataKey: string; idx: number[];
}) {
  const val = computeDetailRow(D, selectedLoc, dataKey, undefined, undefined, idx);
  return (
    <tr className="total-row">
      <td>{lbl}</td>
      <DetailCells row={val} />
    </tr>
  );
}

export default function FullPnlPanel({ D, curPeriod }: Props) {
  const idx = useMemo(() => getIdx(curPeriod, D.periods), [curPeriod, D.periods]);
  const rangeLabel = idx.length > 1
    ? `${D.periods[idx[0]]} – ${D.periods[idx[idx.length - 1]]} (${idx.length} periods)`
    : D.periods[idx[0]];

  const [selectedLoc, setSelectedLoc] = useState('all');
  const [ddOpen, setDdOpen] = useState(false);
  const ddRef = useRef<HTMLDivElement>(null);
  const [openGrps, setOpenGrps] = useState<Set<string>>(new Set());
  const [openSubs, setOpenSubs] = useState<Set<string>>(new Set());
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ddRef.current && !ddRef.current.contains(e.target as Node)) setDdOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function handleDownloadTable() {
    setExporting(true);
    try {
      const ExcelJS = (await import('exceljs')).default;
      const wb = new ExcelJS.Workbook();
      addFullPnlSheet(wb, D, curPeriod, selectedLoc);
      await downloadWorkbook(wb, `Full P&L - ${selectedLoc === 'all' ? 'All Locations' : selectedLoc} - ${curPeriod}.xlsx`);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Download failed');
    } finally {
      setExporting(false);
    }
  }

  const isCompare = selectedLoc === 'all';
  const activeLocs = ['Consolidated', ...ALL_LOCS];
  const colCount = 1 + (isCompare ? activeLocs.length : 10);

  function toggleGrp(key: string) {
    setOpenGrps(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function toggleSub(key: string) {
    setOpenSubs(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const ddLabel = selectedLoc === 'all' ? 'All Locations' : selectedLoc;

  return (
    <div className="panel active" id="panel-fullpnl">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <span className="sel-label" style={{ color: '#7c3aed' }}>Location</span>
        <div className="loc-dd-wrap" ref={ddRef}>
          <div className="loc-dd-trigger" onClick={() => setDdOpen(o => !o)}>
            <span>{ddLabel}</span>
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{ flexShrink: 0 }}>
              <path d="M0 0l5 6 5-6z" fill="#7c3aed" />
            </svg>
          </div>
          {ddOpen && (
            <div className="loc-dd-menu open">
              {SELECT_OPTIONS.map((opt, i) => (
                <div key={opt}>
                  <div
                    className={'loc-dd-item' + (opt === 'all' ? ' loc-dd-all' : '')}
                    onClick={() => { setSelectedLoc(opt); setDdOpen(false); }}
                  >
                    <span>{opt === 'all' ? 'All Locations' : opt}</span>
                  </div>
                  {i === 0 && <div className="loc-dd-sep" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="tcard">
        <div className="tcard-hdr">
          <div>
            <span className="tcard-title">Full P&L — {rangeLabel}</span>
            <span className="tcard-meta"> · {isCompare ? '$ (% of sales)' : 'Actual vs Budget vs Prior Year'}</span>
          </div>
          <DownloadButton label="Download table" busy={exporting} onClick={handleDownloadTable} />
        </div>
        <div className="tscroll">
          <table className="dtable dtable-sticky-first">
            <thead>
              {isCompare ? (
                <tr>
                  <th style={{ minWidth: 220 }}>Line Item</th>
                  {activeLocs.map(l => <th key={l} style={{ minWidth: 150 }}>{l}</th>)}
                </tr>
              ) : (
                <tr>
                  <th style={{ minWidth: 220 }}>Line Item</th>
                  <th>Actual $</th><th>Actual %</th>
                  <th>Budget $</th><th>Budget %</th>
                  <th>Var $ vs Bud</th><th>Var % vs Bud</th>
                  <th>PY $</th><th>PY %</th>
                  <th>Var $ vs PY</th><th>Var % vs PY</th>
                </tr>
              )}
            </thead>
            <tbody>
              {GROUPS.map((g, gi) => {
                if (g.type === 'sec') return <SecHdr key={gi} label={g.lbl} colCount={colCount} />;
                if (g.type === 'total') {
                  return isCompare
                    ? <TotRow key={gi} D={D} lbl={g.lbl} dataKey={g.key} locs={activeLocs} idx={idx} />
                    : <DetailTotRow key={gi} D={D} selectedLoc={selectedLoc} lbl={g.lbl} dataKey={g.key} idx={idx} />;
                }
                return isCompare ? (
                  <GrpRowComp
                    key={gi}
                    D={D}
                    lbl={g.lbl}
                    dataKey={g.key}
                    sub={g.sub}
                    locs={activeLocs}
                    idx={idx}
                    open={openGrps.has(g.key + gi)}
                    onToggle={() => toggleGrp(g.key + gi)}
                    openSubs={openSubs}
                    onToggleSub={toggleSub}
                    useEntity={g.useEntity}
                  />
                ) : (
                  <DetailGrpRow
                    key={gi}
                    D={D}
                    selectedLoc={selectedLoc}
                    lbl={g.lbl}
                    dataKey={g.key}
                    sub={g.sub}
                    idx={idx}
                    open={openGrps.has(g.key + gi)}
                    onToggle={() => toggleGrp(g.key + gi)}
                    openSubs={openSubs}
                    onToggleSub={toggleSub}
                    useEntity={g.useEntity}
                  />
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

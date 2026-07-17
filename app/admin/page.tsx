'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

interface PeriodStatus {
  idx: number;
  label: string;
  filename: string;
  exists: boolean;
  size: number;
  modified: string | null;
}

interface UserRecord {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

function fmtSize(bytes: number) {
  if (!bytes) return '—';
  return (bytes / 1024).toFixed(0) + ' KB';
}

function fmtDate(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

const PERIODS = ['P1','P2','P3','P4','P5','P6','P7','P8','P9','P10','P11','P12'];
const YEARS   = ['2025','2026','2027','2028'];

export default function AdminPage() {
  const router  = useRouter();
  const [token, setToken]           = useState<string | null>(null);
  const [activeTab, setActiveTab]   = useState<'data' | 'users'>('data');

  // ── Data tab state ─────────────────────────────────────
  const [periods, setPeriods]           = useState<PeriodStatus[]>([]);
  const [uploading, setUploading]       = useState<number | null>(null);
  const [deleting,  setDeleting]        = useState<number | null>(null);
  const [syncing,   setSyncing]         = useState(false);
  const [syncLog,   setSyncLog]         = useState('');
  const [uploadMsg, setUploadMsg]       = useState<{ idx: number; ok: boolean; msg: string } | null>(null);
  const [newPeriod, setNewPeriod]       = useState('P6');
  const [newYear,   setNewYear]         = useState('2026');
  const [newFile,   setNewFile]         = useState<File | null>(null);
  const [addMsg,    setAddMsg]          = useState<{ ok: boolean; msg: string } | null>(null);
  const [adding,    setAdding]          = useState(false);

  // ── Users tab state ────────────────────────────────────
  const [users,        setUsers]        = useState<UserRecord[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userMsg,      setUserMsg]      = useState<{ ok: boolean; msg: string } | null>(null);

  // Add user form
  const [newEmail,    setNewEmail]    = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole,     setNewRole]     = useState<'admin' | 'viewer'>('viewer');
  const [showNewPwd,  setShowNewPwd]  = useState(false);
  const [addingUser,  setAddingUser]  = useState(false);

  // Reset password inline state: { [userId]: string }
  const [resetPwds,    setResetPwds]    = useState<Record<string, string>>({});
  const [showPwds,     setShowPwds]     = useState<Record<string, boolean>>({});
  const [resettingPwd, setResettingPwd] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);
  const [changingRole, setChangingRole] = useState<string | null>(null);

  const logRef        = useRef<HTMLPreElement>(null);
  const fileInputRefs = useRef<Record<number, HTMLInputElement | null>>({});
  const newFileRef    = useRef<HTMLInputElement>(null);

  // ── Init: check token ──────────────────────────────────
  useEffect(() => {
    const t = localStorage.getItem('wbr_token');
    if (!t) { router.replace('/login'); return; }
    setToken(t);
  }, [router]);

  // ── Load period status ─────────────────────────────────
  const loadStatus = useCallback(async (t: string) => {
    const res = await fetch('/api/admin/status', { headers: { Authorization: `Bearer ${t}` } });
    if (res.status === 401 || res.status === 403) {
      localStorage.removeItem('wbr_token');
      router.replace('/login');
      return;
    }
    if (res.ok) setPeriods((await res.json()).periods);
  }, [router]);

  // ── Load users ─────────────────────────────────────────
  const loadUsers = useCallback(async (t: string) => {
    setUsersLoading(true);
    try {
      const res = await fetch('/api/admin/users', { headers: { Authorization: `Bearer ${t}` } });
      if (res.status === 401 || res.status === 403) {
        localStorage.removeItem('wbr_token');
        router.replace('/login');
        return;
      }
      if (res.ok) setUsers((await res.json()).users);
    } finally { setUsersLoading(false); }
  }, [router]);

  useEffect(() => {
    if (token) {
      loadStatus(token);
      loadUsers(token);
    }
  }, [token, loadStatus, loadUsers]);

  // ── Period actions ─────────────────────────────────────
  async function handleReplace(idx: number, file: File) {
    if (!token) return;
    setUploading(idx);
    setUploadMsg(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('idx', String(idx));
    try {
      const res  = await fetch('/api/admin/upload', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      setUploadMsg({ idx, ok: res.ok, msg: res.ok ? `✓ ${data.period} uploaded (${fmtSize(data.size)})` : `✗ ${data.error}` });
      if (res.ok) await loadStatus(token);
    } catch { setUploadMsg({ idx, ok: false, msg: '✗ Upload failed' }); }
    finally   { setUploading(null); }
  }

  async function handleAddPeriod() {
    if (!token || !newFile) return;
    setAdding(true);
    setAddMsg(null);
    const fd = new FormData();
    fd.append('file',   newFile);
    fd.append('period', newPeriod.replace('P', ''));
    fd.append('year',   newYear);
    try {
      const res  = await fetch('/api/admin/add-period', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const data = await res.json();
      if (res.ok) {
        setAddMsg({ ok: true, msg: `✓ ${data.period.label} added successfully` });
        setNewFile(null);
        if (newFileRef.current) newFileRef.current.value = '';
        await loadStatus(token);
      } else {
        setAddMsg({ ok: false, msg: `✗ ${data.error}` });
      }
    } catch { setAddMsg({ ok: false, msg: '✗ Request failed' }); }
    finally  { setAdding(false); }
  }

  async function handleDelete(idx: number, label: string) {
    if (!token) return;
    if (!confirm(`Delete ${label} and its Excel file? This cannot be undone.`)) return;
    setDeleting(idx);
    try {
      const res = await fetch('/api/admin/delete-period', { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ idx }) });
      const data = await res.json();
      if (res.ok) await loadStatus(token);
      else setUploadMsg({ idx, ok: false, msg: `✗ ${data.error}` });
    } catch { setUploadMsg({ idx, ok: false, msg: '✗ Delete failed' }); }
    finally  { setDeleting(null); }
  }

  async function handleSync() {
    if (!token) return;
    setSyncing(true);
    setSyncLog('Running ETL…\n');
    setUploadMsg(null);
    try {
      const res  = await fetch('/api/admin/sync', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setSyncLog(data.output || data.error || 'Unknown error');
      if (res.ok && data.ok) await loadStatus(token);
    } catch { setSyncLog('Network error — could not reach server.'); }
    finally  { setSyncing(false); }
  }

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [syncLog]);

  // ── User actions ───────────────────────────────────────
  async function handleAddUser() {
    if (!token || !newEmail || !newPassword) return;
    setAddingUser(true);
    setUserMsg(null);
    try {
      const res  = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, role: newRole }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserMsg({ ok: true, msg: `✓ User ${data.user.email} created successfully` });
        setNewEmail('');
        setNewPassword('');
        setNewRole('viewer');
        await loadUsers(token);
      } else {
        setUserMsg({ ok: false, msg: `✗ ${data.error}` });
      }
    } catch { setUserMsg({ ok: false, msg: '✗ Request failed' }); }
    finally  { setAddingUser(false); }
  }

  async function handleResetPassword(userId: string) {
    if (!token) return;
    const pwd = resetPwds[userId];
    if (!pwd || pwd.length < 6) { setUserMsg({ ok: false, msg: '✗ Password must be at least 6 characters' }); return; }
    setResettingPwd(userId);
    setUserMsg(null);
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pwd }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserMsg({ ok: true, msg: '✓ Password updated successfully' });
        setResetPwds(p => { const n = { ...p }; delete n[userId]; return n; });
        setShowPwds(p => { const n = { ...p }; delete n[userId]; return n; });
      } else {
        setUserMsg({ ok: false, msg: `✗ ${data.error}` });
      }
    } catch { setUserMsg({ ok: false, msg: '✗ Request failed' }); }
    finally  { setResettingPwd(null); }
  }

  async function handleChangeRole(userId: string, role: 'admin' | 'viewer') {
    if (!token) return;
    setChangingRole(userId);
    setUserMsg(null);
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });
      const data = await res.json();
      if (res.ok) {
        setUserMsg({ ok: true, msg: '✓ Role updated' });
        await loadUsers(token);
      } else {
        setUserMsg({ ok: false, msg: `✗ ${data.error}` });
      }
    } catch { setUserMsg({ ok: false, msg: '✗ Request failed' }); }
    finally  { setChangingRole(null); }
  }

  async function handleDeleteUser(userId: string, email: string) {
    if (!token) return;
    if (!confirm(`Delete user ${email}? They will immediately lose access.`)) return;
    setDeletingUser(userId);
    setUserMsg(null);
    try {
      const res  = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setUserMsg({ ok: true, msg: `✓ User ${email} deleted` });
        await loadUsers(token);
      } else {
        setUserMsg({ ok: false, msg: `✗ ${data.error}` });
      }
    } catch { setUserMsg({ ok: false, msg: '✗ Request failed' }); }
    finally  { setDeletingUser(null); }
  }

  const presentCount = periods.filter(p => p.exists).length;

  if (!token) return null;

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f1a', fontFamily: 'Montserrat, sans-serif', color: '#e2e8f0' }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#1e1b4b 0%,#312e81 100%)', padding: '20px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid rgba(124,58,237,0.3)' }}>
        <div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff' }}>RASA Admin</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Data & User Management</div>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => router.push('/dashboard')} style={ghost()}>← Dashboard</button>
          <button onClick={() => { localStorage.removeItem('wbr_token'); router.replace('/login'); }} style={ghost()}>Sign Out</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ borderBottom: '1px solid rgba(124,58,237,0.2)', background: 'rgba(255,255,255,0.01)' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', gap: 0 }}>
          {(['data', 'users'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Montserrat, sans-serif',
                padding: '14px 28px', fontSize: 13, fontWeight: 600,
                color: activeTab === tab ? '#a78bfa' : '#64748b',
                borderBottom: activeTab === tab ? '2px solid #7c3aed' : '2px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              {tab === 'data' ? '📊  Data Management' : '👥  User Management'}
            </button>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>

        {/* ═══════════ DATA TAB ═══════════ */}
        {activeTab === 'data' && (
          <>
            {/* Stats + Sync row */}
            <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
              <StatCard label="Period Files" value={`${presentCount} / ${periods.length}`} sub="uploaded" color={presentCount === periods.length ? '#10b981' : '#f59e0b'} />
              <StatCard label="Missing"      value={String(periods.length - presentCount)} sub="need upload" color={periods.length - presentCount > 0 ? '#ef4444' : '#10b981'} />
              <div style={{ flex: 1, minWidth: 260, background: 'rgba(124,58,237,0.08)', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 12, padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#c4b5fd' }}>Sync Dashboard Data</div>
                <div style={{ fontSize: 12, color: '#94a3b8' }}>After uploading files, run Sync All to regenerate the dashboard JSON from all periods.</div>
                <button onClick={handleSync} disabled={syncing} style={primary()}>
                  {syncing ? '⟳ Syncing…' : '⚡ Sync All Periods'}
                </button>
              </div>
            </div>

            {/* Sync log */}
            {syncLog && (
              <div style={{ marginBottom: 28, background: '#0d1117', border: '1px solid rgba(124,58,237,0.2)', borderRadius: 10, overflow: 'hidden' }}>
                <div style={{ padding: '8px 14px', background: 'rgba(124,58,237,0.12)', fontSize: 11, fontWeight: 700, color: '#a78bfa', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Sync Output</div>
                <pre ref={logRef} style={{ margin: 0, padding: 14, fontSize: 12, color: '#86efac', maxHeight: 220, overflowY: 'auto', overflowX: 'auto', fontFamily: 'ui-monospace, monospace', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {syncLog}
                </pre>
              </div>
            )}

            {/* Add New Period */}
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7', marginBottom: 4 }}>Add New Period</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Select the period and year, then upload the Excel file.</div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Period</label>
                  <select value={newPeriod} onChange={e => setNewPeriod(e.target.value)} style={selectStyle()}>
                    {PERIODS.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Year</label>
                  <select value={newYear} onChange={e => setNewYear(e.target.value)} style={selectStyle()}>
                    {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Excel File</label>
                  <div
                    onClick={() => newFileRef.current?.click()}
                    style={{ padding: '8px 14px', borderRadius: 7, fontSize: 12, cursor: 'pointer', border: '1px dashed rgba(16,185,129,0.4)', background: 'rgba(16,185,129,0.06)', color: newFile ? '#6ee7b7' : '#64748b', minWidth: 200, display: 'flex', alignItems: 'center', gap: 8 }}
                  >
                    <span style={{ fontSize: 16 }}>📂</span>
                    {newFile ? newFile.name : 'Click to choose .xlsx'}
                  </div>
                  <input ref={newFileRef} type="file" accept=".xlsx" style={{ display: 'none' }}
                    onChange={e => { setNewFile(e.target.files?.[0] ?? null); setAddMsg(null); }} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Will be saved as</label>
                  <div style={{ padding: '8px 12px', borderRadius: 7, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: 12, color: '#a78bfa', fontFamily: 'ui-monospace, monospace' }}>
                    {newPeriod} {newYear}.xlsx
                  </div>
                </div>

                <button onClick={handleAddPeriod} disabled={adding || !newFile} style={{ ...primary(), alignSelf: 'flex-end', opacity: !newFile ? 0.5 : 1 }}>
                  {adding ? 'Adding…' : '+ Add Period'}
                </button>
              </div>

              {addMsg && <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: addMsg.ok ? '#10b981' : '#ef4444' }}>{addMsg.msg}</div>}
            </div>

            {/* Period table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>All Periods</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>Click Replace to swap an existing period's file</span>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(124,58,237,0.07)' }}>
                    {['Period','Filename','Status','Size','Last Modified','Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((p, i) => (
                    <tr key={p.idx} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                      <td style={{ padding: '10px 16px', fontSize: 13, fontWeight: 600, color: '#c4b5fd' }}>{p.label}</td>
                      <td style={{ padding: '10px 16px', fontSize: 11, color: '#475569', fontFamily: 'ui-monospace, monospace' }}>{p.filename}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, fontWeight: 600, color: p.exists ? '#10b981' : '#ef4444', background: p.exists ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', padding: '2px 8px', borderRadius: 20 }}>
                          <span style={{ fontSize: 8 }}>●</span>{p.exists ? 'Ready' : 'Missing'}
                        </span>
                        {uploadMsg?.idx === p.idx && (
                          <span style={{ marginLeft: 8, fontSize: 11, color: uploadMsg.ok ? '#10b981' : '#ef4444' }}>{uploadMsg.msg}</span>
                        )}
                      </td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#94a3b8' }}>{fmtSize(p.size)}</td>
                      <td style={{ padding: '10px 16px', fontSize: 12, color: '#64748b' }}>{fmtDate(p.modified)}</td>
                      <td style={{ padding: '10px 16px' }}>
                        <input
                          ref={el => { fileInputRefs.current[p.idx] = el; }}
                          type="file" accept=".xlsx" style={{ display: 'none' }}
                          onChange={e => { const f = e.target.files?.[0]; if (f) handleReplace(p.idx, f); e.target.value = ''; }}
                        />
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={() => fileInputRefs.current[p.idx]?.click()} disabled={uploading === p.idx} style={small()}>
                            {uploading === p.idx ? 'Uploading…' : p.exists ? 'Replace' : 'Upload'}
                          </button>
                          <button onClick={() => handleDelete(p.idx, p.label)} disabled={deleting === p.idx} style={{ ...small(), color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}>
                            {deleting === p.idx ? '…' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: '#475569', textAlign: 'center' }}>
              After uploading, click <strong style={{ color: '#a78bfa' }}>Sync All Periods</strong> to rebuild the dashboard data.
            </div>
          </>
        )}

        {/* ═══════════ USERS TAB ═══════════ */}
        {activeTab === 'users' && (
          <>
            {/* Add User */}
            <div style={{ background: 'rgba(16,185,129,0.05)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 28 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: '#6ee7b7', marginBottom: 4 }}>Add New User</div>
              <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Create a new account. Admin users can access this panel; Viewer users can only see the dashboard.</div>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 200px' }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email" placeholder="user@example.com"
                    value={newEmail} onChange={e => setNewEmail(e.target.value)}
                    style={inputStyle()}
                  />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: '1 1 160px' }}>
                  <label style={labelStyle}>Password</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showNewPwd ? 'text' : 'password'}
                      placeholder="Min 6 characters"
                      value={newPassword} onChange={e => setNewPassword(e.target.value)}
                      style={{ ...inputStyle(), paddingRight: 40, width: '100%', boxSizing: 'border-box' }}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPwd(v => !v)}
                      style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#64748b' }}
                    >
                      {showNewPwd ? '🙈' : '👁'}
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <label style={labelStyle}>Role</label>
                  <select value={newRole} onChange={e => setNewRole(e.target.value as 'admin' | 'viewer')} style={selectStyle()}>
                    <option value="viewer">Viewer</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>

                <button
                  onClick={handleAddUser}
                  disabled={addingUser || !newEmail || !newPassword}
                  style={{ ...primary(), alignSelf: 'flex-end', opacity: (!newEmail || !newPassword) ? 0.5 : 1 }}
                >
                  {addingUser ? 'Creating…' : '+ Add User'}
                </button>
              </div>

              {userMsg && (
                <div style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: userMsg.ok ? '#10b981' : '#ef4444' }}>
                  {userMsg.msg}
                </div>
              )}
            </div>

            {/* Users table */}
            <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(124,58,237,0.15)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(124,58,237,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 14, fontWeight: 600 }}>All Users</span>
                <span style={{ fontSize: 12, color: '#64748b' }}>{users.length} account{users.length !== 1 ? 's' : ''}</span>
              </div>

              {usersLoading ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#475569', fontSize: 13 }}>Loading users…</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: 'rgba(124,58,237,0.07)' }}>
                      {['Email','Role','Created','Reset Password','Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.6px', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} style={{ borderTop: '1px solid rgba(255,255,255,0.04)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>

                        {/* Email */}
                        <td style={{ padding: '12px 16px', fontSize: 13, color: '#e2e8f0', fontWeight: 500 }}>{u.email}</td>

                        {/* Role selector */}
                        <td style={{ padding: '12px 16px' }}>
                          <select
                            value={u.role}
                            onChange={e => handleChangeRole(u.id, e.target.value as 'admin' | 'viewer')}
                            disabled={changingRole === u.id}
                            style={{
                              background: u.role === 'admin' ? 'rgba(124,58,237,0.18)' : 'rgba(16,185,129,0.12)',
                              color: u.role === 'admin' ? '#c4b5fd' : '#6ee7b7',
                              border: `1px solid ${u.role === 'admin' ? 'rgba(124,58,237,0.4)' : 'rgba(16,185,129,0.3)'}`,
                              borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 600,
                              fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', outline: 'none',
                            }}
                          >
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>

                        {/* Created */}
                        <td style={{ padding: '12px 16px', fontSize: 11, color: '#475569' }}>{fmtDate(u.createdAt)}</td>

                        {/* Reset password inline */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                            <div style={{ position: 'relative' }}>
                              <input
                                type={showPwds[u.id] ? 'text' : 'password'}
                                placeholder="New password"
                                value={resetPwds[u.id] || ''}
                                onChange={e => setResetPwds(p => ({ ...p, [u.id]: e.target.value }))}
                                style={{ ...inputStyle(), width: 150, paddingRight: 32, fontSize: 12 }}
                              />
                              <button
                                type="button"
                                onClick={() => setShowPwds(p => ({ ...p, [u.id]: !p[u.id] }))}
                                style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#64748b' }}
                              >
                                {showPwds[u.id] ? '🙈' : '👁'}
                              </button>
                            </div>
                            <button
                              onClick={() => handleResetPassword(u.id)}
                              disabled={!resetPwds[u.id] || resettingPwd === u.id}
                              style={{ ...small(), opacity: !resetPwds[u.id] ? 0.4 : 1, whiteSpace: 'nowrap' }}
                            >
                              {resettingPwd === u.id ? 'Saving…' : 'Set'}
                            </button>
                          </div>
                        </td>

                        {/* Delete */}
                        <td style={{ padding: '12px 16px' }}>
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            disabled={deletingUser === u.id}
                            style={{ ...small(), color: '#f87171', borderColor: 'rgba(239,68,68,0.3)', background: 'rgba(239,68,68,0.08)' }}
                          >
                            {deletingUser === u.id ? '…' : 'Delete'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div style={{ marginTop: 16, fontSize: 12, color: '#475569', textAlign: 'center' }}>
              Viewer accounts can only access the dashboard. Admin accounts have full access to this panel.
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${color}44`, borderRadius: 12, padding: '16px 20px', minWidth: 140 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>{sub}</div>
    </div>
  );
}

const base: React.CSSProperties = { fontFamily: 'Montserrat, sans-serif', cursor: 'pointer', border: 'none' };
const primary    = (): React.CSSProperties => ({ ...base, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', borderRadius: 8, padding: '9px 18px', fontSize: 13, fontWeight: 600 });
const ghost      = (): React.CSSProperties => ({ ...base, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 7, padding: '7px 14px', fontSize: 12, fontWeight: 500 });
const small      = (): React.CSSProperties => ({ ...base, background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600 });
const inputStyle = (): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(124,58,237,0.25)',
  borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: 'Montserrat, sans-serif', outline: 'none',
});
const selectStyle = (): React.CSSProperties => ({
  background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', border: '1px solid rgba(124,58,237,0.25)',
  borderRadius: 7, padding: '8px 12px', fontSize: 13, fontFamily: 'Montserrat, sans-serif',
  outline: 'none', cursor: 'pointer', minWidth: 100,
});
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' };

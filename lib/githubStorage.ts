// GitHub Contents API wrapper.
// Every write here is a real commit pushed to GITHUB_BRANCH.
// Vercel's GitHub integration detects the push and redeploys automatically,
// so changes are reflected in the next deployment without any manual step.

const OWNER  = process.env.GITHUB_OWNER;
const REPO   = process.env.GITHUB_REPO;
const BRANCH = process.env.GITHUB_BRANCH || 'main';
const TOKEN  = process.env.GITHUB_TOKEN;

const API = 'https://api.github.com';

function encodeGitPath(p: string) {
  return p.split('/').map(encodeURIComponent).join('/');
}

async function gh(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API}${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${TOKEN}`,
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    ...((options.headers as Record<string, string>) || {}),
  };
  // Retry transient 5xx errors with exponential backoff.
  const RETRYABLE = new Set([502, 503, 504]);
  let delay = 500;
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { ...options, headers });
    if (!RETRYABLE.has(res.status) || attempt === 2) return res;
    await new Promise(r => setTimeout(r, delay));
    delay *= 2;
  }
  throw new Error('GitHub request failed after retries');
}

type GHFile = { content: string; sha: string; download_url: string | null };

async function getContents(repoPath: string): Promise<GHFile | null> {
  const res = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeGitPath(repoPath)}?ref=${BRANCH}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`GitHub GET ${repoPath} failed: ${res.status} ${await res.text()}`);
  return res.json();
}

async function putFile(repoPath: string, buffer: Buffer, message: string): Promise<void> {
  const existing = await getContents(repoPath);
  const body: Record<string, unknown> = {
    message,
    content: buffer.toString('base64'),
    branch: BRANCH,
  };
  if (existing) body.sha = existing.sha;

  const res = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeGitPath(repoPath)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`GitHub PUT ${repoPath} failed: ${res.status} ${await res.text()}`);
}

// ── Users config (lib/users-config.json) ────────────────────────────────────

const USERS_CONFIG_PATH   = 'lib/users-config.json';
const PERIODS_CONFIG_PATH = 'lib/periods-config.json';

export function isGitHubConfigured(): boolean {
  return !!(TOKEN && OWNER && REPO);
}

// Fetches the users array from GitHub. Returns null if the file doesn't exist or
// GitHub is not configured.
export async function getUsersConfig<T>(): Promise<T | null> {
  if (!isGitHubConfigured()) return null;
  const data = await getContents(USERS_CONFIG_PATH);
  if (!data) return null;
  try {
    const text = Buffer.from(data.content, 'base64').toString('utf8');
    return JSON.parse(text) as T;
  } catch { return null; }
}

// Commits a new version of users-config.json to GitHub.
export async function saveUsersConfig<T>(value: T): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(value, null, 2));
  await putFile(USERS_CONFIG_PATH, buffer, 'Admin: update users');
}

// ── Periods config (lib/periods-config.json) ─────────────────────────────────

export async function getPeriodsConfig<T>(): Promise<T | null> {
  if (!isGitHubConfigured()) return null;
  const data = await getContents(PERIODS_CONFIG_PATH);
  if (!data) return null;
  try {
    const text = Buffer.from(data.content, 'base64').toString('utf8');
    return JSON.parse(text) as T;
  } catch { return null; }
}

export async function savePeriodsConfig<T>(value: T): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(value, null, 2));
  await putFile(PERIODS_CONFIG_PATH, buffer, 'Admin: update periods');
}

// ── Excel data files (Data/*.xlsx) ───────────────────────────────────────────

export async function saveDataFile(filename: string, buffer: Buffer): Promise<void> {
  await putFile(`Data/${filename}`, buffer, `Admin: upload ${filename}`);
}

// Fetch an xlsx file from GitHub. Returns null if not found.
// Handles both inline base64 (<1 MB) and download_url (larger files).
export async function getDataFileBuffer(filename: string): Promise<Buffer | null> {
  if (!isGitHubConfigured()) return null;
  const data = await getContents(`Data/${filename}`);
  if (!data) return null;
  if (data.content && data.content !== '') {
    return Buffer.from(data.content.replace(/\n/g, ''), 'base64');
  }
  if (data.download_url) {
    const res = await fetch(data.download_url, {
      headers: { Authorization: `Bearer ${TOKEN}` },
    });
    if (!res.ok) throw new Error(`GitHub download ${filename} failed: ${res.status}`);
    return Buffer.from(await res.arrayBuffer());
  }
  return null;
}

export async function deleteDataFile(filename: string): Promise<void> {
  const existing = await getContents(`Data/${filename}`);
  if (!existing) return; // already gone
  const res = await gh(`/repos/${OWNER}/${REPO}/contents/${encodeGitPath(`Data/${filename}`)}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: `Admin: delete ${filename}`, sha: existing.sha, branch: BRANCH }),
  });
  if (!res.ok && res.status !== 404) {
    throw new Error(`GitHub DELETE Data/${filename} failed: ${res.status} ${await res.text()}`);
  }
}

// ── Dashboard data (lib/dashboard-data.json) ─────────────────────────────────

const DASHBOARD_DATA_PATH = 'lib/dashboard-data.json';

export async function getDashboardData<T>(): Promise<T | null> {
  if (!isGitHubConfigured()) return null;
  const data = await getContents(DASHBOARD_DATA_PATH);
  if (!data) return null;
  try {
    const text = Buffer.from(data.content.replace(/\n/g, ''), 'base64').toString('utf8');
    return JSON.parse(text) as T;
  } catch { return null; }
}

export async function saveDashboardData(value: unknown): Promise<void> {
  const buffer = Buffer.from(JSON.stringify(value));
  await putFile(DASHBOARD_DATA_PATH, buffer, 'Admin: sync dashboard data');
}

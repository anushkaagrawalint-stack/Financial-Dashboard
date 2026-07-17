const TOKEN_KEY = 'wbr_token';
const ROLE_KEY  = 'wbr_role';

function token(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function getRole(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem(ROLE_KEY) || '';
}

export function authHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token()}` };
}

export function handle401(res: Response): void {
  if (res.status === 401 && typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLE_KEY);
    window.location.href = '/login';
  }
}

export async function login(email: string, password: string): Promise<{ token: string; user: { email: string; role: string } }> {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Login failed');
  return data;
}

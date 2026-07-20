import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { loadUsers } from '@/lib/users';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) {
    return NextResponse.json({ error: 'Email and password required' }, { status: 400 });
  }

  const users = await loadUsers();
  const normalized = String(email).toLowerCase().trim();
  const user = users.find(u => u.email === normalized);
  if (!user) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  }

  // Embed role in the token so verifyAdmin() can check it without a storage lookup.
  const token = jwt.sign(
    { email: normalized, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: '8h' },
  );

  const res = NextResponse.json({ token, user: { email: normalized, role: user.role } });
  // Set the cookie via the response header (not client-side document.cookie) so
  // middleware sees it reliably on the very next request — no client write/timing
  // dependency before the post-login navigation.
  res.cookies.set('wbr_token', token, {
    path: '/',
    maxAge: 28800,
    sameSite: 'lax',
  });
  return res;
}

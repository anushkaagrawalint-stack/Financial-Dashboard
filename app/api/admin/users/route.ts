import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadUsers, saveUsers } from '@/lib/users';
import bcrypt from 'bcryptjs';
import { randomUUID } from 'crypto';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const users = (await loadUsers()).map(({ id, email, role, createdAt }) => ({ id, email, role, createdAt }));
  return NextResponse.json({ users });
}

export async function POST(request: Request) {
  if (!verifyAdmin(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: { email?: string; password?: string; role?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { email, password, role } = body || {};
  if (!email || !password || !role) {
    return NextResponse.json({ error: 'email, password, and role are required' }, { status: 400 });
  }
  if (role !== 'admin' && role !== 'viewer') {
    return NextResponse.json({ error: 'role must be admin or viewer' }, { status: 400 });
  }

  const users = await loadUsers();
  const norm = String(email).toLowerCase().trim();
  if (users.find(u => u.email === norm)) {
    return NextResponse.json({ error: 'A user with that email already exists' }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = { id: randomUUID(), email: norm, passwordHash, role: role as 'admin' | 'viewer', createdAt: new Date().toISOString() };
  users.push(newUser);
  await saveUsers(users);

  return NextResponse.json({ ok: true, user: { id: newUser.id, email: newUser.email, role: newUser.role } });
}

import { NextResponse } from 'next/server';
import { verifyAdmin } from '@/lib/auth';
import { loadUsers, saveUsers } from '@/lib/users';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = verifyAdmin(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  let body: { password?: string; role?: string };
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const { password, role } = body || {};
  if (!password && !role) {
    return NextResponse.json({ error: 'Provide password or role to update' }, { status: 400 });
  }
  if (role && role !== 'admin' && role !== 'viewer') {
    return NextResponse.json({ error: 'role must be admin or viewer' }, { status: 400 });
  }

  const users = loadUsers();
  const idx = users.findIndex(u => u.id === id);
  if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  if (role && users[idx].email === caller.email && role !== 'admin') {
    return NextResponse.json({ error: 'Cannot change your own role' }, { status: 400 });
  }

  if (password) users[idx].passwordHash = await bcrypt.hash(password, 10);
  if (role)     users[idx].role = role as 'admin' | 'viewer';
  saveUsers(users);

  return NextResponse.json({ ok: true });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const caller = verifyAdmin(request);
  if (!caller) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const users = loadUsers();
  const user = users.find(u => u.id === id);
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
  if (user.email === caller.email) {
    return NextResponse.json({ error: 'Cannot delete your own account' }, { status: 400 });
  }

  saveUsers(users.filter(u => u.id !== id));
  return NextResponse.json({ ok: true });
}

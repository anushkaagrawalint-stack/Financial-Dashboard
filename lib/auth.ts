import jwt from 'jsonwebtoken';
import { loadUsers } from '@/lib/users';

export function verifyAuth(request: Request): { email: string } | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as { email: string };
  } catch {
    return null;
  }
}

export function verifyAdmin(request: Request): { email: string } | null {
  const decoded = verifyAuth(request);
  if (!decoded) return null;
  const user = loadUsers().find(u => u.email === decoded.email);
  if (!user || user.role !== 'admin') return null;
  return decoded;
}

// Kept for backward compatibility with login route
export function getUsers(): Record<string, string> {
  const map: Record<string, string> = {};
  for (const u of loadUsers()) map[u.email] = u.passwordHash;
  return map;
}

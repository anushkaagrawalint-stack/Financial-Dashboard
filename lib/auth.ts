import jwt from 'jsonwebtoken';

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

export function getUsers(): Record<string, string> {
  try {
    return JSON.parse(process.env.USERS_JSON || '{}');
  } catch {
    return {};
  }
}

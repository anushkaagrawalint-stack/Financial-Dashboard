import jwt from 'jsonwebtoken';

export interface AuthPayload { email: string; role?: string; }

// Verify the Bearer token; returns the decoded payload or null.
export function verifyAuth(request: Request): AuthPayload | null {
  const header = request.headers.get('authorization') || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, process.env.JWT_SECRET!) as AuthPayload;
  } catch {
    return null;
  }
}

// Returns the payload only when the JWT carries role === 'admin'.
// Role is embedded at login time — no storage lookup needed.
export function verifyAdmin(request: Request): AuthPayload | null {
  const payload = verifyAuth(request);
  return payload?.role === 'admin' ? payload : null;
}

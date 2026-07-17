import fs from 'fs';
import path from 'path';

export interface UserEntry {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export const USERS_CONFIG_PATH = path.join(process.cwd(), 'lib', 'users-config.json');

export function loadUsers(): UserEntry[] {
  try { return JSON.parse(fs.readFileSync(USERS_CONFIG_PATH, 'utf8')); }
  catch { return []; }
}

export function saveUsers(users: UserEntry[]): void {
  fs.writeFileSync(USERS_CONFIG_PATH, JSON.stringify(users, null, 2));
}

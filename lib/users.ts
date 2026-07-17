import fs from 'fs';
import path from 'path';
import { isGitHubConfigured, getUsersConfig, saveUsersConfig } from '@/lib/githubStorage';

export interface UserEntry {
  id: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
  createdAt: string;
}

export const USERS_CONFIG_PATH = path.join(process.cwd(), 'lib', 'users-config.json');

function readLocalUsers(): UserEntry[] {
  try { return JSON.parse(fs.readFileSync(USERS_CONFIG_PATH, 'utf8')); }
  catch { return []; }
}

// Reads from GitHub (always fresh) when configured; falls back to the bundled file.
export async function loadUsers(): Promise<UserEntry[]> {
  if (isGitHubConfigured()) {
    try {
      const fromGH = await getUsersConfig<UserEntry[]>();
      if (fromGH !== null) return fromGH;
    } catch { /* fall through to local file */ }
  }
  return readLocalUsers();
}

// Commits to GitHub when configured; writes to the local file otherwise (local dev).
export async function saveUsers(users: UserEntry[]): Promise<void> {
  if (isGitHubConfigured()) {
    await saveUsersConfig(users);
    return;
  }
  fs.writeFileSync(USERS_CONFIG_PATH, JSON.stringify(users, null, 2));
}

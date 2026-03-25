import type { AuthResponse, LoginRequest, RegisterRequest, User } from '@/types/auth.types';

const USERS_KEY = 'yoga_local_auth_users';
const SESSION_KEY = 'yoga_local_auth_session';

interface StoredUser extends User {
  password: string;
}

function readUsers(): StoredUser[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(USERS_KEY);
    const parsed = raw ? (JSON.parse(raw) as StoredUser[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeUsers(users: StoredUser[]): void {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function writeSession(session: AuthResponse | null): void {
  if (typeof window === 'undefined') return;

  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function stripPassword(user: StoredUser): User {
  const safeUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    role: user.role,
    avatar_url: user.avatar_url,
    is_active: user.is_active,
    created_at: user.created_at,
  };
  return safeUser;
}

function createToken(user: User): string {
  return `local-${user.id}-${Date.now()}`;
}

export function isOfflineAuthModeAvailable(): boolean {
  return true;
}

export async function localRegister(data: RegisterRequest): Promise<AuthResponse> {
  const users = readUsers();
  const email = data.email.trim().toLowerCase();
  const phone = data.phone.trim();

  if (users.some((user) => user.email === email)) {
    throw new Error('This email is already registered locally.');
  }

  if (users.some((user) => user.phone === phone)) {
    throw new Error('This phone number is already registered locally.');
  }

  const user: StoredUser = {
    id: users.length > 0 ? Math.max(...users.map((existingUser) => existingUser.id)) + 1 : 1,
    name: data.name.trim(),
    email,
    phone,
    password: data.password,
    role: 'user',
    avatar_url: null,
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const session = {
    user: stripPassword(user),
    access_token: createToken(user),
  };

  writeUsers([...users, user]);
  writeSession(session);

  return session;
}

export async function localLogin(data: LoginRequest): Promise<AuthResponse> {
  const users = readUsers();
  const email = data.email.trim().toLowerCase();
  const user = users.find((existingUser) => existingUser.email === email);

  if (!user || user.password !== data.password) {
    throw new Error('Invalid email or password.');
  }

  const session = {
    user: stripPassword(user),
    access_token: createToken(user),
  };

  writeSession(session);
  return session;
}

export async function localRefresh(): Promise<AuthResponse> {
  if (typeof window === 'undefined') {
    throw new Error('No local session found.');
  }

  const rawSession = window.localStorage.getItem(SESSION_KEY);
  if (!rawSession) {
    throw new Error('No local session found.');
  }

  const session = JSON.parse(rawSession) as AuthResponse;
  return {
    user: session.user,
    access_token: createToken(session.user),
  };
}

export async function localLogout(): Promise<void> {
  writeSession(null);
}

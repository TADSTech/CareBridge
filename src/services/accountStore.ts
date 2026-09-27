import { Message } from '../types';

const sessionKey = 'carebridge.auth.user';
export const accountsEnabled = import.meta.env.VITE_ACCOUNTS_ENABLED === 'true';
const pendingLoads = new Map<string, Promise<{ id: string; messages: Message[] }>>();

export interface AccountSession {
  user: { id: string; email: string };
}

function storeSession(session: AccountSession | null) {
  if (session) sessionStorage.setItem(sessionKey, JSON.stringify(session));
  else sessionStorage.removeItem(sessionKey);
}

export function getStoredSession(): AccountSession | null {
  try {
    const value = sessionStorage.getItem(sessionKey);
    return value ? JSON.parse(value) as AccountSession : null;
  } catch { return null; }
}

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 15_000);
  try {
    const response = await fetch(`/api${path}`, {
      ...init,
      signal: controller.signal,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.error || 'Account request failed.');
    return result as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The account service took too long to respond. Try again.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

async function authenticate(path: string, email: string, password: string): Promise<AccountSession> {
  const result = await apiRequest<{ user: AccountSession['user'] }>(path, {
    method: 'POST', body: JSON.stringify({ email, password }),
  });
  const session = { user: result.user };
  storeSession(session);
  return session;
}

export function signIn(email: string, password: string): Promise<AccountSession> {
  return authenticate('/auth/sign-in', email, password);
}

export function signUp(email: string, password: string): Promise<AccountSession> {
  return authenticate('/auth/sign-up', email, password);
}

export async function signOut(_session: AccountSession | null): Promise<void> {
  try { await apiRequest('/auth/sign-out', { method: 'POST', body: '{}' }); }
  finally { storeSession(null); }
}

export async function getValidSession(session: AccountSession): Promise<AccountSession> {
  const result = await apiRequest<{ user: AccountSession['user'] }>('/auth/me');
  if (session.user?.id === result.user?.id && session.user?.email === result.user?.email) return session;
  const refreshed = { user: result.user };
  storeSession(refreshed);
  return refreshed;
}

async function readOrCreateConsultation(): Promise<{ id: string; messages: Message[] }> {
  return apiRequest('/consultation');
}

export function loadConsultation(session: AccountSession): Promise<{ id: string; messages: Message[] }> {
  const pending = pendingLoads.get(session.user.id);
  if (pending) return pending;
  const promise = readOrCreateConsultation().finally(() => pendingLoads.delete(session.user.id));
  pendingLoads.set(session.user.id, promise);
  return promise;
}

export async function saveConsultation(id: string, messages: Message[], _session: AccountSession): Promise<void> {
  await apiRequest(`/consultation/${encodeURIComponent(id)}`, {
    method: 'PUT', body: JSON.stringify({ messages }),
  });
}

import { Message } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.replace(/\/$/, '');
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const sessionKey = 'carebridge.auth.session';

export const accountsEnabled = Boolean(supabaseUrl && supabaseKey);
const pendingLoads = new Map<string, Promise<{ id: string; messages: Message[] }>>();

export interface AccountSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: { id: string; email?: string };
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

async function authRequest(path: string, body: unknown, token?: string): Promise<any> {
  if (!supabaseUrl || !supabaseKey) throw new Error('Account sign-in is not configured.');
  const response = await fetch(`${supabaseUrl}/auth/v1/${path}`, {
    method: 'POST',
    headers: { apikey: supabaseKey, 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.msg || result.message || result.error_description || result.error || 'Account request failed.');
  return result;
}

function normalizeSession(raw: any): AccountSession | null {
  if (!raw?.access_token || !raw?.refresh_token || !raw?.user?.id) return null;
  return { access_token: raw.access_token, refresh_token: raw.refresh_token, expires_at: raw.expires_at || Math.floor(Date.now() / 1000) + (raw.expires_in || 3600), user: raw.user };
}

export async function signIn(email: string, password: string): Promise<AccountSession> {
  const session = normalizeSession(await authRequest('token?grant_type=password', { email, password }));
  if (!session) throw new Error('Account sign-in did not return a session.');
  storeSession(session);
  return session;
}

export async function signUp(email: string, password: string): Promise<AccountSession | null> {
  const session = normalizeSession(await authRequest('signup', { email, password }));
  if (session) storeSession(session);
  return session;
}

export async function signOut(session: AccountSession | null): Promise<void> {
  if (session) await authRequest('logout', {}, session.access_token).catch(() => undefined);
  storeSession(null);
}

export async function getValidSession(session: AccountSession): Promise<AccountSession> {
  if (session.expires_at > Math.floor(Date.now() / 1000) + 60) return session;
  const refreshed = normalizeSession(await authRequest('token?grant_type=refresh_token', { refresh_token: session.refresh_token }));
  if (!refreshed) { storeSession(null); throw new Error('Your session expired. Please sign in again.'); }
  storeSession(refreshed);
  return refreshed;
}

async function recordsRequest(path: string, session: AccountSession, init: RequestInit = {}): Promise<any> {
  if (!supabaseUrl || !supabaseKey) throw new Error('Consultation storage is not configured.');
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { apikey: supabaseKey, Authorization: `Bearer ${session.access_token}`, 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Could not save or load this consultation.');
  }
  if (response.status === 204) return null;
  return response.json();
}

async function readOrCreateConsultation(session: AccountSession): Promise<{ id: string; messages: Message[] }> {
  const rows = await recordsRequest('consultations?select=id,messages&order=updated_at.desc&limit=1', session);
  if (rows[0]) return { id: rows[0].id, messages: Array.isArray(rows[0].messages) ? rows[0].messages : [] };
  const created = await recordsRequest('consultations?select=id,messages', session, {
    method: 'POST', headers: { Prefer: 'return=representation' }, body: JSON.stringify({ owner_id: session.user.id, title: 'Consultation', messages: [] }),
  });
  if (!created[0]?.id) throw new Error('Could not create a consultation record.');
  return { id: created[0].id, messages: [] };
}

export function loadConsultation(session: AccountSession): Promise<{ id: string; messages: Message[] }> {
  const pending = pendingLoads.get(session.user.id);
  if (pending) return pending;
  const promise = readOrCreateConsultation(session).finally(() => pendingLoads.delete(session.user.id));
  pendingLoads.set(session.user.id, promise);
  return promise;
}

export async function saveConsultation(id: string, messages: Message[], session: AccountSession): Promise<void> {
  await recordsRequest(`consultations?id=eq.${encodeURIComponent(id)}`, session, {
    method: 'PATCH', body: JSON.stringify({ messages, updated_at: new Date().toISOString() }),
  });
}

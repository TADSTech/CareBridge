import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto';
import { promisify } from 'util';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from './db.js';

const scrypt = promisify(scryptCallback) as (password: string, salt: string, keylen: number, options?: { N?: number; r?: number; p?: number; maxmem?: number }) => Promise<Buffer>;
const sessionCookieName = 'carebridge_session';
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function readCookie(request: VercelRequest, name: string) {
  const raw = request.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

export function setSessionCookie(response: VercelResponse, token: string) {
  response.setHeader('Set-Cookie', `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}; Secure`);
}

export function clearSessionCookie(response: VercelResponse) {
  response.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0; Secure`);
}

export async function derivePasswordHash(password: string, salt: string) {
  const result = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return Buffer.from(result).toString('base64url');
}

export async function createAccountSession(response: VercelResponse, user: { id: string; email: string }) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000);
  const db = getDb();
  await db`DELETE FROM carebridge_sessions WHERE expires_at < now()`;
  await db`INSERT INTO carebridge_sessions (token_hash, user_id, expires_at)
    VALUES (${hashSessionToken(token)}, ${user.id}, ${expiresAt.toISOString()})`;
  setSessionCookie(response, token);
  return { id: user.id, email: user.email };
}

export async function authenticatedUser(request: VercelRequest) {
  const token = readCookie(request, sessionCookieName);
  if (!token) return null;
  const db = getDb();
  const rows = await db`SELECT u.id, u.email FROM carebridge_sessions s
    JOIN carebridge_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashSessionToken(token)} AND s.expires_at > now() LIMIT 1`;
  return rows[0] || null;
}

export function isSameSiteRequest(request: VercelRequest) {
  const site = request.headers['sec-fetch-site'];
  return !site || site === 'same-origin';
}

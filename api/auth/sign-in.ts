import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, ensureAccountSchema } from '../../lib/db';
import { derivePasswordHash, createAccountSession, isSameSiteRequest } from '../../lib/auth';
import { sendJson, readJson, checkAuthRateLimit } from '../../lib/helpers';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Cache-Control', 'no-store');

  if (!process.env.DATABASE_URL) { sendJson(response, 503, { error: 'Accounts are not configured. Add DATABASE_URL on the server and enable VITE_ACCOUNTS_ENABLED.' }); return; }
  if (!isSameSiteRequest(request)) { sendJson(response, 403, { error: 'This request was not allowed.' }); return; }
  if (!checkAuthRateLimit(request)) { sendJson(response, 429, { error: 'Too many sign-in attempts. Please wait a minute.' }); return; }

  try {
    await ensureAccountSchema();
    const { email, password } = await readJson(request);
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const db = getDb();
    const rows = await db`SELECT id, email, password_salt, password_hash FROM carebridge_users WHERE email = ${normalizedEmail} LIMIT 1`;
    if (typeof password !== 'string' || password.length > 128) { sendJson(response, 401, { error: 'Email or password is incorrect.' }); return; }
    const account = rows[0];
    const salt = account?.password_salt || 'carebridge-invalid-account-salt';
    const candidate = Buffer.from(await derivePasswordHash(password, salt), 'base64url');
    const saved = Buffer.from(account?.password_hash || Buffer.alloc(64).toString('base64url'), 'base64url');
    if (!account || candidate.length !== saved.length || !timingSafeEqual(candidate, saved)) { sendJson(response, 401, { error: 'Email or password is incorrect.' }); return; }
    const user = await createAccountSession(response, rows[0]);
    sendJson(response, 200, { user });
  } catch (error: any) {
    const status = error?.code === '23505' ? 409 : 500;
    const message = status === 409 ? 'An account with this email already exists.' : 'Account service could not complete the request.';
    sendJson(response, status, { error: message });
  }
}

function timingSafeEqual(a: Buffer, b: Buffer) {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a[i] ^ b[i];
  return result === 0;
}

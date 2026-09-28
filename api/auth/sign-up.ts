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
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || typeof password !== 'string' || password.length < 10 || password.length > 128) {
      sendJson(response, 400, { error: 'Enter a valid email and a password of 10 to 128 characters.' }); return;
    }
    const db = getDb();
    const salt = Buffer.from(await crypto.randomUUID()).toString('base64url').slice(0, 16);
    const passwordHash = await derivePasswordHash(password, salt);
    const rows = await db`INSERT INTO carebridge_users (email, password_salt, password_hash)
      VALUES (${normalizedEmail}, ${salt}, ${passwordHash}) RETURNING id, email`;
    const user = await createAccountSession(response, rows[0]);
    sendJson(response, 201, { user });
  } catch (error: any) {
    const status = error?.code === '23505' ? 409 : 500;
    const message = status === 409 ? 'An account with this email already exists.' : 'Account service could not complete the request.';
    sendJson(response, status, { error: message });
  }
}

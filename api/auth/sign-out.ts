import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb } from '../../lib/db';
import { hashSessionToken, readCookie, clearSessionCookie, isSameSiteRequest } from '../../lib/auth';
import { sendJson } from '../../lib/helpers';

const sessionCookieName = 'carebridge_session';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Cache-Control', 'no-store');

  if (!process.env.DATABASE_URL) { sendJson(response, 503, { error: 'Accounts are not configured.' }); return; }
  if (!isSameSiteRequest(request)) { sendJson(response, 403, { error: 'This request was not allowed.' }); return; }

  try {
    const token = readCookie(request, sessionCookieName);
    if (token) {
      const db = getDb();
      await db`DELETE FROM carebridge_sessions WHERE token_hash = ${hashSessionToken(token)}`;
    }
    clearSessionCookie(response);
    sendJson(response, 200, { ok: true });
  } catch {
    sendJson(response, 500, { error: 'Sign out failed.' });
  }
}

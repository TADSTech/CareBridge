import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, ensureAccountSchema } from '../../lib/db.js';
import { authenticatedUser, isSameSiteRequest } from '../../lib/auth.js';
import { sendJson } from '../../lib/helpers.js';

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Cache-Control', 'no-store');

  if (!process.env.DATABASE_URL) { sendJson(response, 503, { error: 'Accounts are not configured.' }); return; }
  if (!isSameSiteRequest(request)) { sendJson(response, 403, { error: 'This request was not allowed.' }); return; }

  try {
    await ensureAccountSchema();
    const user = await authenticatedUser(request);
    if (!user) { sendJson(response, 401, { error: 'Sign in to continue.' }); return; }
    sendJson(response, 200, { user });
  } catch {
    sendJson(response, 500, { error: 'Account service could not complete the request.' });
  }
}

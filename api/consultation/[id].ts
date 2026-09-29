import type { VercelRequest, VercelResponse } from '@vercel/node';
import { getDb, ensureAccountSchema } from '../../lib/db.js';
import { authenticatedUser, isSameSiteRequest } from '../../lib/auth.js';
import { sendJson, readJson } from '../../lib/helpers.js';

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
    const consultationId = (request.query.id as string) || '';
    if (!/^[0-9a-f-]{36}$/i.test(consultationId)) { sendJson(response, 404, { error: 'Consultation not found.' }); return; }
    const { messages } = await readJson(request, 250_000);
    if (!Array.isArray(messages) || messages.length > 500 || Buffer.byteLength(JSON.stringify(messages)) > 200_000) {
      sendJson(response, 400, { error: 'Consultation is too large or invalid.' }); return;
    }
    const db = getDb();
    const rows = await db`UPDATE consultations SET messages = ${JSON.stringify(messages)}::jsonb, updated_at = now()
      WHERE id = ${consultationId} AND owner_id = ${user.id} RETURNING id`;
    if (!rows.length) { sendJson(response, 404, { error: 'Consultation not found.' }); return; }
    sendJson(response, 200, { ok: true });
  } catch {
    sendJson(response, 500, { error: 'Account service could not complete the request.' });
  }
}

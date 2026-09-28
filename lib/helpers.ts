import type { VercelRequest, VercelResponse } from '@vercel/node';

export function sendJson(response: VercelResponse, status: number, body: unknown) {
  response.statusCode = status;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify(body));
}

export async function readJson(request: VercelRequest, limit = 24_000): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Request body is too large.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export async function readJsonLarge(request: VercelRequest, limit = 4_000_000): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Audio upload exceeds the 4 MB limit.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

export function xmlEscape(value: string) {
  return value.replace(/[<>&'"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char]);
}

export async function providerFetch(url: string, options: RequestInit, ms = 90_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

const rateLimits = new Map<string, number[]>();
const authRateLimits = new Map<string, number[]>();

export function checkRateLimit(request: VercelRequest, limit = 30, windowMs = 60_000) {
  const now = Date.now();
  const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  const recent = (rateLimits.get(clientIp) || []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  rateLimits.set(clientIp, recent);
  return true;
}

export function checkAuthRateLimit(request: VercelRequest, limit = 8, windowMs = 60_000) {
  const now = Date.now();
  const clientIp = (request.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || 'unknown';
  const key = `${clientIp}:auth`;
  const recent = (authRateLimits.get(key) || []).filter((time) => now - time < windowMs);
  if (recent.length >= limit) return false;
  recent.push(now);
  authRateLimits.set(key, recent);
  return true;
}

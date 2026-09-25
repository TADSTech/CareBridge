import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';
import { createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { neon } from '@neondatabase/serverless';

const port = Number(process.env.API_PORT || 3001);
const yarnUrl = 'https://api.yarngpt.ai/api/v1/streaming/conversation';
// Accept the documented NAIJALINGO_API_KEY and the earlier project spelling.
const ninejaApiKey = process.env.NAIJALINGO_API_KEY || process.env.NINEJALINGO_API_KEY;
const languageCodes = { english: 'en', yoruba: 'yo', hausa: 'ha', igbo: 'ig', swahili: 'sw' };
const languageNames = {
  english: 'English', pidgin: 'Nigerian Pidgin', yoruba: 'Yorùbá',
  hausa: 'Hausa', igbo: 'Igbo', swahili: 'Kiswahili', afrikaans: 'Afrikaans',
  amharic: 'Amharic', zulu: 'isiZulu',
};

const nationalVoice = {
  pidgin: { provider: '9jalingo', lang: 'pcm', voice: 'ada_pcm' },
  yoruba: { provider: '9jalingo', lang: 'yo', voice: 'adeola_yo' },
  hausa: { provider: '9jalingo', lang: 'ha', voice: 'aisha_ha' },
  igbo: { provider: '9jalingo', lang: 'ig', voice: 'adaeze_ig' },
  swahili: { provider: 'azure', voice: 'sw-KE-ZuriNeural' },
  afrikaans: { provider: 'azure', voice: 'af-ZA-AdriNeural' },
  amharic: { provider: 'azure', voice: 'am-ET-MekdesNeural' },
  zulu: { provider: 'azure', voice: 'zu-ZA-ThandoNeural' },
  english: { provider: 'azure', voice: process.env.AZURE_ENGLISH_VOICE || 'en-NG-EzinneNeural' },
};
const azureRecognitionLocale = { swahili: 'sw-KE', afrikaans: 'af-ZA', amharic: 'am-ET', zulu: 'zu-ZA' };

const database = process.env.DATABASE_URL ? neon(process.env.DATABASE_URL) : null;
const scrypt = promisify(scryptCallback);
const sessionCookieName = 'carebridge_session';
const sessionLifetimeSeconds = 7 * 24 * 60 * 60;
let accountSchemaReady;
const authRateLimits = new Map();

async function ensureAccountSchema() {
  if (!database) throw new Error('Database is not configured. Add a server-side DATABASE_URL.');
  if (!accountSchemaReady) accountSchemaReady = (async () => {
    await database`CREATE TABLE IF NOT EXISTS carebridge_users (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      email text NOT NULL UNIQUE,
      password_salt text NOT NULL,
      password_hash text NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await database`CREATE TABLE IF NOT EXISTS carebridge_sessions (
      token_hash text PRIMARY KEY,
      user_id uuid NOT NULL REFERENCES carebridge_users(id) ON DELETE CASCADE,
      expires_at timestamptz NOT NULL,
      created_at timestamptz NOT NULL DEFAULT now()
    )`;
    await database`CREATE INDEX IF NOT EXISTS carebridge_sessions_expiry_idx ON carebridge_sessions(expires_at)`;
    await database`CREATE TABLE IF NOT EXISTS consultations (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      owner_id uuid NOT NULL REFERENCES carebridge_users(id) ON DELETE CASCADE,
      title text NOT NULL DEFAULT 'Consultation',
      messages jsonb NOT NULL DEFAULT '[]'::jsonb,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CONSTRAINT carebridge_consultations_messages_array CHECK (jsonb_typeof(messages) = 'array'),
      CONSTRAINT carebridge_consultations_one_per_owner UNIQUE(owner_id)
    )`;
  })().catch((error) => { accountSchemaReady = undefined; throw error; });
  return accountSchemaReady;
}

function hashSessionToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

function readCookie(request, name) {
  const raw = request.headers.cookie || '';
  for (const part of raw.split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) return value.join('=');
  }
  return '';
}

function setSessionCookie(response, token) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookieName}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${sessionLifetimeSeconds}${secure}`);
}

function clearSessionCookie(response) {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
  response.setHeader('Set-Cookie', `${sessionCookieName}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`);
}

function sendJson(response, status, body) {
  response.writeHead(status, { 'content-type': 'application/json' });
  response.end(JSON.stringify(body));
}

function isSameSiteRequest(request) {
  const site = request.headers['sec-fetch-site'];
  return !site || site === 'same-origin';
}

async function derivePasswordHash(password, salt) {
  const result = await scrypt(password, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return Buffer.from(result).toString('base64url');
}

async function createAccountSession(response, user) {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + sessionLifetimeSeconds * 1000);
  await database`DELETE FROM carebridge_sessions WHERE expires_at < now()`;
  await database`INSERT INTO carebridge_sessions (token_hash, user_id, expires_at)
    VALUES (${hashSessionToken(token)}, ${user.id}, ${expiresAt.toISOString()})`;
  setSessionCookie(response, token);
  return { id: user.id, email: user.email };
}

async function authenticatedUser(request) {
  const token = readCookie(request, sessionCookieName);
  if (!token) return null;
  const rows = await database`SELECT u.id, u.email FROM carebridge_sessions s
    JOIN carebridge_users u ON u.id = s.user_id
    WHERE s.token_hash = ${hashSessionToken(token)} AND s.expires_at > now() LIMIT 1`;
  return rows[0] || null;
}

async function providerFetch(url, options, ms = 90_000) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);
  try { return await fetch(url, { ...options, signal: controller.signal }); }
  finally { clearTimeout(timeout); }
}

function xmlEscape(value) {
  return value.replace(/[<>&'\"]/g, (char) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '\"': '&quot;' })[char]);
}

async function createVoice(text, language) {
  const voice = nationalVoice[language];
  // YarnGPT supplies the Nigerian-English accent requested for the product.
  // Keep Azure as the English fallback when YarnGPT is not configured.
  if (language === 'english' && process.env.YARNGPT_API_KEY) {
    const payload = { text, output_format: 'mp3' };
    if (process.env.YARNGPT_DEFAULT_VOICE) payload.voice = process.env.YARNGPT_DEFAULT_VOICE.toLowerCase();
    return providerFetch(yarnUrl, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YARNGPT_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(payload) });
  }
  if (voice.provider === '9jalingo' && ninejaApiKey) {
    return providerFetch('https://api.9jalingo.org/v1/audio/speech', {
      method: 'POST',
      headers: { 'X-API-Key': ninejaApiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ input: text, lang: voice.lang, voice: process.env[`NINEJALINGO_${language.toUpperCase()}_VOICE`] || voice.voice, response_format: 'mp3' }),
    });
  }
  if (voice.provider === 'azure' && process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) {
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.voice.slice(0,5)}"><voice name="${voice.voice}">${xmlEscape(text)}</voice></speak>`;
    return providerFetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
      body: ssml,
    });
  }
  if (process.env.YARNGPT_API_KEY) {
    const payload = { text, output_format: 'mp3' };
    if (process.env.YARNGPT_DEFAULT_VOICE) payload.voice = process.env.YARNGPT_DEFAULT_VOICE.toLowerCase();
    return providerFetch(yarnUrl, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YARNGPT_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(payload) });
  }
  throw new Error(`No voice provider configured for ${language}.`);
}

async function transcribeWithAzure(audioBytes, language) {
  if (!process.env.AZURE_SPEECH_KEY || !process.env.AZURE_SPEECH_REGION) throw new Error('Azure transcription is not configured.');
  const locale = azureRecognitionLocale[language];
  const endpoint = `https://${process.env.AZURE_SPEECH_REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=${locale}&format=simple`;
  const response = await providerFetch(endpoint, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY,
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      Accept: 'application/json',
    },
    body: audioBytes,
  }, 60_000);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Azure transcription request failed (${response.status}).`);
  if (result.RecognitionStatus !== 'Success' || typeof result.DisplayText !== 'string' || !result.DisplayText.trim()) {
    throw new Error('No speech was recognized. Try again or type the message.');
  }
  return result.DisplayText.trim();
}

async function readJson(request, limit = 24_000) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > limit) throw new Error('Request body is too large.');
  }
  return JSON.parse(body);
}

async function readJsonLarge(request, limit = 14_000_000) {
  const chunks = []; let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) throw new Error('Audio upload exceeds the 10 MB limit.');
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

async function groqJson(system, input, schemaName, schema) {
  if (!process.env.GROQ_API_KEY) throw new Error('Text translation is not configured. Add GROQ_API_KEY to .env.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);
  let result;
  try {
    result = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        temperature: 0.1,
        max_completion_tokens: 1200,
        messages: [{ role: 'system', content: system }, { role: 'user', content: input }],
        response_format: { type: 'json_schema', json_schema: { name: schemaName, strict: true, schema } },
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
  if (!result.ok) {
    throw new Error(`Text translation service returned ${result.status}.`);
  }
  const data = await result.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error('Text translation service returned an empty response.');
  return JSON.parse(content);
}

const patientSchema = {
  type: 'object',
  properties: {
    englishTranslation: { type: 'string' },
    summary: { type: 'string' },
    onsetDuration: { type: 'string' },
    exacerbatingFactors: { type: 'array', items: { type: 'string' } },
    associatedSymptoms: { type: 'array', items: { type: 'string' } },
    recommendedQuestions: { type: 'array', items: { type: 'string' } },
  },
  required: ['englishTranslation', 'summary', 'onsetDuration', 'exacerbatingFactors', 'associatedSymptoms', 'recommendedQuestions'],
  additionalProperties: false,
};

const responseSchema = {
  type: 'object',
  properties: { simplifiedText: { type: 'string' }, translatedText: { type: 'string' } },
  required: ['simplifiedText', 'translatedText'],
  additionalProperties: false,
};

const server = createServer(async (request, response) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Cache-Control', 'no-store');
  if (process.env.NODE_ENV === 'production') response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  if (request.method === 'POST') {
    const now = Date.now();
    const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
    server.rateLimits ||= new Map();
    const recent = (server.rateLimits.get(clientIp) || []).filter((time) => now - time < 60_000);
    if (recent.length >= 30) { response.writeHead(429, { 'content-type': 'application/json', 'retry-after': '60' }); response.end(JSON.stringify({ error: 'Too many requests. Please wait a minute.' })); return; }
    recent.push(now); server.rateLimits.set(clientIp, recent);
  }
  if (request.method === 'GET' && url.pathname === '/api/health') {
    response.writeHead(200, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ ok: true, yarnConfigured: Boolean(process.env.YARNGPT_API_KEY), textConfigured: Boolean(process.env.GROQ_API_KEY), ninejaConfigured: Boolean(ninejaApiKey), azureConfigured: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION), accountsConfigured: Boolean(database) }));
    return;
  }
  if (process.env.NODE_ENV === 'production' && !url.pathname.startsWith('/api/')) return;
  const authPath = ['/api/auth/sign-up', '/api/auth/sign-in', '/api/auth/sign-out', '/api/auth/me'].includes(url.pathname);
  const consultationPath = url.pathname === '/api/consultation' || url.pathname.startsWith('/api/consultation/');
  if (authPath || consultationPath) {
    try {
      if (!database) { sendJson(response, 503, { error: 'Accounts are not configured. Add DATABASE_URL on the server and enable VITE_ACCOUNTS_ENABLED.' }); return; }
      await ensureAccountSchema();
      if (!isSameSiteRequest(request)) { sendJson(response, 403, { error: 'This request was not allowed.' }); return; }
      if (authPath && ['POST'].includes(request.method)) {
        const now = Date.now();
        const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() || request.socket.remoteAddress || 'unknown';
        const key = `${clientIp}:auth`;
        const recent = (authRateLimits.get(key) || []).filter((time) => now - time < 60_000);
        if (recent.length >= 8) { sendJson(response, 429, { error: 'Too many sign-in attempts. Please wait a minute.' }); return; }
        recent.push(now); authRateLimits.set(key, recent);
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/sign-up') {
        const { email, password } = await readJson(request);
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || typeof password !== 'string' || password.length < 10 || password.length > 128) {
          sendJson(response, 400, { error: 'Enter a valid email and a password of 10 to 128 characters.' }); return;
        }
        const salt = randomBytes(16).toString('base64url');
        const passwordHash = await derivePasswordHash(password, salt);
        const rows = await database`INSERT INTO carebridge_users (email, password_salt, password_hash)
          VALUES (${normalizedEmail}, ${salt}, ${passwordHash}) RETURNING id, email`;
        const user = await createAccountSession(response, rows[0]);
        sendJson(response, 201, { user }); return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/sign-in') {
        const { email, password } = await readJson(request);
        const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
        const rows = await database`SELECT id, email, password_salt, password_hash FROM carebridge_users WHERE email = ${normalizedEmail} LIMIT 1`;
        if (typeof password !== 'string' || password.length > 128) { sendJson(response, 401, { error: 'Email or password is incorrect.' }); return; }
        const account = rows[0];
        const salt = account?.password_salt || 'carebridge-invalid-account-salt';
        const candidate = Buffer.from(await derivePasswordHash(password, salt), 'base64url');
        const saved = Buffer.from(account?.password_hash || Buffer.alloc(64).toString('base64url'), 'base64url');
        if (!account || candidate.length !== saved.length || !timingSafeEqual(candidate, saved)) { sendJson(response, 401, { error: 'Email or password is incorrect.' }); return; }
        const user = await createAccountSession(response, rows[0]);
        sendJson(response, 200, { user }); return;
      }

      if (request.method === 'POST' && url.pathname === '/api/auth/sign-out') {
        const token = readCookie(request, sessionCookieName);
        if (token) await database`DELETE FROM carebridge_sessions WHERE token_hash = ${hashSessionToken(token)}`;
        clearSessionCookie(response); sendJson(response, 200, { ok: true }); return;
      }

      if (request.method === 'GET' && url.pathname === '/api/auth/me') {
        const user = await authenticatedUser(request);
        if (!user) { sendJson(response, 401, { error: 'Sign in to continue.' }); return; }
        sendJson(response, 200, { user }); return;
      }

      const user = await authenticatedUser(request);
      if (!user) { sendJson(response, 401, { error: 'Sign in to continue.' }); return; }
      if (request.method === 'GET' && url.pathname === '/api/consultation') {
        let rows = await database`SELECT id, messages FROM consultations WHERE owner_id = ${user.id} LIMIT 1`;
        if (!rows[0]) rows = await database`INSERT INTO consultations (owner_id, title, messages)
          VALUES (${user.id}, 'Consultation', '[]'::jsonb) RETURNING id, messages`;
        sendJson(response, 200, { id: rows[0].id, messages: Array.isArray(rows[0].messages) ? rows[0].messages : [] }); return;
      }
      const consultationId = url.pathname.match(/^\/api\/consultation\/([0-9a-f-]{36})$/i)?.[1];
      if (request.method === 'PUT' && consultationId) {
        const { messages } = await readJson(request, 250_000);
        if (!Array.isArray(messages) || messages.length > 500 || Buffer.byteLength(JSON.stringify(messages)) > 200_000) {
          sendJson(response, 400, { error: 'Consultation is too large or invalid.' }); return;
        }
        const rows = await database`UPDATE consultations SET messages = ${JSON.stringify(messages)}::jsonb, updated_at = now()
          WHERE id = ${consultationId} AND owner_id = ${user.id} RETURNING id`;
        if (!rows.length) { sendJson(response, 404, { error: 'Consultation not found.' }); return; }
        sendJson(response, 200, { ok: true }); return;
      }
      sendJson(response, 404, { error: 'Not found.' }); return;
    } catch (error) {
      const status = error?.code === '23505' ? 409 : 500;
      const message = status === 409 ? 'An account with this email already exists.' : 'Account service could not complete the request.';
      sendJson(response, status, { error: message }); return;
    }
  }
  if (request.method === 'POST' && url.pathname === '/api/asr') {
    try {
      if (!process.env.YARNGPT_API_KEY) throw new Error('YarnGPT transcription is not configured. Type your message or configure YARNGPT_API_KEY.');
      const { audioBase64, mimeType, language } = await readJsonLarge(request);
      if (typeof audioBase64 !== 'string' || !Object.hasOwn(languageNames, language)) throw new Error('Invalid audio or language.');
      const bytes = Buffer.from(audioBase64, 'base64');
      if (!bytes.length || bytes.length > 10_000_000) throw new Error('Audio upload is empty or larger than 10 MB.');
      if (Object.hasOwn(azureRecognitionLocale, language)) {
        if (!String(mimeType || '').toLowerCase().includes('wav')) throw new Error('This language requires a 16 kHz WAV recording. Try again or type your message.');
        const transcript = await transcribeWithAzure(bytes, language);
        sendJson(response, 200, { transcript });
        return;
      }
      const form = new FormData();
      form.append('file', new Blob([bytes], { type: mimeType || 'audio/webm' }), 'patient-audio.webm');
      const started = await providerFetch('https://api.yarngpt.ai/api/v1/asr', { method: 'POST', headers: { Authorization: `Bearer ${process.env.YARNGPT_API_KEY}`, 'Idempotency-Key': crypto.randomUUID() }, body: form });
      if (!started.ok) throw new Error(`YarnGPT transcription request failed (${started.status}).`);
      const job = await started.json();
      const jobId = job.job_id || job.id || job.data?.job_id || job.data?.id;
      let transcript = job.transcript || job.text || job.data?.transcript || job.data?.text;
      for (let attempt = 0; !transcript && jobId && attempt < 24; attempt++) {
        await new Promise((done) => setTimeout(done, 2500));
        const status = await providerFetch(`https://api.yarngpt.ai/api/v1/asr/${encodeURIComponent(jobId)}`, { headers: { Authorization: `Bearer ${process.env.YARNGPT_API_KEY}` } }, 15_000);
        if (!status.ok) throw new Error(`YarnGPT transcription status failed (${status.status}).`);
        const state = await status.json();
        transcript = state.transcript || state.text || state.data?.transcript || state.data?.text;
        if (['failed', 'error'].includes(state.status || state.data?.status)) throw new Error('YarnGPT could not transcribe this recording.');
      }
      if (typeof transcript !== 'string' || !transcript.trim()) throw new Error('Transcription is not ready. Try a shorter recording or type the message.');
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ transcript: transcript.trim() }));
    } catch (error) {
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: error instanceof Error ? error.message : 'Could not transcribe audio.' }));
    }
    return;
  }
  if (request.method === 'POST' && (url.pathname === '/api/process/patient' || url.pathname === '/api/process/clinician')) {
    try {
      const { text, language } = await readJson(request);
      if (typeof text !== 'string' || !text.trim() || text.length > 5000 || !Object.hasOwn(languageNames, language)) {
        response.writeHead(400, { 'content-type': 'application/json' });
        response.end(JSON.stringify({ error: 'Provide valid text (1–5,000 characters) and a supported language.' }));
        return;
      }
      const languageName = languageNames[language];
      let result;
      if (url.pathname.endsWith('/patient')) {
        const generated = await groqJson(
          'You translate patient statements into faithful, plain clinical English and make a brief intake draft. Do not diagnose, infer urgency, invent vital signs, medications, dates, or symptoms. Preserve uncertainty and the patient meaning. Put only explicitly stated symptoms in associatedSymptoms and only explicitly stated aggravators in exacerbatingFactors. Use "Not stated" for missing onset. Questions should clarify missing history, not suggest diagnoses. Return concise text.',
          `The patient spoke or wrote in ${languageName}. Translate faithfully into English, then produce the draft fields. Patient statement:\n${text.trim()}`,
          'patient_intake', patientSchema,
        );
        result = {
          translatedText: generated.englishTranslation,
          clinicalSummary: {
            primaryComplaint: generated.summary,
            onsetDuration: generated.onsetDuration,
            exacerbatingFactors: generated.exacerbatingFactors.slice(0, 6),
            associatedSymptoms: generated.associatedSymptoms.slice(0, 8),
            vitalsCheck: {},
            urgency: 'unassessed',
            recommendedQuestions: generated.recommendedQuestions.slice(0, 5),
            triageNotes: 'Draft only. No diagnosis, urgency assessment, or vital signs have been generated. Confirm the patient’s meaning with a qualified clinician.',
          },
        };
      } else {
        const generated = await groqJson(
          `You rewrite clinician instructions in plain, short English, then translate them into natural spoken ${languageName}. Keep the original meaning and all medication names, doses, timing, warnings, and follow-up instructions exact. Do not add medical advice, omit details, or diagnose. If the English is ambiguous, preserve the ambiguity in both outputs.`,
          `Clinician reply in English:\n${text.trim()}`,
          'clinician_reply', responseSchema,
        );
        result = generated;
      }
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end(JSON.stringify(result));
    } catch (error) {
      const message = error instanceof Error && error.name === 'AbortError'
        ? 'Text translation timed out. Try again.'
        : error instanceof Error ? error.message : 'Could not process the text.';
      response.writeHead(502, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: message }));
    }
    return;
  }
  if (request.method !== 'POST' || url.pathname !== '/api/tts') {
    response.writeHead(404).end('Not found');
    return;
  }
  try {
    const { text, language, translated } = await readJson(request);
    if (typeof text !== 'string' || !text.trim() || text.length > 5000 || !Object.hasOwn(languageNames, language)) {
      response.writeHead(400, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: 'Text must contain 1–5,000 characters.' }));
      return;
    }
    const audioResponse = await createVoice(text.trim(), language);
    if (!audioResponse.ok) {
      response.writeHead(audioResponse.status, { 'content-type': 'application/json' });
      response.end(JSON.stringify({ error: `Configured speech provider could not create audio (${audioResponse.status}).` }));
      return;
    }
    response.writeHead(200, { 'content-type': audioResponse.headers.get('content-type') || 'audio/mpeg', 'cache-control': 'no-store' });
    if (audioResponse.body) {
      for await (const chunk of audioResponse.body) response.write(chunk);
    }
    response.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not process the voice request.';
    if (!response.headersSent) response.writeHead(502, { 'content-type': 'application/json' });
    response.end(JSON.stringify({ error: message }));
  }
});

// Serve the built UI from the same origin in production. API keys never enter browser code.
server.on('request', async (request, response) => {
  if (process.env.NODE_ENV !== 'production' || request.url?.startsWith('/api/')) return;
  try {
    const relative = decodeURIComponent((request.url || '/').split('?')[0]).replace(/^\/+/, '') || 'index.html';
    const root = resolve('dist');
    const target = resolve(root, relative);
    if (target !== root && !target.startsWith(root + sep)) { response.writeHead(400).end(); return; }
    const data = await readFile(target).catch(() => readFile(resolve(root, 'index.html')));
    const type = target.endsWith('.js') ? 'text/javascript' : target.endsWith('.css') ? 'text/css' : target.endsWith('.svg') ? 'image/svg+xml' : target.endsWith('.png') ? 'image/png' : 'text/html; charset=utf-8';
    if (!response.headersSent) response.writeHead(200, { 'content-type': type });
    response.end(data);
  } catch { if (!response.headersSent) response.writeHead(404); response.end(); }
});

server.listen(port, '0.0.0.0', () => console.log(`CareBridge API listening on port ${port}`));

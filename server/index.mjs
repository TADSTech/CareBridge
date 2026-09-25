import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

const port = Number(process.env.API_PORT || 3001);
const yarnUrl = 'https://api.yarngpt.ai/api/v1/streaming/conversation';
// Accept the documented NAIJALINGO_API_KEY and the earlier project spelling.
const ninejaApiKey = process.env.NAIJALINGO_API_KEY || process.env.NINEJALINGO_API_KEY;
const languageCodes = { english: 'en', yoruba: 'yo', hausa: 'ha', igbo: 'ig', swahili: 'sw' };
const languageNames = {
  english: 'English', pidgin: 'Nigerian Pidgin', yoruba: 'Yorùbá',
  hausa: 'Hausa', igbo: 'Igbo', swahili: 'Kiswahili',
};

const nationalVoice = {
  pidgin: { provider: '9jalingo', lang: 'pcm', voice: 'ada_pcm' },
  yoruba: { provider: '9jalingo', lang: 'yo', voice: 'adeola_yo' },
  hausa: { provider: '9jalingo', lang: 'ha', voice: 'aisha_ha' },
  igbo: { provider: '9jalingo', lang: 'ig', voice: 'adaeze_ig' },
  swahili: { provider: 'azure', voice: 'sw-KE-ZuriNeural' },
  english: { provider: 'azure', voice: process.env.AZURE_ENGLISH_VOICE || 'en-NG-EzinneNeural' },
};

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
    if (process.env.YARNGPT_DEFAULT_VOICE) payload.voice = process.env.YARNGPT_DEFAULT_VOICE;
    return providerFetch(yarnUrl, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YARNGPT_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(payload) });
  }
  throw new Error(`No voice provider configured for ${language}.`);
}

async function readJson(request) {
  let body = '';
  for await (const chunk of request) {
    body += chunk;
    if (body.length > 24_000) throw new Error('Request body is too large.');
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
    response.end(JSON.stringify({ ok: true, yarnConfigured: Boolean(process.env.YARNGPT_API_KEY), textConfigured: Boolean(process.env.GROQ_API_KEY), ninejaConfigured: Boolean(ninejaApiKey), azureConfigured: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION) }));
    return;
  }
  if (process.env.NODE_ENV === 'production' && !url.pathname.startsWith('/api/')) return;
  if (request.method === 'POST' && url.pathname === '/api/asr') {
    try {
      if (!process.env.YARNGPT_API_KEY) throw new Error('YarnGPT transcription is not configured. Type your message or configure YARNGPT_API_KEY.');
      const { audioBase64, mimeType, language } = await readJsonLarge(request);
      if (typeof audioBase64 !== 'string' || !Object.hasOwn(languageNames, language)) throw new Error('Invalid audio or language.');
      const bytes = Buffer.from(audioBase64, 'base64');
      if (!bytes.length || bytes.length > 10_000_000) throw new Error('Audio upload is empty or larger than 10 MB.');
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

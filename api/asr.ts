import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, readJsonLarge, providerFetch } from '../lib/helpers.js';
import { transcribeWithAzure, azureRecognitionLocale } from '../lib/speech.js';

const languageNames: Record<string, string> = {
  english: 'English', pidgin: 'Nigerian Pidgin', yoruba: 'Yoruba',
  hausa: 'Hausa', igbo: 'Igbo', swahili: 'Kiswahili', afrikaans: 'Afrikaans',
  amharic: 'Amharic', zulu: 'isiZulu',
};

export default async function handler(request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Cache-Control', 'no-store');

  try {
    if (!process.env.YARNGPT_API_KEY) throw new Error('YarnGPT transcription is not configured. Type your message or configure YARNGPT_API_KEY.');
    const { audioBase64, mimeType, language } = await readJsonLarge(request);
    if (typeof audioBase64 !== 'string' || !Object.prototype.hasOwnProperty.call(languageNames, language)) throw new Error('Invalid audio or language.');
    const bytes = Buffer.from(audioBase64, 'base64');
    if (!bytes.length || bytes.length > 4_000_000) throw new Error('Audio upload is empty or larger than 4 MB.');
    if (Object.prototype.hasOwnProperty.call(azureRecognitionLocale, language)) {
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
    sendJson(response, 200, { transcript: transcript.trim() });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not transcribe audio.';
    sendJson(response, 502, { error: message });
  }
}

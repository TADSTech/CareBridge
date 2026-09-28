import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, readJson } from '../../lib/helpers';
import { createVoice } from '../../lib/speech';

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
    const { text, language } = await readJson(request);
    if (typeof text !== 'string' || !text.trim() || text.length > 5000 || !Object.prototype.hasOwnProperty.call(languageNames, language)) {
      sendJson(response, 400, { error: 'Text must contain 1-5,000 characters.' });
      return;
    }
    const audioResponse = await createVoice(text.trim(), language);
    if (!audioResponse.ok) {
      sendJson(response, audioResponse.status, { error: `Configured speech provider could not create audio (${audioResponse.status}).` });
      return;
    }
    response.statusCode = 200;
    response.setHeader('content-type', audioResponse.headers.get('content-type') || 'audio/mpeg');
    response.setHeader('cache-control', 'no-store');
    if (audioResponse.body) {
      for await (const chunk of audioResponse.body) response.write(chunk);
    }
    response.end();
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Could not process the voice request.';
    if (!response.headersSent) sendJson(response, 502, { error: message });
    else response.end(JSON.stringify({ error: message }));
  }
}

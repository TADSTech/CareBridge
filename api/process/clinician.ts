import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, readJson } from '../../lib/helpers.js';
import { groqJson, responseSchema } from '../../lib/ai.js';

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
      sendJson(response, 400, { error: 'Provide valid text (1-5,000 characters) and a supported language.' });
      return;
    }
    const languageName = languageNames[language];
    const generated = await groqJson(
      `You rewrite clinician instructions in plain, short English, then translate them into natural spoken ${languageName}. Keep the original meaning and all medication names, doses, timing, warnings, and follow-up instructions exact. Do not add medical advice, omit details, or diagnose. If the English is ambiguous, preserve the ambiguity in both outputs.`,
      `Clinician reply in English:\n${text.trim()}`,
      'clinician_reply', responseSchema,
    );
    sendJson(response, 200, generated);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Text translation timed out. Try again.'
      : error instanceof Error ? error.message : 'Could not process the text.';
    sendJson(response, 502, { error: message });
  }
}

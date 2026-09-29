import type { VercelRequest, VercelResponse } from '@vercel/node';
import { sendJson, readJson } from '../../lib/helpers.js';
import { groqJson, patientSchema } from '../../lib/ai.js';

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
      'You translate patient statements into faithful, plain clinical English and make a brief intake draft. Do not diagnose, infer urgency, invent vital signs, medications, dates, or symptoms. Preserve uncertainty and the patient meaning. Put only explicitly stated symptoms in associatedSymptoms and only explicitly stated aggravators in exacerbatingFactors. Use "Not stated" for missing onset. Questions should clarify missing history, not suggest diagnoses. Return concise text.',
      `The patient spoke or wrote in ${languageName}. Translate faithfully into English, then produce the draft fields. Patient statement:\n${text.trim()}`,
      'patient_intake', patientSchema,
    );
    const result = {
      translatedText: generated.englishTranslation,
      clinicalSummary: {
        primaryComplaint: generated.summary,
        onsetDuration: generated.onsetDuration,
        exacerbatingFactors: generated.exacerbatingFactors.slice(0, 6),
        associatedSymptoms: generated.associatedSymptoms.slice(0, 8),
        vitalsCheck: {},
        urgency: 'unassessed',
        recommendedQuestions: generated.recommendedQuestions.slice(0, 5),
        triageNotes: 'Draft only. No diagnosis, urgency assessment, or vital signs have been generated. Confirm the patient\'s meaning with a qualified clinician.',
      },
    };
    sendJson(response, 200, result);
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Text translation timed out. Try again.'
      : error instanceof Error ? error.message : 'Could not process the text.';
    sendJson(response, 502, { error: message });
  }
}

import { Language, ClinicalSummary } from '../types';

interface ProcessPatientInputResult {
  translatedText: string;
  clinicalSummary: ClinicalSummary;
}

export interface ProcessClinicianResponseResult {
  simplifiedText: string;
  translatedText: string;
}

async function processText<T>(path: string, text: string, language: Language): Promise<T> {
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, language }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(typeof result.error === 'string' ? result.error : 'Text translation failed.');
  }
  return result as T;
}

/** Groq-backed visible translation and draft formatting. */
export class AIEngine {
  static processPatientInput(text: string, language: Language): Promise<ProcessPatientInputResult> {
    return processText('/api/process/patient', text, language);
  }

  static processClinicianResponse(response: string, targetLanguage: Language): Promise<ProcessClinicianResponseResult> {
    return processText('/api/process/clinician', response, targetLanguage);
  }
}

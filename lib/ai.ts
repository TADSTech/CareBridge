import { providerFetch } from './helpers';

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

export async function groqJson(system: string, input: string, schemaName: string, schema: object) {
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

export { patientSchema, responseSchema };

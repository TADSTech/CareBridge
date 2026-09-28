import type { VercelRequest, VercelResponse } from '@vercel/node';

const ninejaApiKey = process.env.NAIJALINGO_API_KEY || process.env.NINEJALINGO_API_KEY;

export default function handler(_request: VercelRequest, response: VercelResponse) {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'no-referrer');
  response.setHeader('Permissions-Policy', 'microphone=(self)');
  response.setHeader('Cache-Control', 'no-store');
  response.statusCode = 200;
  response.setHeader('content-type', 'application/json');
  response.end(JSON.stringify({
    ok: true,
    yarnConfigured: Boolean(process.env.YARNGPT_API_KEY),
    textConfigured: Boolean(process.env.GROQ_API_KEY),
    ninejaConfigured: Boolean(ninejaApiKey),
    azureConfigured: Boolean(process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION),
    accountsConfigured: Boolean(process.env.DATABASE_URL),
  }));
}

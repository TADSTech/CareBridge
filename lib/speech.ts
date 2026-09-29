import { providerFetch, xmlEscape } from './helpers.js';

const yarnUrl = 'https://api.yarngpt.ai/api/v1/streaming/conversation';
const ninejaApiKey = process.env.NAIJALINGO_API_KEY || process.env.NINEJALINGO_API_KEY;

const nationalVoice: Record<string, { provider: string; lang?: string; voice: string }> = {
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

const azureRecognitionLocale: Record<string, string> = { swahili: 'sw-KE', afrikaans: 'af-ZA', amharic: 'am-ET', zulu: 'zu-ZA' };

export async function createVoice(text: string, language: string) {
  const voice = nationalVoice[language];
  if (language === 'english' && process.env.YARNGPT_API_KEY) {
    const payload: any = { text, output_format: 'mp3' };
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
    const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="${voice.voice.slice(0, 5)}"><voice name="${voice.voice}">${xmlEscape(text)}</voice></speak>`;
    return providerFetch(`https://${process.env.AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: 'POST',
      headers: { 'Ocp-Apim-Subscription-Key': process.env.AZURE_SPEECH_KEY, 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' },
      body: ssml,
    });
  }
  if (process.env.YARNGPT_API_KEY) {
    const payload: any = { text, output_format: 'mp3' };
    if (process.env.YARNGPT_DEFAULT_VOICE) payload.voice = process.env.YARNGPT_DEFAULT_VOICE.toLowerCase();
    return providerFetch(yarnUrl, { method: 'POST', headers: { Authorization: `Bearer ${process.env.YARNGPT_API_KEY}`, 'Content-Type': 'application/json', 'Idempotency-Key': crypto.randomUUID() }, body: JSON.stringify(payload) });
  }
  throw new Error(`No voice provider configured for ${language}.`);
}

export async function transcribeWithAzure(audioBytes: Buffer, language: string) {
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
    body: new Uint8Array(audioBytes),
  }, 60_000);
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Azure transcription request failed (${response.status}).`);
  if (result.RecognitionStatus !== 'Success' || typeof result.DisplayText !== 'string' || !result.DisplayText.trim()) {
    throw new Error('No speech was recognized. Try again or type the message.');
  }
  return result.DisplayText.trim();
}

export { azureRecognitionLocale };

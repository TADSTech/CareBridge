# CareBridge

CareBridge is a healthcare communication prototype for patients and care teams who do not share a comfortable language. A patient can describe what they feel, a clinician can review an intake draft, and the clinician can send a response that CareBridge translates to readable text and can speak aloud in the patient's selected language.

## Run locally

Requirements: Node.js 20.6 or newer and Bun (the checked-in lockfile uses Bun).

```sh
bun install
cp .env.example .env
```

Add a Groq key (`GROQ_API_KEY`) for visible text translation and draft formatting. Configure one or more speech providers: YarnGPT, 9jaLingo, or Azure Speech. Provider keys stay server-side; never give them a `VITE_` prefix. Start the API and frontend in separate terminals:

```sh
bun run dev:api
bun run dev
```

Open [http://localhost:3000](http://localhost:3000). The Vite server forwards `/api` requests to the local Node API on port 3001. When a configured voice API call fails, the app falls back to browser speech synthesis if a matching voice is available. Groq is required for visible text translation.

To enable accounts and saved consultations, create a Supabase project, run [database/schema.sql](database/schema.sql) in its SQL editor, and set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in `.env`. The app then shows sign-in/sign-up and saves each user's active consultation under Supabase Row Level Security. The anon key is intended for browser use; never put a Supabase service-role key in the frontend. Without those two settings, the demo runs without accounts and consultation messages stay only in memory. A Neon Postgres connection string belongs in server-only `DATABASE_URL`; it has been connection-tested, but consultation storage and accounts are not wired to Neon yet. Neon Auth must be enabled separately and its auth URL configured before the current Supabase account flow can be replaced.

## Text translation and speech

Groq translates patient statements into English and clinician responses into plain English plus the selected patient language. The text is shown in the app before optional speech generation. Speech routing uses YarnGPT for Nigerian English (to retain its regional accent), 9jaLingo for Pidgin, Yorùbá, Hausa, and Igbo, and Azure for Kiswahili. YarnGPT voice IDs are case-insensitive in `.env`; the current value is normalized to the provider's lowercase IDs.

The patient microphone records a short audio clip and sends it to YarnGPT's server-side ASR endpoint. The transcript is returned as editable text; it is never automatically sent to the clinician. YarnGPT's live ASR catalogue lists English, Yoruba, Igbo, Hausa, and Nigerian Pidgin; it does not list Kiswahili, so the app disables microphone transcription for Kiswahili and asks the patient to type instead. Audio is held in memory during the request and not written to disk by this app. Browser speech synthesis remains a fallback if a speech API call fails and the browser has a voice available.

### Other African voice options

- **9jaLingo** advertises Hausa, Igbo, Yoruba, and Nigerian Pidgin voices; the integration selects those language routes when `NAIJALINGO_API_KEY` is set (the earlier `NINEJALINGO_API_KEY` spelling is also accepted).
- **Microsoft Azure Speech** supplies Kiswahili and Nigerian English in this app. Its current catalogue also lists Afrikaans, Amharic, and isiZulu neural voices, plus regional English voices for Nigeria, Kenya, Ghana, Tanzania, and South Africa. These additional languages are not yet added to CareBridge's language picker or speech routing.
- **YarnGPT** is the current Nigerian-language choice for accent-aware English and TTS voices in English, Pidgin, Hausa, Yoruba, and Igbo. Its live ASR catalogue currently lists those same five languages.

Latest live smoke check (2026-09-25): Groq text processing passed for all six interface languages; Azure returned Kiswahili audio; 9jaLingo returned Pidgin, Yoruba, Hausa, and Igbo audio; YarnGPT returned Nigerian English audio and transcribed that recording back to “good morning please tell me how i can help you today.” (HTTP 200). YarnGPT's ASR language catalogue endpoint returned HTTP 200 and listed English, Yoruba, Igbo, Hausa, and Pidgin. These checks used fictional phrases. This confirms the provider request path, not recognition quality across accents or noisy clinic environments. Review provider voice catalogues and validate pronunciation and transcripts with native speakers before any care use.

## Current prototype limits

- Groq translates the patient's statement into English and prepares an intake draft. It does not diagnose, assess urgency, or generate vital signs. Clinicians must confirm the translation and assess the patient.
- Accounts and consultation load/save are wired to Supabase Auth and its REST API, with per-user row-level security in `database/schema.sql`. They require a configured Supabase project and have not been live-tested because this workspace has no Supabase settings. Neon Postgres can be used instead, but the current Supabase Auth/Data API code and policies are not a drop-in fit; this requires a Neon database adapter and compatible authentication setup.
- `Dockerfile` builds a single-origin production image. Supply the public Supabase URL and anon key as Docker build args to enable accounts. No live host, database, domain, or privacy review has been configured. Do not enter real patient data.
- YarnGPT's asynchronous ASR path has now been live-tested on generated English audio. Its catalogue lists five ASR languages, leaving Kiswahili without the app's cloud transcription path; manual text entry remains available. Azure's wider STT catalogue includes Afrikaans, Amharic, Kiswahili, and isiZulu, but CareBridge does not yet route microphone recordings to Azure.
- Translation, ASR, and voice output need review with fluent native speakers and licensed clinicians before any real-care use. See [validation/REVIEW_PROTOCOL.md](validation/REVIEW_PROTOCOL.md). No review or clinical sign-off has been completed.
- Supported interface languages are Nigerian Pidgin, Yorùbá, English, Hausa, Igbo, and Kiswahili.

## Project commands

- `bun run dev` — start the Vite frontend
- `bun run dev:api` — start the local text, ASR, and speech API
- `bun run build` — type-check and build the frontend
- `bun run lint` — run ESLint
- `bun run pitch` — render the pitch deck assets

## Structure

- `src/` — React app, interface, speech handling, and conservative intake formatting
- `server/` — Node API that keeps YarnGPT and Groq keys off the browser
- `pitch/` — pitch deck source assets

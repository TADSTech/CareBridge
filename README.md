# CareBridge

CareBridge is a healthcare communication prototype for patients and care teams who do not share a comfortable language. A patient can describe what they feel, a clinician can review an intake draft, and the clinician can send a response that CareBridge translates to readable text and can speak aloud in the patient's selected language.

## Run locally

Requirements: Node.js 20.6 or newer and Bun (the checked-in lockfile uses Bun).

```sh
bun install
cp .env.example .env
```

Add a Groq key (`GROQ_API_KEY`) for visible text translation and draft formatting. Configure one or more speech providers: YarnGPT, 9jaLingo, or Azure Speech. Provider keys stay server-side; never give them a `VITE_` prefix. Start both services together:

```sh
bun run dev:all
```

Open [http://localhost:3000](http://localhost:3000). The Vite server forwards `/api` requests to the local Node API on port 3001. Groq is required for visible text translation. Speech playback uses the configured provider for the selected language and displays the provider name; provider errors are shown in the app instead of silently switching to a browser voice.

To enable accounts and saved consultations, put the Neon connection string in server-only `DATABASE_URL` and set `VITE_ACCOUNTS_ENABLED=true` in `.env`. The Node API creates its account, session, and consultation tables on first use. Sign-in uses scrypt-hashed passwords and opaque, HTTP-only, same-site session cookies; the browser never receives the database URL or session token. Without both settings, the demo runs without accounts and consultation messages stay only in memory. This prototype auth has no email verification, password recovery, or MFA, so it is not ready for production accounts.

## Text translation and speech

Groq translates patient statements into English and clinician responses into plain English plus the selected patient language. The text is shown in the app before optional speech generation. Speech routing uses YarnGPT first for English, Yorùbá, Hausa, and Igbo, with 9jaLingo as a fallback for the three local languages. Pidgin uses 9jaLingo first and YarnGPT as a fallback. Kiswahili, Afrikaans, Amharic, and isiZulu use Azure neural voices. The speech response and playback notice identify the provider actually used, including when it had to fall back.

The patient microphone records a short audio clip and sends it to a server-side ASR endpoint. YarnGPT handles Nigerian English, Yoruba, Igbo, Hausa, and Nigerian Pidgin. Azure handles Kiswahili, Afrikaans, Amharic, and isiZulu using 16 kHz mono WAV audio converted in the browser before upload. The transcript is returned as editable text; it is never automatically sent to the clinician. Audio is held in memory during the request and not written to disk by this app. Clinician replies display the target-language translation before sending, and the send button remains disabled while that preview is processing.

### Other African voice options

- **9jaLingo** advertises Hausa, Igbo, Yoruba, and Nigerian Pidgin voices; the integration selects those language routes when `NAIJALINGO_API_KEY` is set (the earlier `NINEJALINGO_API_KEY` spelling is also accepted).
- **Microsoft Azure Speech** supplies Kiswahili, Afrikaans, Amharic, and isiZulu neural voices and speech recognition in this app. Regional English voices include Nigeria, Kenya, Ghana, Tanzania, and South Africa.
- **YarnGPT** is the current Nigerian-language choice for accent-aware English and TTS voices in English, Pidgin, Hausa, Yoruba, and Igbo. Its live ASR catalogue currently lists those same five languages.

Latest live smoke check (2026-09-25): Groq patient-intake and clinician-response translations passed for Afrikaans, Amharic, and isiZulu (HTTP 200); Azure generated audio and transcribed generated speech for Kiswahili, Afrikaans, Amharic, and isiZulu (all HTTP 200). The Neon-backed signup, sign-in, session check, consultation create/save/load, sign-out, and cross-account isolation checks passed end-to-end; test accounts and consultations were removed afterward. Previous checks also confirmed Groq for the six original languages, 9jaLingo audio for Pidgin, Yoruba, Hausa, and Igbo, and YarnGPT Nigerian English synthesis and transcription. These checks confirm provider paths, not recognition quality across accents or noisy clinic environments. Review translations, pronunciation, and transcripts with native speakers before any care use.

Latest local check (2026-09-27): both translation routes returned translated text and intake drafts for 16 of 18 language/route requests; two requests were rate-limited by Groq (HTTP 429), which the UI now surfaces for retry. YarnGPT English, 9jaLingo Yorùbá, and Azure isiZulu speech requests returned playable MP3 audio (HTTP 200) and named the provider in the response. Azure also synthesized an isiZulu 16 kHz WAV sample and the app's ASR endpoint returned the matching transcript (HTTP 200). Provider routing and response format were checked; this does not establish translation or pronunciation quality.

YarnGPT's live voice catalogue check (2026-09-27) listed its voices as supporting English, Pidgin, Hausa, Yorùbá, and Igbo. The configured YarnGPT voice is now the primary TTS route for English, Hausa, Yorùbá, and Igbo; the 9jaLingo fallback is attempted if YarnGPT is unavailable or returns an error.

Routing check (2026-09-27): YarnGPT returned MP3 audio (HTTP 200) for English, Hausa, Yorùbá, and Igbo. With YarnGPT intentionally given an invalid test credential, the request continued to 9jaLingo; that service returned HTTP 429 during this check, so fallback audio could not be confirmed while it was rate-limited.

## Current prototype limits

- Groq translates the patient's statement into English and prepares an intake draft. It does not diagnose, assess urgency, or generate vital signs. Clinicians must confirm the translation and assess the patient.
- Accounts and consultation load/save use the custom Neon-backed API. Tables are created on first account request. This prototype auth still needs email verification, password recovery, MFA, and independent security review.
- `Dockerfile` builds a single-origin production image. Set `VITE_ACCOUNTS_ENABLED=true` at build time and provide `DATABASE_URL` securely at runtime. No production host, domain, or privacy review has been configured. Do not enter real patient data.
- Human review of the Afrikaans, Amharic, and isiZulu translations, pronunciation, and transcripts is still needed. No clinical sign-off has been completed. See [validation/REVIEW_PROTOCOL.md](validation/REVIEW_PROTOCOL.md).
- Translation, ASR, and voice output need review with fluent native speakers and licensed clinicians before any real-care use. See [validation/REVIEW_PROTOCOL.md](validation/REVIEW_PROTOCOL.md). No review or clinical sign-off has been completed.
- Supported interface languages are Nigerian Pidgin, Yorùbá, English, Hausa, Igbo, Kiswahili, Afrikaans, Amharic, and isiZulu.

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

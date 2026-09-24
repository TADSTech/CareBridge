# CareBridge — Pitch Deck (12 Slides)

---

## Slide 1 — Hook: The Closed Door

**Being allowed in is not the same as being understood.**

Imagine walking into a hospital when you are sick, scared, and already struggling to explain what is wrong.

The person treating you speaks medical English. The language you are most comfortable speaking is Yoruba, Pidgin, Swahili, Luganda — or another local language.

You may be in the same room. You may have access to a doctor.

**You still may not have access to healthcare.**

That is the problem CareBridge is built to solve.

---

## Slide 2 — The Problem

**Language and health literacy are barriers to care — even when care is physically present.**

- Healthcare systems in Africa largely operate through English, while patients think and speak in local languages.
- Patients cannot accurately describe symptoms, history, or pain in a second language.
- Clinicians cannot reliably capture what the patient actually meant.
- Miscommunication leads to misdiagnosis risk, wasted clinic time, poor adherence, and loss of trust.
- Low health literacy compounds the problem: a patient may "read" English but still not understand a prescription or discharge instruction.

**Inclusion is not putting a hospital where people can reach it. It is making the healthcare experience understandable once they get there.**

---

## Slide 3 — Why It Matters (Evidence)

**The gap is documented, not anecdotal.**

| Signal | Finding |
| --- | --- |
| Nigeria medical education | **70.8%** of Nigerian medical students used Yoruba during clinical clerkship despite being taught in English. |
| Health literacy (Lagos) | **55%** of respondents reported difficulty learning about their medical condition because of problems understanding written information. |
| WHO guidance | Identifies health literacy and understandable, multilingual communication as core components of equitable healthcare access. |

Nigeria alone has hundreds of languages. Scale that across the continent and multilingual, low-literacy communication becomes a systemic infrastructure gap — not a niche translation problem.

---

## Slide 4 — The Solution

**CareBridge is an AI-powered communication layer between patients and healthcare workers.**

It helps both sides understand each other across language, literacy, and accessibility barriers — in real time, in the same room.

- **Patient side:** Speak naturally in your preferred language (voice or text).
- **Clinician side:** Receive a clear, structured clinical summary in medical English.
- **Loop closes:** Clinician responds in professional language; CareBridge converts it to simple, understandable language — as text **or speech** — in the patient's preferred language.

One conversation. Two languages. Zero information lost.

---

## Slide 5 — How It Works

**A two-way, structured translation loop — not raw machine translation.**

1. **Patient speaks** naturally in Yoruba, Pidgin, or their chosen language (mic or keyboard).
2. **CareBridge structures** the input into a clinical summary: chief complaint, onset, associated symptoms, exacerbating factors, vitals check, urgency/triage hint, and recommended follow-ups.
3. **Clinician reviews** the structured summary on a dedicated workspace (SOAP-style intake, patient profile, allergies, language).
4. **Clinician responds** in medical or standard English; CareBridge shows a **live translation preview** plus a plain-English simplification.
5. **Patient receives** the reply in their language — as text, with **one-tap text-to-speech** audio playback for low-literacy users.
6. **Split View** shows both perspectives side-by-side for live demos and side-by-side consultations.

Bi-directional. Structured. Audible.

---

## Slide 6 — What CareBridge Is NOT

**We draw a hard line around scope — on purpose.**

- ❌ We are **not** replacing doctors.
- ❌ We are **not** diagnosing patients.
- ❌ We are **not** a consumer app that asks sick people to pay.

✅ We are solving something more fundamental:

> **Making sure the patient can be heard — and making sure they can understand the person responsible for their care.**

CareBridge is communication infrastructure. Clinical judgment stays with the healthcare worker.

---

## Slide 7 — Product: Built for Real Clinics

**A working PWA with accessibility at the core — not a slide-ware mockup.**

**Languages (v1):** English · Nigerian Pidgin · Yoruba — voice, text, and plain-language output.

**Platform:**
- Installable **Progressive Web App (PWA)** — add to home screen, no app store.
- Works in **low-bandwidth / offline-ready** conditions (service worker + precache).
- Demo Script built in for a guided 60-second happy-path presentation.

**Accessibility (built in, not bolted on):**
- Text-size controls (normal / large / extra-large)
- High-contrast / enhanced-contrast mode
- Keyboard skip navigation + focus-visible rings
- `prefers-reduced-motion` support
- Spoken responses & auto-play voice for low-literacy users
- Adjustable speech rate

**Interfaces:**
- **Patient View** — voice-first intake, sample prompts, listening playback, live thread
- **Clinician View** — patient profile, intake vitals, structured summary, jargon simplifier, response composer with live preview
- **Split View** — both sides in one screen for real-time consultation

---

## Slide 8 — Expansion: Designed to Scale by Language

**The model is language-agnostic. The roadmap is continent-first.**

| Phase | Route | Region |
| --- | --- | --- |
| **Now (v1)** | Pidgin / Yoruba ↔ English | Nigeria |
| **Next** | Twi ↔ English | Ghana |
| **Next** | Swahili ↔ English | Kenya |
| **Next** | Luganda ↔ English | Uganda |
| **Then** | Multilingual healthcare communication | Anywhere language + health literacy create barriers to care |

Same architecture. New language packs. New clinics. The product does not need to be rebuilt to enter a new market — only extended.

---

## Slide 9 — Business Model: Providers Pay, Patients Benefit

**Sustainable by design — the people who need access are not the ones billed for it.**

CareBridge is **not** primarily a consumer app. Healthcare providers pay.

| Segment | How they buy |
| --- | --- |
| **Clinics & hospitals** | Subscription per facility or per healthcare worker |
| **Large health systems** | Enterprise deployment + admin controls |
| **NGOs & public health** | Deployments in underserved communities (mission-aligned pricing) |
| **Health platforms** | **API** — integrate CareBridge communication into existing products |

**Principle:** The people who need better access receive the benefit. The institutions providing that access become the customers.

---

## Slide 10 — Why Now / Why Us

**The timing and the wedge are aligned.**

- **Smartphone + PWA reach** is real even in low-resource clinics — no app-store friction.
- **AI speech + translation quality** has crossed the threshold for structured clinical summarization.
- **WHO and ministries** are actively pushing health literacy and equitable communication as policy.
- **Hackathon-proven build:** working end-to-end demo (voice → summary → clinician response → translated speech), PWA installable, accessibility audited, type-safe codebase (Bun + TypeScript + Vite).

**Wedge:** Start where the pain is sharpest — multilingual Nigerian clinics — then expand language-by-language, not feature-by-feature.

---

## Slide 11 — Vision

**CareBridge becomes the communication layer for equitable healthcare.**

Our long-term vision is simple:

> **CareBridge becomes the communication infrastructure that helps healthcare systems serve more people — without requiring every healthcare worker to speak every language.**

Imagine:
- A CHW in rural Uganda triaging in Luganda, summarized in English for a referral hospital.
- A discharge instruction in Pidgin audio, not just English paper.
- An EMR that stores the patient's *own words* alongside the clinician's note.

Language should never be the reason care fails.

---

## Slide 12 — Close & Ask

**Access to healthcare should mean more than being allowed through the hospital door.**

**It should mean being understood when you get there.**

---

### The ask

- **Pilot:** Partner with 1–2 clinics for a live pilot (Yoruba / Pidgin ↔ English).
- **Pilot partners:** NGO or public-health program serving multilingual communities.
- **Feedback:** Clinician + patient usability sessions to harden triage and summary quality.
- **Build partners:** Speech / translation contributors for Twi, Swahili, Luganda packs.

**CareBridge — be heard. be understood.**

---

*Source material: `carebridge-pitch-draft.md` · Product: CareBridge PWA · 12-slide structured pitch*

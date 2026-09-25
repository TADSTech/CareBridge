# Language and clinical review protocol

Do not use real patient information in this review. Reviewers should use invented, non-identifying scenarios and must not enter patient data into this repository.

For every language pair and voice configuration, have at least two fluent native speakers review independently and a licensed clinician review the clinical meaning. Record consent and reviewer qualifications outside this repository; do not commit names, contact details, patient data, or recordings.

For each fictional utterance, reviewers should score 1–5 and add notes for:

1. Meaning preserved, including negation, uncertainty, time, and body location.
2. Medication names, dose, frequency, route, and warning preserved exactly when present.
3. No added symptoms, diagnosis, or urgency judgment.
4. Plain English readability and local-language naturalness.
5. ASR word accuracy against the supplied script.
6. Voice pronunciation and intelligibility, including regional accent suitability.

Any changed dose, lost negation, invented fact, or unsafe ambiguity is an automatic fail. Do not use the feature for care until all high-risk failures are corrected and a clinician signs off. Re-run after changing providers or prompts.

Suggested spreadsheet columns: language, direction, fictional source phrase ID, reviewer role, each score above, error severity, correction required, retest result, review date. Keep raw recordings off the repo and delete them when review ends.

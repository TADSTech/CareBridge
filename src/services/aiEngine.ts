import { Language, ClinicalSummary, UrgencyLevel } from '../types';

interface ProcessPatientInputResult {
  translatedText: string;
  clinicalSummary: ClinicalSummary;
}

interface ProcessClinicianResponseResult {
  simplifiedText: string;
  translatedText: string;
}

/**
 * Intelligent AI Engine for CareBridge.
 * Translates patient speech/text to clinical summaries and clinician responses to accessible patient language.
 */
export class AIEngine {
  /**
   * Process patient input (natural voice/text in local language) into a clinical summary & English translation.
   */
  static async processPatientInput(
    text: string,
    language: Language
  ): Promise<ProcessPatientInputResult> {
    // Simulate real AI processing latency (400ms - 800ms) for realistic UX
    await new Promise((resolve) => setTimeout(resolve, 600));

    const lower = text.toLowerCase();

    // Primary Demo Path Match: Chest pain in Pidgin / English / Yoruba
    if (
      lower.includes('chest') ||
      lower.includes('pain me') ||
      lower.includes('breathe') ||
      lower.includes('irora') ||
      lower.includes('ẹgbẹ́')
    ) {
      if (language === 'pidgin') {
        return {
          translatedText: 'Patient reports persistent chest pain since yesterday, aggravated during deep inspiration.',
          clinicalSummary: {
            primaryComplaint: 'Chest Pain (Substernal / Pleuritic)',
            onsetDuration: 'Onset ~24 hours ago (Yesterday)',
            exacerbatingFactors: ['Deep breathing / Inspiration', 'Physical exertion'],
            associatedSymptoms: ['Mild shortness of breath on effort'],
            vitalsCheck: {
              temp: '37.1 °C (Normal)',
              bp: '128/82 mmHg',
              heartRate: '84 bpm',
              spo2: '98%',
            },
            urgency: 'urgent',
            recommendedQuestions: [
              'Have you experienced shortness of breath or dizziness?',
              'Does the pain radiate to your left arm or jaw?',
              'Have you had any fever, coughing, or chills?',
            ],
            triageNotes:
              'Requires acute cardiac & pulmonary evaluation. Rule out acute coronary syndrome, pleuritis, or pulmonary infection. Patient is alert.',
            icd10CategoryHint: 'R07.9 (Chest pain, unspecified)',
          },
        };
      } else if (language === 'yoruba') {
        return {
          translatedText: 'Patient experiences sudden flank/side pain with low-grade fever over 2 days.',
          clinicalSummary: {
            primaryComplaint: 'Flank Pain & Pyrexia',
            onsetDuration: '2 days duration',
            exacerbatingFactors: ['Movement', 'Bending'],
            associatedSymptoms: ['Chills / Mild Fever', 'Fatigue'],
            vitalsCheck: {
              temp: '38.4 °C (Elevated)',
              bp: '130/84 mmHg',
              heartRate: '92 bpm',
              spo2: '97%',
            },
            urgency: 'urgent',
            recommendedQuestions: [
              'Ṣé ẹ ni irora nígbà tí ẹ ba ń tọ̀ (burning sensation when urinating)?',
              'Have you noticed any nausea or vomiting?',
            ],
            triageNotes: 'Evaluate for renal calculus or urinary tract involvement. Collect urinalysis.',
            icd10CategoryHint: 'N39.0 (Urinary tract infection)',
          },
        };
      }
    }

    // High Fever & Severe Headache Scenario (Malaria / Infection symptoms)
    if (
      lower.includes('fever') ||
      lower.includes('headache') ||
      lower.includes('zazzabi') ||
      lower.includes('isi na-awa') ||
      lower.includes('otu tutu')
    ) {
      return {
        translatedText: 'Patient presents with severe headache, high fever, and body aches for 2-3 days.',
        clinicalSummary: {
          primaryComplaint: 'Acute Febrile Illness & Severe Cephalalgia',
          onsetDuration: '48 - 72 hours',
          exacerbatingFactors: ['Bright light', 'Physical movement'],
          associatedSymptoms: ['General malaise', 'Joint stiffness', 'Loss of appetite'],
          vitalsCheck: {
            temp: '38.9 °C (Febrile)',
            bp: '118/76 mmHg',
            heartRate: '96 bpm',
            spo2: '99%',
          },
          urgency: 'urgent',
          recommendedQuestions: [
            'Have you recently taken any antimalarial or antipyretic medication?',
            'Have you noticed neck stiffness or sensitivity to light?',
          ],
          triageNotes:
            'High suspicion for endemic febrile condition (e.g., Malaria / Typhoid). Order RDT/microscopy and CBC immediately.',
          icd10CategoryHint: 'B54 (Unspecified malaria)',
        },
      };
    }

    // Abdominal / Stomach Pain Scenario
    if (
      lower.includes('stomach') ||
      lower.includes('belly') ||
      lower.includes('tumbo') ||
      lower.includes('afo')
    ) {
      return {
        translatedText: 'Patient complains of severe right lower quadrant abdominal pain exacerbated by walking.',
        clinicalSummary: {
          primaryComplaint: 'Acute Abdominal Pain (Localized)',
          onsetDuration: 'Onset 18 hours ago',
          exacerbatingFactors: ['Ambulation / Walking', 'Coughing'],
          associatedSymptoms: ['Nausea', 'Low-grade fever', 'Anorexia'],
          vitalsCheck: {
            temp: '37.8 °C',
            bp: '122/80 mmHg',
            heartRate: '88 bpm',
          },
          urgency: 'urgent',
          recommendedQuestions: [
            'Does the pain start around your navel and move down to the right?',
            'When was your last bowel movement?',
          ],
          triageNotes: 'Perform physical examination for McBurney point tenderness. Rule out acute appendicitis.',
          icd10CategoryHint: 'K35.80 (Unspecified acute appendicitis)',
        },
      };
    }

    // Default Fallback dynamic structuring engine
    return {
      translatedText: `Patient reports: "${text}"`,
      clinicalSummary: {
        primaryComplaint: text.length > 50 ? text.substring(0, 50) + '...' : text,
        onsetDuration: 'Recently reported',
        exacerbatingFactors: ['Daily activities'],
        associatedSymptoms: ['General discomfort reported'],
        vitalsCheck: {
          temp: '37.0 °C',
          bp: '120/80 mmHg',
          heartRate: '75 bpm',
          spo2: '98%',
        },
        urgency: 'routine',
        recommendedQuestions: [
          'How long have you felt these symptoms?',
          'Are you currently taking any prescription medications?',
        ],
        triageNotes: 'General triage intake. Communication layer active.',
        icd10CategoryHint: 'Z00.00 (General medical examination)',
      },
    };
  }

  /**
   * Process clinician response (medical English) into accessible plain text and local target language.
   */
  static async processClinicianResponse(
    response: string,
    targetLanguage: Language
  ): Promise<ProcessClinicianResponseResult> {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const lower = response.toLowerCase();

    // Primary Demo Path response: "Have you experienced shortness of breath or fever?"
    if (
      lower.includes('shortness of breath') ||
      lower.includes('fever') ||
      lower.includes('dizziness') ||
      lower.includes('breathe')
    ) {
      if (targetLanguage === 'pidgin') {
        return {
          simplifiedText: 'Checking for breathing difficulty or high body temperature.',
          translatedText: 'You dey find am hard to breathe, or your head dey turn you, or you get fever?',
        };
      } else if (targetLanguage === 'yoruba') {
        return {
          simplifiedText: 'Checking for difficulty breathing or fever.',
          translatedText: 'Ṣé ẹ̀ẹ́ ní ìṣòro láti mí, tàbí ẹ ń ni oyí pẹ̀lú ibà?',
        };
      } else if (targetLanguage === 'hausa') {
        return {
          simplifiedText: 'Checking for breathing problems or fever.',
          translatedText: 'Shin kina da matsalar numfashi, ko kina jin jiri ko zazzabi?',
        };
      } else if (targetLanguage === 'igbo') {
        return {
          simplifiedText: 'Checking for breathing issues or fever.',
          translatedText: 'Ị na-enwe nsogbu iku ume, ka vertigo na ahụ ọkụ na-eme gị?',
        };
      } else if (targetLanguage === 'swahili') {
        return {
          simplifiedText: 'Checking for breathing difficulty or fever.',
          translatedText: 'Je, umekuwa ukipata shida ya kupumua, kizunguzungu au homa?',
        };
      }
    }

    // Prescription / Medication instructions example
    if (lower.includes('take') || lower.includes('medication') || lower.includes('tablet') || lower.includes('water')) {
      if (targetLanguage === 'pidgin') {
        return {
          simplifiedText: 'Take 2 pills every morning after food with plenty of water.',
          translatedText: 'Drink two tablets every morning after you chop food, with plenty water.',
        };
      } else if (targetLanguage === 'yoruba') {
        return {
          simplifiedText: 'Take 2 tablets daily after eating.',
          translatedText: 'Mu egbogi meji ni aaro gbogbo lẹhin ti o ba jẹun pẹlu omi pupọ.',
        };
      }
    }

    // Default Fallback simplified translations
    if (targetLanguage === 'pidgin') {
      return {
        simplifiedText: 'Doctor is asking to understand your symptoms better.',
        translatedText: `Doctor talk say: "${response}"`,
      };
    } else if (targetLanguage === 'yoruba') {
      return {
        simplifiedText: 'Doctor seeks clarification on your health condition.',
        translatedText: `Dókítà sọ pé: "${response}"`,
      };
    }

    return {
      simplifiedText: 'Clear summary of healthcare provider instructions.',
      translatedText: response,
    };
  }
}

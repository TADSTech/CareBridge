export type Language = 'pidgin' | 'yoruba' | 'english' | 'hausa' | 'igbo' | 'swahili';

export interface LanguageOption {
  id: Language;
  name: string;
  nativeName: string;
  flag: string;
  region: string;
  sampleInput: string;
  sampleTranslation: string;
}

export type Perspective = 'patient' | 'clinician' | 'split';

export type UrgencyLevel = 'routine' | 'urgent' | 'emergency';

export interface ClinicalSummary {
  primaryComplaint: string;
  onsetDuration: string;
  exacerbatingFactors: string[];
  associatedSymptoms: string[];
  vitalsCheck: {
    temp?: string;
    bp?: string;
    heartRate?: string;
    spo2?: string;
  };
  urgency: UrgencyLevel;
  recommendedQuestions: string[];
  triageNotes: string;
  icd10CategoryHint?: string;
}

export interface Message {
  id: string;
  sender: 'patient' | 'clinician' | 'system';
  timestamp: string;
  originalText: string;
  originalLanguage: Language;
  translatedText?: string; // English translation for clinician or Patient language translation for patient
  simplifiedText?: string; // Plain language breakdown
  audioUrl?: string;
  clinicalSummary?: ClinicalSummary;
  status: 'sending' | 'processing' | 'delivered';
}

export interface AccessibilityPrefs {
  fontSize: 'normal' | 'large' | 'xlarge';
  highContrast: boolean;
  autoPlaySpeech: boolean;
  speechRate: number; // 0.8 to 1.2
  simplifiedMode: boolean;
}

export interface PatientProfile {
  id: string;
  name: string;
  age: number;
  gender: string;
  preferredLanguage: Language;
  location: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  recentVisits: number;
}

import React, { useState } from 'react';
import { Message, Language, ClinicalSummary, PatientProfile } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../services/languages';
import { AIEngine } from '../../services/aiEngine';
import { SpeechEngine } from '../../services/speechEngine';
import {
  Stethoscope,
  AlertTriangle,
  Activity,
  Send,
  Sparkles,
  Volume2,
  FileText,
  HelpCircle,
  Zap,
  Globe,
  RefreshCw,
} from 'lucide-react';
import { motion } from 'framer-motion';

interface ClinicianViewProps {
  messages: Message[];
  selectedLanguage: Language;
  onSendClinicianResponse: (text: string) => void;
  isProcessing: boolean;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const ClinicianView: React.FC<ClinicianViewProps> = ({
  messages,
  selectedLanguage,
  onSendClinicianResponse,
  isProcessing,
  addToast,
}) => {
  const [clinicianText, setClinicianText] = useState('');
  const [previewTranslation, setPreviewTranslation] = useState<{
    simplifiedText: string;
    translatedText: string;
  } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [activeTab, setActiveTab] = useState<'consultation' | 'simplifier'>('consultation');
  const [jargonInput, setJargonInput] = useState('Hypertension requiring ACE inhibitor dosage titration.');
  const [jargonOutput, setJargonOutput] = useState<{ simplified: string; translated: string } | null>(null);

  const activePatient: PatientProfile = {
    id: 'PT-89421',
    name: 'Emeka Nwosu',
    age: 42,
    gender: 'Male',
    preferredLanguage: selectedLanguage,
    location: 'Surulere Clinic, Lagos',
    bloodGroup: 'O+',
    allergies: ['Penicillin'],
    chronicConditions: ['None reported'],
    recentVisits: 2,
  };

  const patientMessages = messages.filter((m) => m.sender === 'patient');
  const latestPatientMessage = patientMessages[patientMessages.length - 1];
  const summary: ClinicalSummary | undefined = latestPatientMessage?.clinicalSummary;

  const handleGeneratePreview = async (text: string) => {
    setClinicianText(text);
    if (!text.trim()) {
      setPreviewTranslation(null);
      return;
    }
    setIsPreviewing(true);
    const result = await AIEngine.processClinicianResponse(text, selectedLanguage);
    setPreviewTranslation(result);
    setIsPreviewing(false);
  };

  const handleSend = () => {
    if (!clinicianText.trim()) return;
    onSendClinicianResponse(clinicianText);
    setClinicianText('');
    setPreviewTranslation(null);
    addToast('Response translated & sent to patient!', 'success');
  };

  const handleTestSimplifier = async () => {
    if (!jargonInput.trim()) return;
    const res = await AIEngine.processClinicianResponse(jargonInput, selectedLanguage);
    setJargonOutput({ simplified: res.simplifiedText, translated: res.translatedText });
  };

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const tabBtn = (active: boolean) =>
    `px-4 py-1.5 rounded-pill text-[13px] font-medium transition-colors ${
      active ? 'bg-iris-pulse text-cloud-white' : 'text-fog hover:text-deep-iris'
    }`;

  return (
    <div className="max-w-[1100px] mx-auto space-y-5 pb-12 px-4">
      {/* Workspace header */}
      <div className="surface-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-10 h-10 rounded-icon bg-iris-pulse flex items-center justify-center text-cloud-white shrink-0">
            <Stethoscope className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-semibold text-deep-iris">Clinical Workspace</h1>
              <span className="px-2.5 py-0.5 rounded-pill bg-iris-pulse/10 border border-iris-pulse/25 text-iris-pulse text-[11px] font-medium">
                Live Consultation
              </span>
            </div>
            <p className="text-xs text-fog mt-0.5">
              CareBridge summarizes patient input into medical English and translates your response back.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-pearl p-1 rounded-pill border border-ash self-start">
          <button onClick={() => setActiveTab('consultation')} className={tabBtn(activeTab === 'consultation')}>
            Case & Summary
          </button>
          <button onClick={() => setActiveTab('simplifier')} className={tabBtn(activeTab === 'simplifier')}>
            Jargon Simplifier
          </button>
        </div>
      </div>

      {activeTab === 'simplifier' ? (
        <div className="surface-card p-6 space-y-5">
          <div className="flex items-start gap-3 border-b border-ash pb-3">
            <Zap className="w-5 h-5 text-iris-pulse shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-deep-iris">Medical Jargon Converter</h2>
              <p className="text-xs text-fog">
                Convert clinical instructions into patient language in {currentLang.name}.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-deep-iris block uppercase tracking-caption">
                Clinical terminology (English)
              </label>
              <textarea
                rows={4}
                value={jargonInput}
                onChange={(e) => setJargonInput(e.target.value)}
                className="w-full bg-pearl border border-ash rounded-input p-3 text-sm text-deep-iris focus:outline-none focus:border-iris-pulse"
                placeholder="Enter clinical instructions or diagnosis..."
              />
              <button onClick={handleTestSimplifier} className="btn-primary w-full text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Simplify & Translate to {currentLang.name}</span>
              </button>
            </div>

            <div className="bg-pearl p-4 rounded-card border border-ash space-y-4">
              <div className="text-xs font-semibold text-iris-pulse uppercase tracking-caption flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                <span>Output ({currentLang.name})</span>
              </div>

              {jargonOutput ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-cloud-white border border-ash">
                    <div className="text-[11px] text-fog font-medium mb-1">Target language:</div>
                    <p className="text-sm font-semibold text-deep-iris">“{jargonOutput.translated}”</p>
                  </div>
                  <div className="p-3 rounded-xl bg-cloud-white border border-ash">
                    <div className="text-[11px] text-fog font-medium mb-1">Plain English:</div>
                    <p className="text-xs text-deep-iris">{jargonOutput.simplified}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-fog text-center py-8">
                  Run simplify to preview patient-facing output.
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          {/* Patient sidebar */}
          <div className="space-y-5">
            <div className="surface-card p-5 space-y-4">
              <div className="flex items-center gap-3 border-b border-ash pb-3">
                <div className="w-11 h-11 rounded-full bg-iris-pulse flex items-center justify-center text-cloud-white font-semibold text-base">
                  {activePatient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-[15px] font-semibold text-deep-iris">{activePatient.name}</h3>
                  <p className="text-xs text-fog">
                    {activePatient.age} yrs · {activePatient.gender} · ID {activePatient.id}
                  </p>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1 border-b border-ash/70">
                  <span className="text-fog">Preferred language</span>
                  <span className="font-semibold text-deep-iris">{currentLang.flag} {currentLang.name}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ash/70">
                  <span className="text-fog">Location</span>
                  <span className="text-deep-iris">{activePatient.location}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-ash/70">
                  <span className="text-fog">Blood group</span>
                  <span className="text-deep-iris font-mono">{activePatient.bloodGroup}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-fog">Allergies</span>
                  <span className="text-red-600 font-medium">{activePatient.allergies.join(', ')}</span>
                </div>
              </div>

              <div
                className={`p-3 rounded-xl border flex items-center gap-2 text-xs font-semibold ${
                  summary?.urgency === 'urgent'
                    ? 'bg-amber-50 border-amber-200 text-amber-800'
                    : summary?.urgency === 'emergency'
                    ? 'bg-red-50 border-red-200 text-red-700'
                    : 'bg-iris-pulse/8 border-iris-pulse/25 text-iris-pulse'
                }`}
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Triage: {(summary?.urgency || 'routine').toUpperCase()}</span>
              </div>
            </div>

            {summary?.vitalsCheck && (
              <div className="surface-card p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-deep-iris uppercase tracking-caption">
                  <Activity className="w-4 h-4 text-iris-pulse" />
                  <span>Intake Vitals</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Body Temp', summary.vitalsCheck.temp || '37.1 °C'],
                    ['Blood Pressure', summary.vitalsCheck.bp || '128/82 mmHg'],
                    ['Heart Rate', summary.vitalsCheck.heartRate || '84 bpm'],
                    ['SpO₂', summary.vitalsCheck.spo2 || '98%'],
                  ].map(([label, value]) => (
                    <div key={label} className="bg-pearl p-3 rounded-xl border border-ash">
                      <div className="text-[10px] text-fog">{label}</div>
                      <div className="text-sm font-semibold text-deep-iris font-mono mt-0.5">{value}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Main column */}
          <div className="lg:col-span-2 space-y-5">
            <div className="surface-card p-6 space-y-5">
              <div className="flex items-center justify-between border-b border-ash pb-3 gap-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-iris-pulse" />
                  <h2 className="text-base font-semibold text-deep-iris">Structured Clinical Summary</h2>
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-pill bg-pearl text-deep-iris border border-ash">
                  {summary?.icd10CategoryHint || 'SOAP Intake'}
                </span>
              </div>

              {summary ? (
                <div className="space-y-4 text-sm">
                  <div className="bg-pearl p-4 rounded-xl border border-ash">
                    <div className="text-xs font-semibold text-iris-pulse uppercase tracking-caption mb-1">
                      Primary Complaint
                    </div>
                    <p className="text-base font-semibold text-deep-iris">{summary.primaryComplaint}</p>
                    <p className="text-xs text-fog mt-1">
                      <span className="font-semibold text-deep-iris">Onset:</span> {summary.onsetDuration}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-pearl p-3.5 rounded-xl border border-ash space-y-1">
                      <span className="text-xs font-semibold text-deep-iris">Exacerbating factors</span>
                      <ul className="list-disc list-inside text-xs text-fog space-y-0.5 pt-1">
                        {summary.exacerbatingFactors.map((f, i) => (
                          <li key={i} className="text-deep-iris">{f}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="bg-pearl p-3.5 rounded-xl border border-ash space-y-1">
                      <span className="text-xs font-semibold text-deep-iris">Associated symptoms</span>
                      <ul className="list-disc list-inside text-xs text-fog space-y-0.5 pt-1">
                        {summary.associatedSymptoms.map((s, i) => (
                          <li key={i} className="text-deep-iris">{s}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-iris-pulse/6 border border-iris-pulse/20 text-xs text-fog leading-relaxed">
                    <span className="font-semibold text-deep-iris">Assessment note: </span>
                    {summary.triageNotes}
                  </div>

                  {latestPatientMessage && (
                    <div className="pt-1">
                      <div className="text-[11px] font-semibold text-fog mb-1 flex items-center justify-between gap-2">
                        <span>Original patient speech ({currentLang.name})</span>
                        <button
                          onClick={() =>
                            SpeechEngine.speak(latestPatientMessage.originalText, latestPatientMessage.originalLanguage)
                          }
                          className="text-iris-pulse hover:underline flex items-center gap-1"
                        >
                          <Volume2 className="w-3 h-3" />
                          <span>Play</span>
                        </button>
                      </div>
                      <div className="bg-pearl p-3 rounded-xl border border-ash text-xs italic text-deep-iris">
                        “{latestPatientMessage.originalText}”
                      </div>
                    </div>
                  )}

                  {summary.recommendedQuestions && summary.recommendedQuestions.length > 0 && (
                    <div className="pt-1 space-y-2">
                      <div className="text-xs font-semibold text-deep-iris flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-iris-pulse" />
                        <span>Recommended follow-ups</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {summary.recommendedQuestions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleGeneratePreview(q)}
                            className="px-3 py-1.5 rounded-pill bg-cloud-white border border-ash text-xs text-deep-iris hover:border-iris-pulse/50 transition-colors text-left"
                          >
                            + “{q}”
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-8 text-center text-fog space-y-2">
                  <FileText className="w-7 h-7 mx-auto text-fog" />
                  <p className="text-sm">Awaiting patient consultation input.</p>
                </div>
              )}
            </div>

            <div className="surface-card p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <h3 className="text-[15px] font-semibold text-deep-iris">Response Composer</h3>
                <span className="text-xs text-fog">
                  Target: <strong className="text-deep-iris font-semibold">{currentLang.name}</strong>
                </span>
              </div>

              <label htmlFor="clinician-response" className="sr-only">Clinician response</label>
              <textarea
                id="clinician-response"
                rows={3}
                value={clinicianText}
                onChange={(e) => handleGeneratePreview(e.target.value)}
                placeholder="Type response in medical or standard English…"
                className="w-full bg-pearl border border-ash rounded-input p-3 text-sm text-deep-iris placeholder-fog focus:outline-none focus:border-iris-pulse transition-colors"
              />

              {clinicianText.trim() && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 rounded-card bg-pearl border border-iris-pulse/25 space-y-2"
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-iris-pulse">
                    <span className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" />
                      Live translation → {currentLang.name}
                    </span>
                    {isPreviewing && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </div>
                  <p className="text-[15px] font-semibold text-deep-iris">
                    “{previewTranslation?.translatedText || 'Generating…'}”
                  </p>
                  <div className="text-[11px] text-fog pt-1 border-t border-ash">
                    <span className="font-semibold text-deep-iris">Plain English:</span>{' '}
                    {previewTranslation?.simplifiedText}
                  </div>
                </motion.div>
              )}

              <div className="flex justify-end pt-1">
                <button
                  onClick={handleSend}
                  disabled={!clinicianText.trim() || isProcessing}
                  className="btn-primary text-xs px-5 py-2.5"
                >
                  <Send className="w-4 h-4" />
                  <span>Translate & Send to Patient</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

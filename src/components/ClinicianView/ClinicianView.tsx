import React, { useEffect, useRef, useState } from 'react';
import { Message, Language, ClinicalSummary, PatientProfile } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../services/languages';
import { AIEngine, ProcessClinicianResponseResult } from '../../services/aiEngine';
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
  onSendClinicianResponse: (text: string, prepared?: ProcessClinicianResponseResult) => Promise<void>;
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
  const [previewFor, setPreviewFor] = useState<{ text: string; language: Language } | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const previewTimer = useRef<number | null>(null);
  const previewRequest = useRef(0);
  const [activeTab, setActiveTab] = useState<'consultation' | 'simplifier'>('consultation');
  const [jargonInput, setJargonInput] = useState('Hypertension requiring ACE inhibitor dosage titration.');
  const [jargonOutput, setJargonOutput] = useState<{ simplified: string; translated: string } | null>(null);

  const activePatient: PatientProfile = {
    id: 'PT-89421',
    name: 'Demo patient',
    age: 0,
    gender: 'Profile not provided',
    preferredLanguage: selectedLanguage,
    location: 'Not provided',
    bloodGroup: 'Not provided',
    allergies: [],
    chronicConditions: [],
    recentVisits: 0,
  };

  const patientMessages = messages.filter((m) => m.sender === 'patient');
  const latestPatientMessage = patientMessages[patientMessages.length - 1];
  const summary: ClinicalSummary | undefined = latestPatientMessage?.clinicalSummary;

  useEffect(() => () => {
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
  }, []);

  useEffect(() => {
    if (clinicianText.trim()) handleGeneratePreview(clinicianText);
  }, [selectedLanguage]);

  const handleGeneratePreview = (text: string) => {
    setClinicianText(text);
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    const requestId = ++previewRequest.current;
    if (!text.trim()) {
      setPreviewTranslation(null);
      setIsPreviewing(false);
      return;
    }
    setPreviewTranslation(null);
    setPreviewFor(null);
    setIsPreviewing(true);
    previewTimer.current = window.setTimeout(async () => {
      try {
        const result = await AIEngine.processClinicianResponse(text, selectedLanguage);
        if (requestId === previewRequest.current) {
          setPreviewTranslation(result);
          setPreviewFor({ text, language: selectedLanguage });
        }
      } catch (error) {
        if (requestId === previewRequest.current) {
          addToast(error instanceof Error ? error.message : 'Text translation failed.', 'error');
        }
      } finally {
        if (requestId === previewRequest.current) setIsPreviewing(false);
      }
    }, 500);
  };

  const handleSend = async () => {
    if (!clinicianText.trim()) return;
    previewRequest.current += 1;
    if (previewTimer.current !== null) window.clearTimeout(previewTimer.current);
    try {
      const prepared = previewFor?.text === clinicianText && previewFor.language === selectedLanguage
        ? previewTranslation || undefined
        : undefined;
      await onSendClinicianResponse(clinicianText, prepared);
      setClinicianText('');
      setPreviewTranslation(null);
      setPreviewFor(null);
      addToast(`Response sent. Spoken language: ${currentLang.name}.`, 'success');
    } catch {
      // Keep the draft available so the clinician can retry.
    }
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
              Review the patient’s words, then send a reply as text and spoken audio in their selected language.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-pearl p-1 rounded-pill border border-ash self-start">
          <button onClick={() => setActiveTab('consultation')} className={tabBtn(activeTab === 'consultation')}>
            Case & Summary
          </button>
          <button onClick={() => setActiveTab('simplifier')} className={tabBtn(activeTab === 'simplifier')}>
            Voice preview
          </button>
        </div>
      </div>

      {activeTab === 'simplifier' ? (
        <div className="surface-card p-6 space-y-5">
          <div className="flex items-start gap-3 border-b border-ash pb-3">
            <Zap className="w-5 h-5 text-iris-pulse shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-deep-iris">Patient voice preview</h2>
              <p className="text-xs text-fog">
                Review the English reply that will be spoken in {currentLang.name}. YarnGPT provides translated audio where supported.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label className="text-xs font-semibold text-deep-iris block uppercase tracking-caption">
                Clinician’s reply (English)
              </label>
              <textarea
                rows={4}
                value={jargonInput}
                onChange={(e) => setJargonInput(e.target.value)}
                className="w-full bg-pearl border border-ash rounded-input p-3 text-sm text-deep-iris focus:outline-none focus:border-iris-pulse"
                placeholder="Type a short reply for the patient..."
              />
              <button onClick={handleTestSimplifier} className="btn-primary w-full text-xs">
                <Sparkles className="w-4 h-4" />
                <span>Preview spoken reply in {currentLang.name}</span>
              </button>
            </div>

            <div className="bg-pearl p-4 rounded-card border border-ash space-y-4">
              <div className="text-xs font-semibold text-iris-pulse uppercase tracking-caption flex items-center gap-2">
                <Globe className="w-3.5 h-3.5" />
                <span>Audio preview ({currentLang.name})</span>
              </div>

              {jargonOutput ? (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-cloud-white border border-ash">
                    <div className="text-[11px] text-fog font-medium mb-1">Patient-language translation:</div>
                    <p className="text-sm font-semibold text-deep-iris">“{jargonOutput.translated}”</p>
                  </div>
                  <div className="p-3 rounded-xl bg-cloud-white border border-ash">
                    <div className="text-[11px] text-fog font-medium mb-1">Plain English:</div>
                    <p className="text-xs text-deep-iris">{jargonOutput.simplified}</p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-fog text-center py-8">
                  Enter a reply to see its source text and selected audio language.
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
                    {activePatient.age > 0 ? `${activePatient.age} yrs` : 'Age not provided'} · {activePatient.gender} · {activePatient.id}
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
                  <span className="text-deep-iris font-medium">{activePatient.allergies.join(', ') || 'Not provided'}</span>
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
                <span>{summary?.urgency === 'unassessed' ? 'Urgency not assessed' : `Triage: ${(summary?.urgency || 'unassessed').toUpperCase()}`}</span>
              </div>
            </div>

            {summary?.vitalsCheck && Object.values(summary.vitalsCheck).some(Boolean) && (
              <div className="surface-card p-5 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-deep-iris uppercase tracking-caption">
                  <Activity className="w-4 h-4 text-iris-pulse" />
                  <span>Intake Vitals</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    ['Body Temp', summary.vitalsCheck.temp],
                    ['Blood Pressure', summary.vitalsCheck.bp],
                    ['Heart Rate', summary.vitalsCheck.heartRate],
                    ['SpO₂', summary.vitalsCheck.spo2],
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
                  {summary?.icd10CategoryHint || 'Intake draft'}
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
                      {latestPatientMessage.translatedText && (
                        <div className="mb-3 space-y-1">
                          <div className="text-[11px] font-semibold text-fog">English translation of patient’s words</div>
                          <div className="bg-cloud-white p-3 rounded-xl border border-ash text-xs text-deep-iris">
                            “{latestPatientMessage.translatedText}”
                          </div>
                        </div>
                      )}
                      <div className="text-[11px] font-semibold text-fog mb-1 flex items-center justify-between gap-2">
                        <span>Original patient speech ({currentLang.name})</span>
                        <button
                          onClick={async () => {
                            try {
                              const provider = await SpeechEngine.speak(latestPatientMessage.originalText, latestPatientMessage.originalLanguage);
                              if (provider) addToast(`Playing patient audio with ${provider}.`, 'success');
                            } catch (error) {
                              addToast(error instanceof Error ? error.message : 'Voice playback failed.', 'error');
                            }
                          }}
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
                      Patient-language translation · {currentLang.name}
                    </span>
                    {isPreviewing && <RefreshCw className="w-3 h-3 animate-spin" />}
                  </div>
                  <p className="text-[15px] font-semibold text-deep-iris">
                    “{previewTranslation?.translatedText || (isPreviewing ? 'Translating your reply…' : 'Translation will appear here.') }”
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
                  disabled={!clinicianText.trim() || isProcessing || isPreviewing}
                  className="btn-primary text-xs px-5 py-2.5"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPreviewing ? 'Translating…' : 'Send translated reply'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

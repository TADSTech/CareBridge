import React, { useState, useEffect } from 'react';
import { Perspective, Language, Message, AccessibilityPrefs } from './types';
import { Header } from './components/Header';
import { PatientView } from './components/PatientView/PatientView';
import { ClinicianView } from './components/ClinicianView/ClinicianView';
import { SplitView } from './components/SplitView';
import { Footer } from './components/Footer';
import { DemoScriptModal } from './components/DemoScriptModal';
import { AccessibilityModal } from './components/AccessibilityModal';
import { ToastContainer, ToastMessage } from './components/ui/Toast';
import { AIEngine } from './services/aiEngine';
import { ProcessClinicianResponseResult } from './services/aiEngine';
import { SpeechEngine } from './services/speechEngine';
import { AccountAccess } from './components/AccountAccess';
import { accountsEnabled, AccountSession, getStoredSession, getValidSession, loadConsultation, saveConsultation, signOut } from './services/accountStore';
import { LogOut, LoaderCircle } from 'lucide-react';

export function App() {
  const [perspective, setPerspective] = useState<Perspective>('patient');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('pidgin');
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoScriptOpen, setDemoScriptOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [currentDemoStep, setCurrentDemoStep] = useState(1);
  const [accountSession, setAccountSession] = useState<AccountSession | null>(() => accountsEnabled ? getStoredSession() : null);
  const [accountLoading, setAccountLoading] = useState(() => accountsEnabled && Boolean(getStoredSession()));
  const [accountLoadError, setAccountLoadError] = useState('');
  const [consultationId, setConsultationId] = useState<string | null>(null);

  // Accessibility preferences
  const [accessibilityPrefs, setAccessibilityPrefs] = useState<AccessibilityPrefs>({
    fontSize: 'normal',
    highContrast: false,
    autoPlaySpeech: true,
    speechRate: 0.95,
    simplifiedMode: true,
  });

  // Floating Toast notifications state
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const [messages, setMessages] = useState<Message[]>([]);

  const handleSignOut = async () => {
    await signOut(accountSession);
    setAccountSession(null);
  };

  useEffect(() => {
    if (!accountsEnabled) return;
    if (!accountSession) { setMessages([]); setConsultationId(null); setAccountLoading(false); return; }
    let active = true;
    setAccountLoading(true);
    setAccountLoadError('');
    void (async () => {
      try {
        const validSession = await getValidSession(accountSession);
        if (active) setAccountSession(validSession);
        const consultation = await loadConsultation(validSession);
        if (active) { setConsultationId(consultation.id); setMessages(consultation.messages); }
      } catch (error) {
        if (active) {
          if (!getStoredSession()) setAccountSession(null);
          else setAccountLoadError(error instanceof Error ? error.message : 'Could not load your consultation.');
        }
      } finally { if (active) setAccountLoading(false); }
    })();
    return () => { active = false; };
  }, [accountSession]);

  useEffect(() => {
    if (!accountsEnabled || !accountSession || !consultationId || accountLoading) return;
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const validSession = await getValidSession(accountSession);
          if (validSession !== accountSession) setAccountSession(validSession);
          await saveConsultation(consultationId, messages, validSession);
        } catch (error) { addToast(error instanceof Error ? error.message : 'Could not save your consultation.', 'error'); }
      })();
    }, 650);
    return () => window.clearTimeout(timer);
  }, [accountSession, accountLoading, consultationId, messages]);

  // Execute patient message input
  const handleSendMessage = async (text: string, language: Language) => {
    const newPatientMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'patient',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      originalText: text,
      originalLanguage: language,
      status: 'processing',
    };

    setMessages((prev) => [...prev, newPatientMsg]);
    setIsProcessing(true);
    addToast('Preparing an intake draft from the patient’s own words…', 'info');

    try {
      const result = await AIEngine.processPatientInput(text, language);

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === newPatientMsg.id
            ? {
                ...msg,
                translatedText: result.translatedText,
                clinicalSummary: result.clinicalSummary,
                status: 'delivered',
              }
            : msg
        )
      );

      setIsProcessing(false);
      addToast('Intake draft ready. Clinician review is needed.', 'success');
    } catch (err) {
      setMessages((prev) => prev.filter((msg) => msg.id !== newPatientMsg.id));
      setIsProcessing(false);
      const message = err instanceof Error ? err.message : 'Text translation failed. Check the Groq API setup and try again.';
      addToast(message, 'error');
      throw err;
    }
  };

  // Execute clinician response input
  const handleSendClinicianResponse = async (text: string, prepared?: ProcessClinicianResponseResult) => {
    setIsProcessing(true);

    try {
      const result = prepared || await AIEngine.processClinicianResponse(text, selectedLanguage);

      const newClinicianMsg: Message = {
        id: `msg-${Date.now()}`,
        sender: 'clinician',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        originalText: text,
        originalLanguage: selectedLanguage,
        translatedText: result.translatedText,
        simplifiedText: result.simplifiedText,
        status: 'delivered',
      };

      setMessages((prev) => [...prev, newClinicianMsg]);
      setIsProcessing(false);

      // Auto-play voice response for patient if enabled
      if (accessibilityPrefs.autoPlaySpeech) {
        SpeechEngine.speak(result.translatedText, selectedLanguage, accessibilityPrefs.speechRate);
      }
    } catch (err) {
      setIsProcessing(false);
      const message = err instanceof Error ? err.message : 'Text translation failed. Check the Groq API setup and try again.';
      addToast(message, 'error');
      throw err;
    }
  };

  // Execute specific Step from the Hackathon Demo Script Modal
  const handleExecuteDemoStep = (stepNumber: number) => {
    setCurrentDemoStep(stepNumber);

    switch (stepNumber) {
      case 1:
        setPerspective('patient');
        setSelectedLanguage('pidgin');
        addToast('Step 1: Patient selects Pidgin and inputs speech', 'info');
        break;
      case 2:
        setPerspective('patient');
        setIsProcessing(true);
        setTimeout(() => {
          setIsProcessing(false);
          addToast('Step 2: CareBridge prepares an intake draft', 'success');
        }, 600);
        break;
      case 3:
        setPerspective('clinician');
        addToast('Step 3: Clinician reviews summary & selects response', 'info');
        break;
      case 4:
        setPerspective('split');
        addToast('Step 4: Clinician prepares a spoken reply', 'info');
        break;
      case 5:
        setPerspective('patient');
        const lastMsg = messages[messages.length - 1];
        if (lastMsg && lastMsg.translatedText) {
          SpeechEngine.speak(lastMsg.translatedText, selectedLanguage, accessibilityPrefs.speechRate);
        }
        addToast('Step 5: Playing Pidgin audio for patient...', 'success');
        break;
    }
  };

  if (accountsEnabled && !accountSession) return <AccountAccess onAuthenticated={setAccountSession} />;
  if (accountsEnabled && accountLoadError && accountSession) return (
    <main className="min-h-screen bg-pearl flex items-center justify-center px-4">
      <section className="surface-card max-w-md p-6 space-y-4">
        <h1 className="text-xl font-semibold text-deep-iris">Could not load your saved consultation</h1>
        <p role="alert" className="text-sm text-fog">{accountLoadError}</p>
        <div className="flex gap-2">
          <button onClick={() => setAccountSession({ ...accountSession })} className="rounded-pill bg-iris-pulse px-4 py-2 text-sm font-semibold text-cloud-white">Try again</button>
          <button onClick={handleSignOut} className="rounded-pill border border-ash px-4 py-2 text-sm text-deep-iris">Sign out</button>
        </div>
      </section>
    </main>
  );
  if (accountsEnabled && accountLoading) return <main className="min-h-screen bg-pearl flex items-center justify-center text-sm text-fog gap-2"><LoaderCircle className="w-4 h-4 animate-spin" />Loading your saved consultation…</main>;

  return (
    <div
      className={`min-h-screen bg-pearl text-deep-iris flex flex-col font-sans ${
        accessibilityPrefs.highContrast ? 'contrast-125' : ''
      } ${
        accessibilityPrefs.fontSize === 'large'
          ? 'text-base'
          : accessibilityPrefs.fontSize === 'xlarge'
          ? 'text-lg'
          : 'text-sm'
      }`}
    >
      {/* Top Bar Header */}
      <Header
        perspective={perspective}
        setPerspective={setPerspective}
        selectedLanguage={selectedLanguage}
        setSelectedLanguage={setSelectedLanguage}
        openAccessibilityModal={() => setAccessibilityOpen(true)}
        openDemoScriptModal={() => setDemoScriptOpen(true)}
      />

      {accountsEnabled && accountSession && (
        <div className="w-full max-w-[1180px] mx-auto px-4 pt-3 flex justify-end items-center gap-3 text-xs text-fog">
          <span>Signed in{accountSession.user.email ? ` · ${accountSession.user.email}` : ''}</span>
          <button onClick={handleSignOut} className="inline-flex items-center gap-1.5 rounded-pill border border-ash bg-cloud-white px-3 py-1.5 text-deep-iris hover:border-iris-pulse" aria-label="Sign out">
            <LogOut className="w-3.5 h-3.5" /> Sign out
          </button>
        </div>
      )}

      {/* Main View Container */}
      <main id="main-content" className="flex-1 pt-6" tabIndex={-1}>
        {perspective === 'patient' && (
          <PatientView
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            messages={messages}
            onSendMessage={handleSendMessage}
            isProcessing={isProcessing}
            prefs={accessibilityPrefs}
            addToast={addToast}
          />
        )}

        {perspective === 'clinician' && (
          <ClinicianView
            messages={messages}
            selectedLanguage={selectedLanguage}
            onSendClinicianResponse={handleSendClinicianResponse}
            isProcessing={isProcessing}
            addToast={addToast}
          />
        )}

        {perspective === 'split' && (
          <SplitView
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            messages={messages}
            onSendMessage={handleSendMessage}
            onSendClinicianResponse={handleSendClinicianResponse}
            isProcessing={isProcessing}
            prefs={accessibilityPrefs}
            addToast={addToast}
          />
        )}
      </main>

      {/* Bottom Page Footer */}
      <Footer />

      {/* Demo Script Walkthrough Modal */}
      <DemoScriptModal
        isOpen={demoScriptOpen}
        onClose={() => setDemoScriptOpen(false)}
        onExecuteStep={handleExecuteDemoStep}
        currentStep={currentDemoStep}
      />

      {/* Accessibility Preferences Modal */}
      <AccessibilityModal
        isOpen={accessibilityOpen}
        onClose={() => setAccessibilityOpen(false)}
        prefs={accessibilityPrefs}
        setPrefs={setAccessibilityPrefs}
      />

      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;

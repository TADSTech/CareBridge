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
import { SpeechEngine } from './services/speechEngine';

export function App() {
  const [perspective, setPerspective] = useState<Perspective>('patient');
  const [selectedLanguage, setSelectedLanguage] = useState<Language>('pidgin');
  const [isProcessing, setIsProcessing] = useState(false);
  const [demoScriptOpen, setDemoScriptOpen] = useState(false);
  const [accessibilityOpen, setAccessibilityOpen] = useState(false);
  const [currentDemoStep, setCurrentDemoStep] = useState(1);

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

  // Messages consultation thread initialized with killer demo scenario
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'msg-001',
      sender: 'patient',
      timestamp: '14:32',
      originalText: 'My chest dey pain me since yesterday, especially when I breathe.',
      originalLanguage: 'pidgin',
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
          'Requires acute cardiac & pulmonary evaluation. Rule out acute coronary syndrome, pleuritis, or pulmonary infection.',
        icd10CategoryHint: 'R07.9 (Chest pain, unspecified)',
      },
      status: 'delivered',
    },
    {
      id: 'msg-002',
      sender: 'clinician',
      timestamp: '14:34',
      originalText: 'Have you experienced shortness of breath, dizziness, or fever?',
      originalLanguage: 'pidgin',
      translatedText: 'You dey find am hard to breathe, or your head dey turn you, or you get fever?',
      simplifiedText: 'Doctor is asking if breathing is difficult or if you have fever or dizziness.',
      status: 'delivered',
    },
  ]);

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
    addToast('CareBridge AI is translating speech & structuring clinical summary...', 'info');

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
      addToast('Clinical summary generated for doctor!', 'success');
    } catch (err) {
      setIsProcessing(false);
      addToast('Error processing input. Retrying offline engine.', 'error');
    }
  };

  // Execute clinician response input
  const handleSendClinicianResponse = async (text: string) => {
    setIsProcessing(true);

    try {
      const result = await AIEngine.processClinicianResponse(text, selectedLanguage);

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
      addToast('Could not deliver response.', 'error');
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
          addToast('Step 2: CareBridge structures SOAP clinical summary', 'success');
        }, 600);
        break;
      case 3:
        setPerspective('clinician');
        addToast('Step 3: Clinician reviews summary & selects response', 'info');
        break;
      case 4:
        setPerspective('split');
        addToast('Step 4: CareBridge simplifies response into Pidgin', 'info');
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

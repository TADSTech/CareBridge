import React from 'react';
import { PatientView } from './PatientView/PatientView';
import { ClinicianView } from './ClinicianView/ClinicianView';
import { Message, Language, AccessibilityPrefs } from '../types';
import { User, Stethoscope, ArrowRightLeft } from 'lucide-react';

interface SplitViewProps {
  selectedLanguage: Language;
  setSelectedLanguage: (lang: Language) => void;
  messages: Message[];
  onSendMessage: (text: string, language: Language) => void;
  onSendClinicianResponse: (text: string) => void;
  isProcessing: boolean;
  prefs: AccessibilityPrefs;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const SplitView: React.FC<SplitViewProps> = ({
  selectedLanguage,
  setSelectedLanguage,
  messages,
  onSendMessage,
  onSendClinicianResponse,
  isProcessing,
  prefs,
  addToast,
}) => {
  return (
    <div className="max-w-[1400px] mx-auto space-y-4 pb-12 px-4">
      <div className="surface-card px-4 py-3 flex items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-deep-iris min-w-0">
          <ArrowRightLeft className="w-4 h-4 text-iris-pulse shrink-0" />
          <span className="font-semibold">Live Split View</span>
          <span className="text-fog hidden md:inline truncate">
            Patient ({selectedLanguage.toUpperCase()}) ↔ Clinician (Medical English), bi-directional in real time.
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-iris-pulse font-medium shrink-0">
          <span>CareBridge AI</span>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 items-start">
        <div className="bg-cloud-white border border-ash rounded-card p-3 md:p-4 space-y-3 shadow-card">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pearl border border-ash text-xs font-semibold text-deep-iris">
            <User className="w-4 h-4 text-iris-pulse" />
            <span>1 · Patient Perspective ({selectedLanguage.toUpperCase()})</span>
          </div>
          <PatientView
            selectedLanguage={selectedLanguage}
            setSelectedLanguage={setSelectedLanguage}
            messages={messages}
            onSendMessage={onSendMessage}
            isProcessing={isProcessing}
            prefs={prefs}
            addToast={addToast}
          />
        </div>

        <div className="bg-cloud-white border border-ash rounded-card p-3 md:p-4 space-y-3 shadow-card">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-pearl border border-ash text-xs font-semibold text-deep-iris">
            <Stethoscope className="w-4 h-4 text-iris-pulse" />
            <span>2 · Healthcare Worker Workstation</span>
          </div>
          <ClinicianView
            messages={messages}
            selectedLanguage={selectedLanguage}
            onSendClinicianResponse={onSendClinicianResponse}
            isProcessing={isProcessing}
            addToast={addToast}
          />
        </div>
      </div>
    </div>
  );
};

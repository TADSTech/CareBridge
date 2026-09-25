import React from 'react';
import { Dialog } from './ui/Dialog';
import { Play, Sparkles, User, Stethoscope, Split } from 'lucide-react';
import { Perspective, Language } from '../types';

interface DemoScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExecuteStep: (stepNumber: number) => void;
  currentStep: number;
}

export const DemoScriptModal: React.FC<DemoScriptModalProps> = ({
  isOpen,
  onClose,
  onExecuteStep,
  currentStep,
}) => {
  const steps = [
    {
      num: 1,
      title: 'Patient Language & Voice Entry',
      description: 'Choose a language, then speak or type a symptom description.',
      targetPerspective: 'patient' as Perspective,
    },
    {
      num: 2,
      title: 'Prepare an Intake Draft',
      description: 'CareBridge keeps the patient’s words and adds follow-up questions. It does not diagnose or assess urgency.',
      targetPerspective: 'patient' as Perspective,
    },
    {
      num: 3,
      title: 'Clinician Interface View',
      description: 'Clinician reviews the original words and intake draft, then writes a reply.',
      targetPerspective: 'clinician' as Perspective,
    },
    {
      num: 4,
      title: 'Prepare Spoken Reply',
      description: 'CareBridge keeps the typed English reply. YarnGPT can translate the spoken audio where supported.',
      targetPerspective: 'split' as Perspective,
    },
    {
      num: 5,
      title: 'Patient Audio Playback',
      description: 'Play YarnGPT speech, with browser speech as a fallback when the service is unavailable.',
      targetPerspective: 'patient' as Perspective,
    },
  ];

  const viewLabel = (p: Perspective) => {
    if (p === 'patient') return { text: 'Patient', icon: <User className="w-3 h-3" /> };
    if (p === 'clinician') return { text: 'Clinician', icon: <Stethoscope className="w-3 h-3" /> };
    return { text: 'Split', icon: <Split className="w-3 h-3" /> };
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Demo Script — 60-Second Happy Path"
      subtitle="Jump to any step in the presentation flow."
      maxWidth="lg"
    >
      <div className="space-y-4 py-2">
        <div className="p-3 bg-pearl border border-ash rounded-card flex items-center gap-2 text-xs text-deep-iris">
          <Sparkles className="w-4 h-4 text-iris-pulse shrink-0" />
          <span>Follow this sequence during the live presentation of the bi-directional communication layer.</span>
        </div>

        <div className="space-y-3">
          {steps.map((step) => {
            const isCurrent = currentStep === step.num;
            const view = viewLabel(step.targetPerspective);
            return (
              <div
                key={step.num}
                className={`p-4 rounded-card border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isCurrent ? 'bg-iris-pulse/6 border-iris-pulse/35' : 'bg-cloud-white border-ash'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                      isCurrent ? 'bg-iris-pulse text-cloud-white' : 'bg-pearl text-deep-iris border border-ash'
                    }`}
                  >
                    {step.num}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-deep-iris flex items-center gap-2 flex-wrap">
                      {step.title}
                      <span className="text-[10px] px-2 py-0.5 rounded-pill bg-pearl text-deep-iris border border-ash inline-flex items-center gap-1 font-medium">
                        {view.icon}
                        {view.text}
                      </span>
                    </h4>
                    <p className="text-xs text-fog mt-0.5 leading-relaxed">{step.description}</p>
                  </div>
                </div>

                <button
                  onClick={() => {
                    onExecuteStep(step.num);
                    onClose();
                  }}
                  className={`text-xs font-medium flex items-center justify-center gap-2 shrink-0 px-4 py-2 rounded-pill transition-colors ${
                    isCurrent
                      ? 'bg-iris-pulse text-cloud-white hover:bg-iris-glow'
                      : 'border border-ash text-deep-iris hover:border-iris-pulse/50 bg-cloud-white'
                  }`}
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Run {step.num}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </Dialog>
  );
};

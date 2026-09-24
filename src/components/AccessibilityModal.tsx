import React from 'react';
import { Dialog } from './ui/Dialog';
import { AccessibilityPrefs } from '../types';
import { Volume2, Type, Eye, Zap } from 'lucide-react';

interface AccessibilityModalProps {
  isOpen: boolean;
  onClose: () => void;
  prefs: AccessibilityPrefs;
  setPrefs: React.Dispatch<React.SetStateAction<AccessibilityPrefs>>;
}

export const AccessibilityModal: React.FC<AccessibilityModalProps> = ({
  isOpen,
  onClose,
  prefs,
  setPrefs,
}) => {
  const panel = 'bg-pearl p-4 rounded-card border border-ash';
  const toggle = (on: boolean) =>
    `w-12 h-6 rounded-full p-1 transition-colors ${on ? 'bg-iris-pulse' : 'bg-ash'}`;
  const knob = (on: boolean) =>
    `w-4 h-4 rounded-full bg-cloud-white transition-transform shadow-sm ${on ? 'translate-x-6' : 'translate-x-0'}`;

  return (
    <Dialog
      isOpen={isOpen}
      onClose={onClose}
      title="Accessibility Preferences"
      subtitle="Designed for high accessibility across varying literacy levels."
      maxWidth="md"
    >
      <div className="space-y-5 py-2">
        <div className={panel}>
          <div className="flex items-center gap-2 text-sm font-semibold text-deep-iris">
            <Type className="w-4 h-4 text-iris-pulse" />
            <span>Text Size</span>
          </div>
          <div className="grid grid-cols-3 gap-2 pt-3">
            {(['normal', 'large', 'xlarge'] as const).map((size) => (
              <button
                key={size}
                onClick={() => setPrefs((p) => ({ ...p, fontSize: size }))}
                className={`py-2 rounded-pill text-xs font-medium border transition-colors capitalize ${
                  prefs.fontSize === size
                    ? 'bg-iris-pulse text-cloud-white border-iris-pulse'
                    : 'bg-cloud-white border-ash text-deep-iris hover:border-iris-border/40'
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        <div className={`${panel} flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-iris-pulse shrink-0" />
            <div>
              <div className="text-sm font-semibold text-deep-iris">Auto-Play Voice</div>
              <div className="text-xs text-fog">Speak incoming messages for low-literacy users.</div>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={prefs.autoPlaySpeech}
            aria-label="Auto-play voice response"
            onClick={() => setPrefs((p) => ({ ...p, autoPlaySpeech: !p.autoPlaySpeech }))}
            className={toggle(prefs.autoPlaySpeech)}
          >
            <div className={knob(prefs.autoPlaySpeech)} />
          </button>
        </div>

        <div className={panel}>
          <div className="flex items-center justify-between text-sm font-semibold text-deep-iris">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-iris-pulse" />
              <span>Voice Speed</span>
            </div>
            <span className="text-xs font-mono text-iris-pulse">{prefs.speechRate}x</span>
          </div>
          <input
            type="range"
            min="0.7"
            max="1.2"
            step="0.1"
            value={prefs.speechRate}
            aria-label="Voice playback speed"
            onChange={(e) => setPrefs((p) => ({ ...p, speechRate: parseFloat(e.target.value) }))}
            className="w-full mt-3 accent-iris-pulse cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-fog mt-1">
            <span>0.7× Clear</span>
            <span>1.0× Normal</span>
            <span>1.2× Fast</span>
          </div>
        </div>

        <div className={`${panel} flex items-center justify-between gap-4`}>
          <div className="flex items-center gap-3">
            <Eye className="w-5 h-5 text-iris-pulse shrink-0" />
            <div>
              <div className="text-sm font-semibold text-deep-iris">Enhanced Contrast</div>
              <div className="text-xs text-fog">Higher contrast for outdoor visibility.</div>
            </div>
          </div>
          <button
            role="switch"
            aria-checked={prefs.highContrast}
            aria-label="Enhanced contrast borders"
            onClick={() => setPrefs((p) => ({ ...p, highContrast: !p.highContrast }))}
            className={toggle(prefs.highContrast)}
          >
            <div className={knob(prefs.highContrast)} />
          </button>
        </div>
      </div>
    </Dialog>
  );
};

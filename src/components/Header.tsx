import React from 'react';
import { Perspective, Language } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/languages';
import { HeartPulse, Globe, Settings, PlayCircle, Stethoscope, User, Split } from 'lucide-react';

interface HeaderProps {
  perspective: Perspective;
  setPerspective: (p: Perspective) => void;
  selectedLanguage: Language;
  setSelectedLanguage: (lang: Language) => void;
  openAccessibilityModal: () => void;
  openDemoScriptModal: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  perspective,
  setPerspective,
  selectedLanguage,
  setSelectedLanguage,
  openAccessibilityModal,
  openDemoScriptModal,
}) => {
  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const tabClass = (active: boolean) =>
    `flex items-center gap-2 px-4 py-2 rounded-full text-[13px] font-medium transition-colors ${
      active
        ? 'bg-iris-pulse text-cloud-white shadow-sm'
        : 'text-fog hover:text-deep-iris hover:bg-pearl'
    }`;

  return (
    <header className="sticky top-0 z-40 w-full bg-cloud-white/95 backdrop-blur-md border-b border-ash">
      <div className="max-w-[1200px] mx-auto h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Brand */}
        <button
          type="button"
          className="flex items-center gap-3 text-left shrink-0"
          onClick={() => setPerspective('patient')}
          aria-label="CareBridge home — go to Patient Portal"
        >
          <div className="w-9 h-9 rounded-icon bg-iris-pulse flex items-center justify-center text-cloud-white">
            <HeartPulse className="w-5 h-5" strokeWidth={1.75} />
          </div>
          <div className="hidden sm:block leading-tight">
            <div className="text-[17px] font-semibold tracking-heading text-deep-iris">
              Care<span className="text-iris-pulse">Bridge</span>
            </div>
            <p className="text-[11px] text-fog">Bridging Healthcare Communication</p>
          </div>
        </button>

        {/* Perspective tabs */}
        <nav
          className="hidden md:flex items-center bg-pearl border border-ash p-1 rounded-pill"
          role="tablist"
          aria-label="Perspective view"
        >
          <button role="tab" aria-selected={perspective === 'patient'} onClick={() => setPerspective('patient')} className={tabClass(perspective === 'patient')}>
            <User className="w-3.5 h-3.5" />
            <span>Patient</span>
          </button>
          <button role="tab" aria-selected={perspective === 'clinician'} onClick={() => setPerspective('clinician')} className={tabClass(perspective === 'clinician')}>
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Clinician</span>
          </button>
          <button role="tab" aria-selected={perspective === 'split'} onClick={() => setPerspective('split')} className={tabClass(perspective === 'split')}>
            <Split className="w-3.5 h-3.5" />
            <span>Split View</span>
          </button>
        </nav>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          <label className="flex items-center gap-2 px-2.5 py-1.5 rounded-full border border-ash bg-cloud-white text-[13px] font-medium text-deep-iris">
            <Globe className="w-3.5 h-3.5 text-iris-pulse shrink-0" />
            <span className="sr-only">Preferred language</span>
            <select
              aria-label="Preferred language"
              value={selectedLanguage}
              onChange={(event) => setSelectedLanguage(event.target.value as Language)}
              className="max-w-[116px] sm:max-w-none bg-transparent outline-none cursor-pointer"
            >
              {SUPPORTED_LANGUAGES.map((lang) => <option key={lang.id} value={lang.id}>{lang.flag} {lang.name}</option>)}
            </select>
          </label>

          <button
            onClick={openDemoScriptModal}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-pill border border-ash bg-cloud-white text-[13px] font-medium text-deep-iris hover:border-iris-border/40 transition-colors"
            title="Start 60-Second Presentation Sequence"
          >
            <PlayCircle className="w-3.5 h-3.5 text-iris-pulse" />
            <span>Demo</span>
          </button>

          <button
            onClick={openAccessibilityModal}
            className="p-2 rounded-full border border-ash bg-cloud-white text-fog hover:text-deep-iris hover:border-iris-border/40 transition-colors"
            title="Accessibility Preferences"
            aria-label="Open accessibility preferences"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Mobile perspective switcher */}
      <nav className="md:hidden border-t border-ash px-4 py-2 flex items-center gap-1" role="tablist" aria-label="Perspective view">
        <button role="tab" aria-selected={perspective === 'patient'} onClick={() => setPerspective('patient')} className={tabClass(perspective === 'patient') + ' flex-1 justify-center'}>
          <User className="w-3.5 h-3.5" />
          <span>Patient</span>
        </button>
        <button role="tab" aria-selected={perspective === 'clinician'} onClick={() => setPerspective('clinician')} className={tabClass(perspective === 'clinician') + ' flex-1 justify-center'}>
          <Stethoscope className="w-3.5 h-3.5" />
          <span>Clinician</span>
        </button>
        <button role="tab" aria-selected={perspective === 'split'} onClick={() => setPerspective('split')} className={tabClass(perspective === 'split') + ' flex-1 justify-center'}>
          <Split className="w-3.5 h-3.5" />
          <span>Split</span>
        </button>
      </nav>
    </header>
  );
};

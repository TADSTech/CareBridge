import React from 'react';
import { HeartPulse, ShieldAlert } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="w-full bg-cloud-white border-t border-ash mt-16">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Safety disclaimer */}
        <div className="bg-pearl border border-ash p-4 rounded-card flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-iris-pulse shrink-0 mt-0.5" strokeWidth={1.75} />
          <div className="space-y-1">
            <h4 className="font-semibold text-deep-iris text-[13px]">
              Healthcare Safety & Responsible AI Communication
            </h4>
            <p className="text-xs text-fog leading-relaxed">
              CareBridge is an assistive communication layer designed to eliminate language, literacy, and accessibility barriers. CareBridge does NOT provide autonomous medical diagnoses, prescribe treatments, or replace healthcare professionals. All clinical decisions remain strictly with licensed healthcare providers.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-deep-iris font-semibold text-base">
              <HeartPulse className="w-5 h-5 text-iris-pulse" strokeWidth={1.75} />
              <span>CareBridge</span>
            </div>
            <p className="text-xs text-fog max-w-md leading-relaxed">
              Helping patients and care teams communicate across language and literacy barriers. Clinicians remain responsible for reviewing every intake.
            </p>
          </div>

          <div className="space-y-3">
            <h5 className="font-semibold text-deep-iris uppercase tracking-caption text-[11px]">
              Supported Languages
            </h5>
            <ul className="space-y-1.5 text-xs text-fog">
              <li>Nigerian Pidgin (Naija)</li>
              <li>Yorùbá (Èdè Yorùbá)</li>
              <li>English (Nigerian / Standard)</li>
              <li>Hausa & Igbo</li>
              <li>Kiswahili (East Africa)</li>
            </ul>
          </div>

          <div className="space-y-3">
            <h5 className="font-semibold text-deep-iris uppercase tracking-caption text-[11px]">
              Enterprise & Clinic Solutions
            </h5>
            <ul className="space-y-1.5 text-xs text-fog">
              <li>Hospital & Clinic Subscriptions</li>
              <li>NGO Community Deployments</li>
              <li>Telehealth API Integration</li>
              <li>Low-Bandwidth Edge Support</li>
            </ul>
          </div>
        </div>

        <div className="border-t border-ash pt-6 flex flex-col sm:flex-row items-center justify-between text-[11px] text-fog gap-2">
          <div>© {new Date().getFullYear()} CareBridge Health Platform. All rights reserved.</div>
          <div className="flex items-center gap-4">
            <span className="font-medium text-iris-pulse">Live Production Demonstration</span>
            <span aria-hidden="true">·</span>
            <span>Lagos & Pan-African Deployment</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

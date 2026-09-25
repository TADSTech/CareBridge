import React, { useRef, useState } from 'react';
import { Message, Language, AccessibilityPrefs } from '../../types';
import { SUPPORTED_LANGUAGES } from '../../services/languages';
import { SpeechEngine } from '../../services/speechEngine';
import { AudioWaveform } from '../ui/AudioWaveform';
import {
  Mic,
  MicOff,
  Send,
  Volume2,
  VolumeX,
  Sparkles,
  Globe,
  CheckCircle2,
  Clock,
  ShieldCheck,
  User,
  Stethoscope,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface PatientViewProps {
  selectedLanguage: Language;
  setSelectedLanguage: (lang: Language) => void;
  messages: Message[];
  onSendMessage: (text: string, language: Language) => Promise<void>;
  isProcessing: boolean;
  prefs: AccessibilityPrefs;
  addToast: (text: string, type?: 'success' | 'error' | 'info') => void;
}

export const PatientView: React.FC<PatientViewProps> = ({
  selectedLanguage,
  setSelectedLanguage,
  messages,
  onSendMessage,
  isProcessing,
  prefs,
  addToast,
}) => {
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const currentLang = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage) || SUPPORTED_LANGUAGES[0];

  const toggleRecording = async () => {
    if (isRecording) {
      recorderRef.current?.stop();
      setIsRecording(false);
      addToast('Recording stopped. Transcribing…', 'info');
    } else {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) { addToast('This browser cannot record audio. Type your message instead.', 'error'); return; }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorderRef.current = recorder;
        chunksRef.current = [];
        recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data); };
        recorder.onstop = async () => {
          stream.getTracks().forEach((track) => track.stop());
          const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'audio/webm' });
          if (blob.size > 10_000_000) { addToast('Recording is over 10 MB. Please record a shorter message.', 'error'); return; }
          try {
            const audioBase64 = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onerror = () => reject(new Error('Could not read the recording.'));
              reader.onload = () => resolve(String(reader.result).split(',')[1] || '');
              reader.readAsDataURL(blob);
            });
            const response = await fetch('/api/asr', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioBase64, mimeType: blob.type, language: selectedLanguage }) });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Transcription failed.');
            setInputText((previous) => [previous, result.transcript].filter(Boolean).join(' '));
            addToast('Transcript ready. Review it before sending.', 'success');
          } catch (error) { addToast(error instanceof Error ? error.message : 'Transcription failed. Type your message instead.', 'error'); }
        };
        recorder.start();
        setIsRecording(true);
        addToast(`Recording in ${currentLang.name}. Tap stop when finished.`, 'info');
      } catch { addToast('Microphone permission was denied or unavailable. Type your message instead.', 'error'); }
    }
  };

  const handleSend = async () => {
    if (!inputText.trim()) return;
    const textToSend = inputText;
    setInputText('');
    try {
      await onSendMessage(textToSend, selectedLanguage);
    } catch {
      setInputText(textToSend);
    }
  };

  const handlePlayVoice = (id: string, text: string, lang: Language) => {
    if (playingAudioId === id) {
      SpeechEngine.stopSpeaking();
      setPlayingAudioId(null);
    } else {
      setPlayingAudioId(id);
      addToast('Playing voice audio...', 'info');
      SpeechEngine.speak(text, lang, prefs.speechRate, () => setPlayingAudioId(null));
    }
  };

  return (
    <div className="max-w-[720px] mx-auto space-y-5 pb-12 px-4">
      {/* Intro */}
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-pill bg-iris-pulse/8 border border-iris-pulse/20 text-iris-pulse text-xs font-medium mb-3">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Safe Healthcare Communication</span>
            </div>

            <h1 className="text-2xl sm:text-[32px] leading-tight tracking-heading text-deep-iris">
              Tell CareBridge how <span className="word-highlight">you feel</span>
            </h1>

            <p className="text-sm text-fog mt-3 max-w-lg leading-relaxed">
              Speak or type in your language. Your words stay visible while the care team gets an intake draft and follow-up questions.
            </p>
          </div>

          <div className="shrink-0 w-full md:w-auto">
            <div className="text-[11px] font-semibold text-fog flex items-center justify-between mb-2">
              <span>Your Language</span>
              <Globe className="w-3 h-3 text-iris-pulse" />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {SUPPORTED_LANGUAGES.slice(0, 3).map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => setSelectedLanguage(lang.id)}
                  className={`px-3 py-1.5 rounded-pill text-xs font-medium transition-colors border ${
                    selectedLanguage === lang.id
                      ? 'bg-iris-pulse text-cloud-white border-iris-pulse'
                      : 'bg-cloud-white text-deep-iris border-ash hover:border-iris-border/40'
                  }`}
                >
                  {lang.flag} {lang.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Voice + text entry */}
      <section className="surface-card p-6 sm:p-8">
        <div className="flex flex-col items-center text-center space-y-5">
          <button
            onClick={toggleRecording}
            disabled={isProcessing}
            aria-label={isRecording ? 'Stop recording' : 'Start voice recording'}
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center transition-colors border-2 ${
              isRecording
                ? 'bg-red-500 text-cloud-white border-red-400'
                : 'bg-iris-pulse text-cloud-white border-iris-pulse hover:bg-iris-glow'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isRecording ? (
              <>
                <MicOff className="w-8 h-8" />
                <span className="text-[9px] font-semibold mt-0.5 uppercase tracking-wider">Stop</span>
              </>
            ) : (
              <>
                <Mic className="w-8 h-8" />
                <span className="text-[9px] font-semibold mt-0.5 uppercase tracking-wider">Speak</span>
              </>
            )}
          </button>

          <div className="h-8 flex items-center justify-center">
            {isRecording ? (
              <AudioWaveform active color="violet" bars={16} height="h-8" />
            ) : (
              <p className="text-xs text-fog">Record a short message, then review and edit its transcript before sending</p>
            )}
          </div>

          <div className="relative w-full max-w-xl">
            <label htmlFor="patient-input" className="sr-only">Your message</label>
            <textarea
              id="patient-input"
              rows={2}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={`Type in ${currentLang.name} (e.g., "${currentLang.sampleInput}")...`}
              className="w-full bg-pearl border border-ash rounded-input px-4 py-3 pr-14 text-sm text-deep-iris placeholder-fog focus:outline-none focus:border-iris-pulse transition-colors resize-none"
            />
            <button
              onClick={handleSend}
              disabled={!inputText.trim() || isProcessing}
              aria-label="Send message"
              className="absolute right-3 bottom-3 p-2 rounded-full bg-iris-pulse text-cloud-white hover:bg-iris-glow disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="w-full pt-1">
            <div className="text-[11px] font-semibold text-fog mb-2 uppercase tracking-caption text-left">
              Sample prompts
            </div>
            <div className="flex flex-wrap gap-2">
              {SUPPORTED_LANGUAGES.map((lang) => (
                <button
                  key={lang.id}
                  onClick={() => {
                    setSelectedLanguage(lang.id);
                    setInputText(lang.sampleInput);
                    addToast(`Loaded ${lang.name} sample prompt`, 'success');
                  }}
                  className="px-3 py-1.5 rounded-pill bg-pearl border border-ash text-xs text-deep-iris hover:border-iris-border/50 transition-colors text-left truncate max-w-xs"
                >
                  <span className="mr-1">{lang.flag}</span>
                  <span className="text-fog">"{lang.sampleInput}"</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Thread */}
      <section className="space-y-4">
        <div className="flex items-center justify-between border-b border-ash pb-2 px-1">
          <h2 className="text-base font-semibold text-deep-iris flex items-center gap-2">
            <Clock className="w-4 h-4 text-iris-pulse" />
            <span>Active Consultation</span>
          </h2>
          <span className="text-xs text-fog font-medium">{messages.length} messages</span>
        </div>

        {isProcessing && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-card p-4 flex items-center gap-4 border-iris-pulse/30"
          >
            <div className="w-9 h-9 rounded-full bg-iris-pulse/10 flex items-center justify-center text-iris-pulse">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <div className="text-sm font-semibold text-deep-iris">Processing patient input…</div>
              <div className="text-xs text-fog mt-0.5">
                Keeping the patient’s words intact and preparing an intake draft
              </div>
            </div>
          </motion.div>
        )}

        {messages.length === 0 && !isProcessing ? (
          <div className="surface-card border-dashed p-8 text-center space-y-3">
            <User className="w-7 h-7 text-fog mx-auto" />
            <p className="text-sm text-deep-iris font-medium">No messages yet</p>
            <p className="text-xs text-fog">
              Use the microphone or a sample prompt to start the consultation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.sender === 'patient' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[92%] sm:max-w-[560px] rounded-card p-5 space-y-3 border ${
                      msg.sender === 'patient'
                        ? 'bg-iris-pulse/8 border-iris-pulse/20'
                        : 'bg-cloud-white border-ash shadow-card'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-fog border-b border-ash pb-2">
                      <div className="flex items-center gap-2 font-semibold">
                        {msg.sender === 'patient' ? (
                          <>
                            <User className="w-3.5 h-3.5 text-iris-pulse" />
                            <span className="text-deep-iris">You (Patient)</span>
                            <span className="px-2 py-0.5 rounded-pill bg-cloud-white text-[10px] text-deep-iris border border-ash">
                              {SUPPORTED_LANGUAGES.find((l) => l.id === msg.originalLanguage)?.flag}{' '}
                              {msg.originalLanguage.toUpperCase()}
                            </span>
                          </>
                        ) : (
                          <>
                            <Stethoscope className="w-3.5 h-3.5 text-iris-pulse" />
                            <span className="text-deep-iris">Doctor / Healthcare Worker</span>
                            <span className="px-2 py-0.5 rounded-pill bg-iris-pulse/10 text-iris-pulse border border-iris-pulse/25 text-[10px]">
                              Clinician response
                            </span>
                          </>
                        )}
                      </div>
                      <span className="font-mono text-[11px]">{msg.timestamp}</span>
                    </div>

                    <div>
                      {msg.sender === 'patient' ? (
                        <p className="text-sm font-medium leading-relaxed text-deep-iris">{msg.originalText}</p>
                      ) : (
                        <div className="space-y-2">
                          <p className="text-[15px] font-semibold text-deep-iris leading-relaxed">
                            “{msg.translatedText || msg.originalText}”
                          </p>
                          {msg.simplifiedText && (
                            <div className="text-xs text-fog bg-pearl p-3 rounded-xl border border-ash">
                              <span className="font-semibold text-deep-iris">Plain English:</span>{' '}
                              {msg.simplifiedText}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs gap-2 flex-wrap">
                      <button
                        onClick={() =>
                          handlePlayVoice(
                            msg.id,
                            msg.sender === 'patient' ? msg.originalText : (msg.translatedText || msg.originalText),
                            msg.originalLanguage
                          )
                        }
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-pill border text-xs font-medium transition-colors ${
                          playingAudioId === msg.id
                            ? 'bg-iris-pulse text-cloud-white border-iris-pulse'
                            : 'bg-cloud-white border-ash text-deep-iris hover:border-iris-border/50'
                        }`}
                      >
                        {playingAudioId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-iris-pulse" />
                        )}
                        <span>
                          {playingAudioId === msg.id
                            ? 'Stop'
                            : `Listen · ${msg.originalLanguage.toUpperCase()}`}
                        </span>
                      </button>

                      {msg.sender === 'patient' && msg.translatedText && (
                        <div className="text-[11px] text-iris-pulse flex items-center gap-1 font-medium">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Structured for clinician</span>
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </section>
    </div>
  );
};

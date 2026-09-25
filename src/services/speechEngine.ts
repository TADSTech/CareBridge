import { Language } from '../types';

export interface SpeechRecognitionCallbacks {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export class SpeechEngine {
  private static recognition: any = null;
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;
  private static audio: HTMLAudioElement | null = null;
  private static requestController: AbortController | null = null;
  private static requestId = 0;

  /**
   * Start microphone listening using the browser Web Speech API.
   */
  static startListening(language: Language, callbacks: SpeechRecognitionCallbacks): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API is not supported in this browser environment.');
      return false;
    }

    try {
      if (this.recognition) {
        this.recognition.abort();
      }

      const recognition = new SpeechRecognition();
      this.recognition = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;

      // Set language code
      switch (language) {
        case 'yoruba':
          recognition.lang = 'yo-NG';
          break;
        case 'hausa':
          recognition.lang = 'ha-NG';
          break;
        case 'igbo':
          recognition.lang = 'ig-NG';
          break;
        case 'swahili':
          recognition.lang = 'sw-KE';
          break;
        case 'pidgin':
        case 'english':
        default:
          recognition.lang = 'en-NG';
          break;
      }

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        callbacks.onResult(transcript);
      };

      recognition.onerror = (event: any) => {
        callbacks.onError(event.error);
      };

      recognition.onend = () => {
        callbacks.onEnd();
      };

      recognition.start();
      return true;
    } catch (err) {
      callbacks.onError('Could not initialize microphone access.');
      return false;
    }
  }

  /**
   * Stop active speech recognition.
   */
  static stopListening() {
    if (this.recognition) {
      try {
        this.recognition.stop();
      } catch (e) {
        // ignore
      }
    }
  }

  /**
   * Prefer YarnGPT speech; use browser speech synthesis when the API is unavailable.
   */
  static speak(text: string, language: Language, rate: number = 0.95, onEnd?: () => void): void {
    void this.speakWithYarn(text, language, rate, onEnd);
  }

  private static async speakWithYarn(text: string, language: Language, rate: number, onEnd?: () => void) {
    this.stopSpeaking();
    const requestId = this.requestId;
    const controller = new AbortController();
    this.requestController = controller;
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language, translated: true }),
        signal: controller.signal,
      });
      if (requestId !== this.requestId) return;
      if (!response.ok) throw new Error('YarnGPT voice is unavailable.');
      const audioUrl = URL.createObjectURL(await response.blob());
      const audio = new Audio(audioUrl);
      this.audio = audio;
      audio.playbackRate = rate;
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.audio === audio) this.audio = null;
        onEnd?.();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        if (this.audio === audio) this.audio = null;
        this.speakInBrowser(text, language, rate, onEnd);
      };
      await audio.play();
    } catch {
      if (requestId !== this.requestId) return;
      this.speakInBrowser(text, language, rate, onEnd);
    } finally {
      if (this.requestController === controller) this.requestController = null;
    }
  }

  private static speakInBrowser(text: string, language: Language, rate: number, onEnd?: () => void): void {
    if (!this.synth) {
      if (onEnd) onEnd();
      return;
    }

    // Cancel any ongoing speech
    this.synth.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = rate;
    utterance.pitch = 1.0;

    // Pick appropriate voice if available
    const voices = this.synth.getVoices();
    let selectedVoice = null;

    if (voices.length > 0) {
      if (language === 'yoruba') {
        selectedVoice = voices.find((v) => v.lang.startsWith('yo') || v.lang.includes('NG'));
      } else if (language === 'swahili') {
        selectedVoice = voices.find((v) => v.lang.startsWith('sw') || v.lang.startsWith('ke'));
      } else if (language === 'pidgin' || language === 'english') {
        selectedVoice =
          voices.find((v) => v.lang === 'en-NG' || v.name.includes('Nigeria')) ||
          voices.find((v) => v.lang.startsWith('en-GB')) ||
          voices.find((v) => v.lang.startsWith('en'));
      }
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    utterance.onend = () => {
      if (onEnd) onEnd();
    };

    utterance.onerror = () => {
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  /**
   * Stop any active audio playback.
   */
  static stopSpeaking() {
    this.requestId += 1;
    this.requestController?.abort();
    this.requestController = null;
    if (this.audio) {
      this.audio.pause();
      this.audio = null;
    }
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

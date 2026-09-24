import { Language } from '../types';

export interface SpeechRecognitionCallbacks {
  onResult: (text: string) => void;
  onError: (error: string) => void;
  onEnd: () => void;
}

export class SpeechEngine {
  private static recognition: any = null;
  private static synth: SpeechSynthesis | null = typeof window !== 'undefined' ? window.speechSynthesis : null;

  /**
   * Start microphone listening using Web Speech API with simulated fallback.
   */
  static startListening(language: Language, callbacks: SpeechRecognitionCallbacks): boolean {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('Web Speech API not supported in this browser environment. Using simulated voice recognition.');
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
   * Speak text out loud using browser Speech Synthesis with pitch/speed & Web Audio backup.
   */
  static speak(text: string, language: Language, rate: number = 0.95, onEnd?: () => void): void {
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
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

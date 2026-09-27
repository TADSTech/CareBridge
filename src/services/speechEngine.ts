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
        case 'afrikaans':
          recognition.lang = 'af-ZA';
          break;
        case 'amharic':
          recognition.lang = 'am-ET';
          break;
        case 'zulu':
          recognition.lang = 'zu-ZA';
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

  /** Use the language's configured provider; surface provider failures clearly. */
  static speak(text: string, language: Language, rate: number = 0.95, onEnd?: () => void): Promise<string> {
    return this.speakWithProvider(text, language, rate, onEnd);
  }

  private static async speakWithProvider(text: string, language: Language, rate: number, onEnd?: () => void): Promise<string> {
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
      if (requestId !== this.requestId) return '';
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.error || `Voice service returned ${response.status}.`);
      }
      const provider = response.headers.get('X-CareBridge-Voice-Provider') || 'configured voice service';
      const fallbackFor = response.headers.get('X-CareBridge-Voice-Fallback');
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
        onEnd?.();
      };
      await audio.play();
      return fallbackFor ? `${provider} fallback (after ${fallbackFor})` : provider;
    } catch (error) {
      if (requestId !== this.requestId) return '';
      throw error;
    } finally {
      if (this.requestController === controller) this.requestController = null;
    }
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

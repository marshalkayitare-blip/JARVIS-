/**
 * Voice & Audio Processing System for J.A.R.V.I.S
 * Integrates Web Speech Recognition, Web Speech Synthesis, and Web Audio API
 */

export class VoiceSystem {
  private recognition: any = null;
  private synth: SpeechSynthesis | null = null;
  private selectedVoice: SpeechSynthesisVoice | null = null;
  private audioContext: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private micStream: MediaStream | null = null;
  private isListening: boolean = false;
  private isSpeaking: boolean = false;

  public onStateChange?: (state: 'IDLE' | 'LISTENING' | 'THINKING' | 'SPEAKING' | 'ERROR') => void;
  public onTranscript?: (finalText: string, interimText: string) => void;
  public onError?: (errorMsg: string) => void;

  constructor() {
    if (typeof window !== 'undefined') {
      this.synth = window.speechSynthesis || null;
      this.initVoice();
      this.initRecognition();
    }
  }

  private initVoice() {
    if (!this.synth) return;

    const pickBestVoice = () => {
      try {
        const voices = this.synth?.getVoices() || [];
        if (voices.length === 0) return;

        // Prefer distinguished British / UK English voices (classic J.A.R.V.I.S.)
        const ukMaleVoice = voices.find(
          (v) =>
            v.lang.includes('en-GB') ||
            v.name.includes('UK') ||
            v.name.includes('British') ||
            v.name.includes('Daniel') ||
            v.name.includes('George') ||
            v.name.includes('Oliver')
        );
        const enVoice = voices.find((v) => v.lang.startsWith('en'));
        this.selectedVoice = ukMaleVoice || enVoice || voices[0] || null;
      } catch (err) {
        // Fallback silently
      }
    };

    pickBestVoice();
    if (this.synth.onvoiceschanged !== undefined) {
      this.synth.onvoiceschanged = pickBestVoice;
    }
  }

  private initRecognition() {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      return;
    }

    try {
      this.recognition = new SpeechRecognition();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.lang = 'en-US';

      this.recognition.onstart = () => {
        this.isListening = true;
        this.onStateChange?.('LISTENING');
      };

      this.recognition.onresult = (event: any) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        this.onTranscript?.(finalTranscript, interimTranscript);
      };

      this.recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech' && event.error !== 'aborted') {
          console.warn('[J.A.R.V.I.S] Speech recognition event:', event.error);
        }
      };

      this.recognition.onend = () => {
        this.isListening = false;
        this.stopAudioAnalysis();
      };
    } catch (e) {
      console.warn('[J.A.R.V.I.S] SpeechRecognition initialization deferred:', e);
    }
  }

  /**
   * Activate microphone and Web Audio Analyser
   */
  public async startListening(): Promise<boolean> {
    if (!this.recognition) {
      this.onError?.('Voice recognition unsupported. Please use text input or Chrome/Edge.');
      return false;
    }

    // Stop ongoing speech if speaking
    this.stopSpeaking();

    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioCtxClass) {
            this.audioContext = new AudioCtxClass();
            const source = this.audioContext.createMediaStreamSource(this.micStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 64;
            source.connect(this.analyser);
          }
        } catch (micErr) {
          // Handled gracefully: Audio visualization will use simulated waveform
        }
      }

      this.recognition.start();
      return true;
    } catch (err: any) {
      console.warn('[J.A.R.V.I.S] Recognition start:', err?.message || err);
      return false;
    }
  }

  public stopListening() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch (e) {}
    }
    this.stopAudioAnalysis();
  }

  private stopAudioAnalysis() {
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close().catch(() => {});
      this.audioContext = null;
    }
    this.analyser = null;
  }

  /**
   * Speak text via Browser Speech Synthesis
   */
  public speak(text: string, onEndCallback?: () => void) {
    if (!this.synth) {
      onEndCallback?.();
      return;
    }

    try {
      // Cancel previous speech safely
      if (this.synth.speaking || this.synth.pending) {
        this.synth.cancel();
      }
      if (this.synth.resume) {
        this.synth.resume();
      }
    } catch (e) {
      // Ignore cancel errors
    }

    const cleanText = text
      .replace(/[*_#`~]/g, '') // Strip markdown formatting
      .replace(/\[.*?\]/g, '') // Strip directive tags
      .replace(/\n+/g, '. ')
      .trim();

    if (!cleanText) {
      onEndCallback?.();
      return;
    }

    const utterance = new SpeechSynthesisUtterance(cleanText);
    if (this.selectedVoice) {
      utterance.voice = this.selectedVoice;
    }
    utterance.rate = 1.05; // Refined, measured cadence
    utterance.pitch = 0.95; // Authoritative tone
    utterance.volume = 1.0;

    utterance.onstart = () => {
      this.isSpeaking = true;
      this.onStateChange?.('SPEAKING');
    };

    utterance.onend = () => {
      this.isSpeaking = false;
      this.onStateChange?.('IDLE');
      onEndCallback?.();
    };

    utterance.onerror = (e: any) => {
      // 'canceled' or 'interrupted' are standard browser lifecycle events when a new message starts
      const errType = e?.error || '';
      if (errType !== 'canceled' && errType !== 'interrupted') {
        console.warn('[J.A.R.V.I.S] Speech synthesis notification:', errType || 'interrupted');
      }
      this.isSpeaking = false;
      this.onStateChange?.('IDLE');
      onEndCallback?.();
    };

    try {
      this.synth.speak(utterance);
    } catch (err) {
      console.warn('[J.A.R.V.I.S] Speech playback bypassed:', err);
      this.isSpeaking = false;
      this.onStateChange?.('IDLE');
      onEndCallback?.();
    }
  }

  public stopSpeaking() {
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {}
    }
    this.isSpeaking = false;
  }

  /**
   * Read real audio volume from mic (if listening) or compute speech cadence
   */
  public getAudioLevel(): number {
    if (this.isListening && this.analyser) {
      const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
      this.analyser.getByteFrequencyData(dataArray);
      let sum = 0;
      for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
      }
      const avg = sum / dataArray.length;
      return Math.min(1.0, avg / 128);
    }

    if (this.isSpeaking) {
      // Harmonic simulated speech cadence
      const time = Date.now() / 150;
      const wave = Math.sin(time) * 0.4 + Math.cos(time * 2.3) * 0.3 + 0.3;
      return Math.max(0.1, Math.min(0.9, wave));
    }

    return 0;
  }

  public getIsListening(): boolean {
    return this.isListening;
  }

  public getIsSpeaking(): boolean {
    return this.isSpeaking;
  }
}

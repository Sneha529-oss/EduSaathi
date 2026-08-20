/**
 * EduSaathi Voice & Speech Service
 * Modular browser Web Speech API implementation for STT and TTS.
 */

export class VoiceService {
  constructor() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = SpeechRecognition ? new SpeechRecognition() : null;
    this.isListening = false;
    this.synth = window.speechSynthesis || null;

    if (this.recognition) {
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
    }
  }

  isSupported() {
    return Boolean(this.recognition);
  }

  startListening({ language = 'en-US', onResult, onError, onEnd, onStart }) {
    if (!this.recognition) {
      if (onError) onError('Speech recognition is not supported in this browser. Please use Chrome, Edge, or Safari.');
      return;
    }

    // Map language code to BCP-47 locale
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      bn: 'bn-IN',
      gu: 'gu-IN',
      pa: 'pa-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      ur: 'ur-IN',
    };

    this.recognition.lang = langMap[language] || 'en-IN';

    this.recognition.onstart = () => {
      this.isListening = true;
      if (onStart) onStart();
    };

    this.recognition.onresult = (event) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      if (onResult) {
        onResult({ text: final || interim, isFinal: Boolean(final) });
      }
    };

    this.recognition.onerror = (event) => {
      this.isListening = false;
      console.warn('Speech Recognition Event Error:', event.error);
      let msg = 'Could not capture speech. Please try again.';
      if (event.error === 'not-allowed') {
        msg = 'Microphone permission was denied. Please allow microphone access in your browser settings.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech was detected. Please speak into your microphone.';
      }
      if (onError) onError(msg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      if (onEnd) onEnd();
    };

    try {
      this.recognition.start();
    } catch (e) {
      console.warn('Speech start error:', e);
      if (onError) onError(e.message);
    }
  }

  stopListening() {
    if (this.recognition && this.isListening) {
      this.recognition.stop();
      this.isListening = false;
    }
  }

  speak(text, language = 'en', { onStart, onEnd, onError } = {}) {
    if (!this.synth) {
      // No TTS available in this browser — surface it rather than silently doing nothing,
      // so the UI can fall back to text-only display.
      if (onError) onError('Text-to-speech is not supported in this browser.');
      if (onEnd) onEnd();
      return;
    }
    this.synth.cancel(); // Stop any ongoing speech

    const utterance = new SpeechSynthesisUtterance(text);
    const langMap = {
      en: 'en-IN',
      hi: 'hi-IN',
      mr: 'mr-IN',
      ta: 'ta-IN',
      te: 'te-IN',
      bn: 'bn-IN',
      gu: 'gu-IN',
      pa: 'pa-IN',
      kn: 'kn-IN',
      ml: 'ml-IN',
      ur: 'ur-IN',
    };
    utterance.lang = langMap[language] || 'en-IN';
    utterance.rate = 1.0;
    utterance.pitch = 1.05;

    utterance.onstart = () => { if (onStart) onStart(); };
    utterance.onend = () => { if (onEnd) onEnd(); };
    utterance.onerror = (e) => {
      console.warn('TTS error:', e.error);
      if (onError) onError(e.error);
      if (onEnd) onEnd();
    };

    this.synth.speak(utterance);
  }

  stopSpeaking() {
    if (this.synth) {
      this.synth.cancel();
    }
  }
}

export const voiceService = new VoiceService();

import React, { useState, useEffect, useRef } from 'react';
import AIAvatar from '../avatar/AIAvatar';
import { voiceService } from '../../services/voice';
import { Mic, MicOff, X, Send, AlertCircle, Volume2, Sparkles, RotateCcw } from 'lucide-react';
import { t } from '../../utils/i18n';

/**
 * VoiceModal — true end-to-end voice pipeline:
 *   mic -> SpeechRecognition (STT) -> onSendToAssistant() -> backend (LLM + tools)
 *   -> reply text shown here -> SpeechSynthesis (TTS) -> avatar animates throughout.
 *
 * This modal does NOT manage its own copy of the chat log or avatar state — both
 * are passed down from App.jsx so a spoken exchange is part of the SAME
 * conversation the text chat sees (same backend session_id), not a separate one.
 */
export default function VoiceModal({
  isOpen,
  onClose,
  onSendToAssistant,
  currentRole = 'student',
  currentLang = 'en',
  currentUser,
  assistantLoading = false,
  avatarState = 'idle',
  messages = [],
}) {
  const [transcript, setTranscript] = useState('');
  const [micState, setMicState] = useState('idle'); // 'idle' | 'listening' | 'error'
  const [errorMessage, setErrorMessage] = useState('');
  const [hasAutoSent, setHasAutoSent] = useState(false);

  const lastAssistantMsg = [...messages].reverse().find((m) => m.sender === 'assistant');
  const lastAssistantMsgId = lastAssistantMsg?.id;
  const prevAssistantIdRef = useRef(lastAssistantMsgId);

  // Effective avatar state: while capturing speech, show 'listening' regardless of
  // the shared avatar state (which reflects the LAST completed exchange, not the
  // mic). Otherwise defer to the shared state so thinking/speaking/error show correctly.
  const displayState = micState === 'listening' ? 'listening' : micState === 'error' ? 'error' : avatarState;

  const startListening = () => {
    setErrorMessage('');
    setTranscript('');
    setMicState('listening');
    setHasAutoSent(false);

    voiceService.startListening({
      language: currentLang,
      onStart: () => setMicState('listening'),
      onResult: ({ text, isFinal }) => {
        setTranscript(text);
        if (isFinal && text.trim()) {
          // Auto-send as soon as the browser confirms a final transcript —
          // this is what makes it a real voice conversation instead of a
          // "speak, then remember to press Send" flow.
          setMicState('idle');
          setHasAutoSent(true);
          onSendToAssistant(text.trim());
        }
      },
      onError: (errText) => {
        setErrorMessage(errText);
        setMicState('error');
      },
      onEnd: () => {
        setMicState((s) => (s === 'listening' ? 'idle' : s));
      },
    });
  };

  // Start listening automatically whenever the modal opens.
  useEffect(() => {
    if (isOpen) {
      startListening();
    } else {
      voiceService.stopListening();
      voiceService.stopSpeaking();
    }
    return () => {
      voiceService.stopListening();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Once a new assistant reply lands after we auto-sent, clear the transcript
  // so the box is ready for the next turn (the reply itself renders separately).
  useEffect(() => {
    if (lastAssistantMsgId && lastAssistantMsgId !== prevAssistantIdRef.current) {
      prevAssistantIdRef.current = lastAssistantMsgId;
      if (hasAutoSent) {
        setTranscript('');
      }
    }
  }, [lastAssistantMsgId, hasAutoSent]);

  if (!isOpen) return null;

  const handleStopListening = () => {
    voiceService.stopListening();
    setMicState('idle');
  };

  const handleManualSend = () => {
    if (transcript.trim() && !assistantLoading) {
      voiceService.stopListening();
      setMicState('idle');
      setHasAutoSent(true);
      onSendToAssistant(transcript.trim());
    }
  };

  const handleAskAnother = () => {
    startListening();
  };

  const showReply = hasAutoSent && lastAssistantMsg && !assistantLoading && micState !== 'listening';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-brand-950/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl border border-brand-100 shadow-2xl w-full max-w-md overflow-hidden flex flex-col items-center p-7 relative space-y-5">

        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl text-content-muted hover:bg-brand-50 hover:text-brand-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700">
            <Sparkles className="w-3.5 h-3.5" />
            {t('voiceAssistant', currentLang)}
          </div>
          <h3 className="text-lg font-extrabold text-brand-950">
            "Talk to EduSaathi"
          </h3>
          <p className="text-xs text-content-muted">
            Language: <b className="text-brand-800 uppercase">{currentLang}</b> • Role: <b className="text-brand-800 capitalize">{currentRole}</b>
          </p>
        </div>

        {/* Big Animated Robot Avatar — reflects the REAL pipeline state (listening/thinking/speaking) */}
        <div className="my-2">
          <AIAvatar state={displayState} size="xl" personaRole={currentRole} />
        </div>

        {/* Live Status Indicator */}
        <div className="flex items-center gap-2 text-xs font-bold">
          {displayState === 'listening' && (
            <span className="flex items-center gap-2 text-cyan-600 animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-ping" />
              {t('listen', currentLang)}
            </span>
          )}
          {displayState === 'thinking' && (
            <span className="flex items-center gap-2 text-violet-600">
              <span className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-pulse" />
              Thinking &amp; checking your records...
            </span>
          )}
          {displayState === 'speaking' && (
            <span className="flex items-center gap-2 text-brand-700">
              <Volume2 className="w-3.5 h-3.5" />
              Speaking response...
            </span>
          )}
          {displayState === 'error' && (
            <span className="text-rose-600 flex items-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {errorMessage ? 'Capture Error' : 'Something went wrong'}
            </span>
          )}
          {displayState === 'idle' && !transcript && (
            <span className="text-content-muted font-semibold">
              Tap "Listen Again" to speak
            </span>
          )}
        </div>

        {/* Live Transcript / Reply Box */}
        <div className="w-full min-h-[90px] max-h-[160px] bg-brand-50/70 border border-brand-200/80 rounded-2xl p-4 overflow-y-auto text-xs text-brand-950 flex flex-col justify-center gap-2">
          {errorMessage ? (
            <p className="text-rose-600 font-medium text-xs text-center">{errorMessage}</p>
          ) : (
            <>
              {transcript && (
                <p className="text-brand-500 text-[10px] font-bold uppercase tracking-wide">You said</p>
              )}
              {transcript && (
                <p className="font-semibold text-brand-900 leading-relaxed italic">"{transcript}"</p>
              )}
              {assistantLoading && (
                <p className="text-brand-500 italic text-center">EduSaathi is checking your records...</p>
              )}
              {showReply && (
                <>
                  <p className="text-emerald-600 text-[10px] font-bold uppercase tracking-wide pt-1 border-t border-brand-200/60">
                    EduSaathi replied
                  </p>
                  <p className="font-semibold text-brand-900 leading-relaxed">{lastAssistantMsg.content}</p>
                </>
              )}
              {!transcript && !assistantLoading && !showReply && (
                <p className="text-content-muted italic text-center">Speak now into your microphone...</p>
              )}
            </>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-3 w-full pt-1">
          {micState === 'listening' ? (
            <button
              onClick={handleStopListening}
              className="px-5 py-2.5 rounded-2xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-bold text-xs flex items-center gap-2 border border-rose-200 transition-all"
            >
              <MicOff className="w-4 h-4" />
              <span>Stop Listening</span>
            </button>
          ) : showReply ? (
            <button
              onClick={handleAskAnother}
              className="px-5 py-2.5 rounded-2xl bg-brand-50 text-brand-700 hover:bg-brand-100 font-bold text-xs flex items-center gap-2 border border-brand-200 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Ask Another Question</span>
            </button>
          ) : (
            !assistantLoading && (
              <button
                onClick={handleAskAnother}
                className="px-5 py-2.5 rounded-2xl bg-brand-50 text-brand-700 hover:bg-brand-100 font-bold text-xs flex items-center gap-2 border border-brand-200 transition-all"
              >
                <Mic className="w-4 h-4" />
                <span>Listen Again</span>
              </button>
            )
          )}

          {/* Manual send — covers browsers/mics that don't reliably fire a final
              transcript event, so the flow never gets stuck waiting on autodetect. */}
          {transcript.trim() && micState === 'listening' && (
            <button
              onClick={handleManualSend}
              className="px-6 py-2.5 rounded-2xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center gap-2 shadow-brand-sm transition-all"
            >
              <span>{t('send', currentLang)}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

      </div>
    </div>
  );
}

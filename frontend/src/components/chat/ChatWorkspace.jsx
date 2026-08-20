import React, { useState, useEffect, useRef } from 'react';
import AIAvatar from '../avatar/AIAvatar';
import { voiceService } from '../../services/voice';
import { 
  Bot, 
  Send, 
  Mic, 
  Sparkles, 
  ShieldCheck, 
  UserCheck, 
  Volume2, 
  VolumeX, 
  AlertCircle, 
  CheckCircle2, 
  Layers, 
  Globe, 
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function ChatWorkspace({ 
  currentUser, 
  currentRole = 'student', 
  currentLang = 'en', 
  onOpenVoiceModal,
  initialPrompt = '',
  messages = [],
  loading = false,
  avatarState = 'idle',
  onSend,
}) {
  const [inputText, setInputText] = useState(initialPrompt || '');
  const [speakingMsgId, setSpeakingMsgId] = useState(null);
  const [backendError, setBackendError] = useState('');

  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (initialPrompt) {
      setInputText(initialPrompt);
    }
  }, [initialPrompt]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSendMessage = async (customText = null) => {
    const textToSend = (customText || inputText).trim();
    if (!textToSend || loading) return;

    setInputText('');
    setBackendError('');

    const result = await onSend(textToSend);
    if (result === null) {
      // sendToAssistant already appended an error bubble to the shared message
      // list — surface a lightweight banner too, in case it scrolled past.
      setBackendError('Unable to reach the EduSaathi AI service. Please check your connection and try again.');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Manual "read aloud" on a past message bubble. This is a lightweight, local-only
  // action — it does not touch the shared avatarState (that reflects the live
  // pipeline in the voice modal / device panel), it just drives this button's icon.
  const handleSpeak = (msgId, text) => {
    if (speakingMsgId === msgId) {
      voiceService.stopSpeaking();
      setSpeakingMsgId(null);
    } else {
      setSpeakingMsgId(msgId);
      voiceService.speak(text, currentLang, {
        onEnd: () => setSpeakingMsgId((cur) => (cur === msgId ? null : cur)),
        onError: () => setSpeakingMsgId((cur) => (cur === msgId ? null : cur)),
      });
    }
  };

  const rolePrompts = {
    student: [
      "What is my attendance?",
      "Show my latest Mathematics test marks",
      "Who is my assigned class teacher?",
      "Mark Rahul absent (Test Unauthorized Security Action)"
    ],
    parent: [
      "How much attendance does my child have?",
      "How is my child performing in Math and Science?",
      "I want to request a call with the teacher",
      "Show me school-wide attendance (Test Unauthorized Action)"
    ],
    teacher: [
      "Mark Rahul absent today",
      "Show attendance summary for Class 10-A",
      "Who was absent yesterday in Class 10-A?",
      "Summarize Unit Test 1 marks for Class 10-A"
    ],
    principal: [
      "What is the overall school attendance today?",
      "Show grade-wise attendance breakdown",
      "Are there any pending parent escalation requests?",
      "Show academic distinction rate across all classes"
    ]
  };

  const currentPrompts = rolePrompts[currentRole] || rolePrompts.student;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* LEFT COLUMN: Main Chat Window (8 Cols) */}
      <div className="lg:col-span-8 bg-white rounded-3xl border border-brand-100 shadow-brand-sm flex flex-col h-[720px] overflow-hidden">
        
        {/* Chat Window Header */}
        <div className="p-4 px-6 border-b border-brand-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-700 text-white flex items-center justify-center shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm text-brand-950">
                  EduSaathi AI Workspace
                </h3>
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-brand-100 text-brand-800 border border-brand-200">
                  {currentRole}
                </span>
              </div>
              <p className="text-xs text-content-muted">
                Zero-Trust Deterministic Tool Calling Engine
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Auth Enforcing
            </span>
          </div>
        </div>

        {/* Message Stream */}
        <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-brand-50/20">
          {messages.map((msg) => {
            const isUser = msg.sender === 'user';
            return (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar Icon */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 font-bold text-xs shadow-sm ${
                  isUser ? 'bg-brand-900 text-white' : 'bg-brand-700 text-white'
                }`}>
                  {isUser ? (currentUser?.full_name?.[0] || 'U') : <Bot className="w-4 h-4" />}
                </div>

                {/* Message Content Bubble */}
                <div className={`max-w-xl rounded-2xl p-4 text-xs space-y-1.5 ${
                  isUser 
                    ? 'bg-brand-700 text-white rounded-tr-none shadow-brand-sm' 
                    : 'bg-white border border-brand-100 text-brand-950 rounded-tl-none shadow-brand-sm'
                }`}>
                  {!isUser && (
                    <div className="flex items-center justify-between gap-2 border-b border-brand-100/60 pb-1 text-[10px] text-brand-600 font-bold">
                      <span>{msg.persona || 'EduSaathi Assistant'}</span>
                      {msg.tool_executed && (
                        <span className="bg-brand-100 text-brand-800 px-2 py-0.5 rounded-full text-[9px] flex items-center gap-1 font-mono">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          tool: {msg.tool_executed}
                        </span>
                      )}
                    </div>
                  )}

                  <p className="leading-relaxed whitespace-pre-line text-xs font-normal">
                    {msg.content}
                  </p>

                  <div className="flex items-center justify-between pt-1 text-[10px] opacity-70">
                    <span>{msg.timestamp}</span>
                    {!isUser && (
                      <button
                        onClick={() => handleSpeak(msg.id, msg.content)}
                        title="Read aloud"
                        className="hover:opacity-100 transition-opacity p-1"
                      >
                        {speakingMsgId === msg.id ? (
                          <VolumeX className="w-3.5 h-3.5 text-rose-500" />
                        ) : (
                          <Volume2 className="w-3.5 h-3.5 text-brand-600" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center shrink-0">
                <Bot className="w-4 h-4 animate-spin" />
              </div>
              <div className="bg-white border border-brand-100 p-3.5 rounded-2xl rounded-tl-none shadow-brand-sm text-xs text-brand-600 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.2s]" />
                <span className="w-2 h-2 rounded-full bg-brand-500 animate-bounce [animation-delay:0.4s]" />
                <span className="font-semibold text-brand-800">Orchestrating response & validating role...</span>
              </div>
            </div>
          )}

          {/* Error Message */}
          {backendError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{backendError}</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Inquiries */}
        <div className="p-3 bg-white border-t border-brand-100 flex items-center gap-2 overflow-x-auto">
          <span className="text-[11px] font-bold text-brand-600 shrink-0 flex items-center gap-1 pl-2">
            <Sparkles className="w-3 h-3 text-brand-500" />
            Suggested:
          </span>
          <div className="flex gap-2 shrink-0">
            {currentPrompts.map((p, idx) => (
              <button
                key={idx}
                onClick={() => handleSendMessage(p)}
                disabled={loading}
                className="text-[11px] font-medium bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-200/80 px-3 py-1 rounded-xl transition-all whitespace-nowrap"
              >
                "{p}"
              </button>
            ))}
          </div>
        </div>

        {/* Input Bar */}
        <div className="p-4 bg-brand-50/50 border-t border-brand-100">
          <div className="flex items-center gap-3 bg-white p-2 rounded-2xl border border-brand-200 shadow-sm focus-within:border-brand-600 focus-within:ring-2 focus-within:ring-brand-100 transition-all">
            <button
              type="button"
              onClick={onOpenVoiceModal}
              title="Launch Voice Mode"
              className="p-2 rounded-xl text-brand-600 hover:bg-brand-50 transition-colors"
            >
              <Mic className="w-4 h-4" />
            </button>
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder={t('typeMessage', currentLang)}
              className="flex-1 text-xs text-brand-950 bg-transparent focus:outline-none placeholder:text-brand-300 font-medium"
            />
            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={!inputText.trim() || loading}
              className="px-5 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm"
            >
              <span>{t('send', currentLang)}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: AI Companion Device Frame (4 Cols) */}
      <div className="lg:col-span-4 bg-gradient-to-b from-brand-950 via-brand-900 to-brand-950 text-white rounded-[32px] p-6 shadow-2xl border-4 border-brand-800/60 flex flex-col justify-between h-[720px] relative overflow-hidden">
        
        {/* Device Top Speaker / Notch */}
        <div className="flex justify-center mb-2">
          <div className="w-24 h-4 bg-brand-900 rounded-full border border-brand-700/60 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
            <span className="w-8 h-1 bg-brand-700 rounded-full" />
          </div>
        </div>

        {/* Companion Header */}
        <div className="text-center space-y-1">
          <div className="inline-flex items-center gap-1 px-3 py-0.5 rounded-full text-[10px] font-bold bg-white/10 text-brand-200 border border-white/10 uppercase tracking-widest">
            {t('phoneDeviceTitle', currentLang)}
          </div>
          <h4 className="text-base font-extrabold text-white">
            EduSaathi Voice Companion
          </h4>
          <p className="text-xs text-brand-200/80">
            Persona: <b className="text-white capitalize">{currentRole}</b>
          </p>
        </div>

        {/* Animated Robot Avatar in Device Frame */}
        <div className="my-auto flex flex-col items-center justify-center space-y-4">
          <AIAvatar state={avatarState} size="lg" personaRole={currentRole} />
          
          <div className="text-center space-y-1">
            <div className="text-xs font-bold text-brand-200 flex items-center justify-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${
                avatarState === 'listening' ? 'bg-cyan-400 animate-ping' : avatarState === 'speaking' ? 'bg-brand-300 animate-pulse' : 'bg-emerald-400'
              }`} />
              <span className="uppercase tracking-wider text-[11px]">
                Status: {avatarState}
              </span>
            </div>
            <p className="text-[11px] text-brand-300/80">
              Interactive Multilingual Voice Assistant
            </p>
          </div>
        </div>

        {/* Voice Trigger Button & Device Details */}
        <div className="space-y-3 pt-4 border-t border-brand-800">
          <button
            onClick={onOpenVoiceModal}
            className="w-full py-3 rounded-2xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-brand-600/30 transition-all hover:scale-[1.02]"
          >
            <Mic className="w-4 h-4" />
            <span>"Talk to EduSaathi"</span>
          </button>

          <div className="space-y-1.5 text-[11px] text-brand-300/80 bg-brand-900/60 p-3 rounded-2xl border border-brand-800/80">
            <div className="flex items-center justify-between">
              <span>Language:</span>
              <b className="text-white uppercase">{currentLang}</b>
            </div>
            <div className="flex items-center justify-between">
              <span>User Identity:</span>
              <b className="text-white truncate max-w-[130px]">{currentUser?.full_name || 'Demo User'}</b>
            </div>
            <div className="flex items-center justify-between">
              <span>Security Barrier:</span>
              <b className="text-emerald-400 font-bold">100% Enforced</b>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

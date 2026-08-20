import React, { useState, useEffect } from 'react';
import Navbar from './components/layout/Navbar';
import Sidebar from './components/layout/Sidebar';
import Overview from './components/dashboard/Overview';
import ChatWorkspace from './components/chat/ChatWorkspace';
import AttendanceView from './components/attendance/AttendanceView';
import AcademicsView from './components/academics/AcademicsView';
import SupportView from './components/support/SupportView';
import SecurityView from './components/security/SecurityView';
import VoiceModal from './components/voice/VoiceModal';
import LoginModal from './components/auth/LoginModal';
import { apiService } from './services/api';
import { voiceService } from './services/voice';
import { Settings as SettingsIcon, ShieldCheck, Database, RefreshCw, LogOut } from 'lucide-react';
import { t } from './utils/i18n';

function makeWelcomeMessage(user) {
  return {
    id: 'welcome',
    sender: 'assistant',
    content: `Namaste ${user?.full_name || ''}! I am your EduSaathi Assistant. How can I assist you with your school records or queries today?`,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    tool_executed: null,
  };
}

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => apiService.getStoredUser());
  const [currentRole, setCurrentRole] = useState(() => apiService.getStoredUser()?.role || 'student');
  const [currentLang, setCurrentLang] = useState('en');
  const [activeTab, setActiveTab] = useState('overview');
  const [backendHealth, setBackendHealth] = useState(null);
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState('');

  // ── Unified AI Assistant State ──────────────────────────────────────────
  // Shared between the text ChatWorkspace and the voice/avatar modal so both
  // surfaces are the SAME conversation (same backend session_id, same history),
  // not two disconnected experiences.
  const [conversationId, setConversationId] = useState(() => `sess_${Date.now()}`);
  const [chatMessages, setChatMessages] = useState(() => [makeWelcomeMessage(currentUser)]);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [avatarState, setAvatarState] = useState('idle');

  // Fetch backend status on mount
  const checkBackend = async () => {
    const data = await apiService.getHealth();
    setBackendHealth(data);
  };

  useEffect(() => {
    checkBackend();
    const interval = setInterval(checkBackend, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setCurrentRole(user.role);
    setActiveTab('overview');
    setChatMessages([makeWelcomeMessage(user)]);
    setConversationId(`sess_${Date.now()}`);
  };

  const handleLogout = () => {
    apiService.logout();
    setCurrentUser(null);
    voiceService.stopSpeaking();
    voiceService.stopListening();
  };

  const handleOpenChatWithPrompt = (prompt = '') => {
    setSelectedPrompt(prompt);
    setActiveTab('assistant');
  };

  // (Voice transcripts are now sent directly through sendToAssistant — see below —
  // rather than being dropped into the text input, so a spoken question gets a
  // spoken answer without the user needing to switch tabs or press Send.)

  /**
   * Single entry point for sending a message to Saathi, used by BOTH the
   * text chat input and the voice modal. Optionally speaks the reply aloud
   * (TTS) and drives the shared avatar state — this is what makes the voice
   * pipeline real: Speech-to-Text -> this function -> Mock API (via backend
   * tool calling) -> AI Response -> Text-to-Speech -> Avatar, in one flow.
   */
  const sendToAssistant = async (text, { speak = false } = {}) => {
    const trimmed = (text || '').trim();
    if (!trimmed || assistantLoading) return null;

    const userMsg = {
      id: `usr_${Date.now()}`,
      sender: 'user',
      content: trimmed,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setChatMessages((prev) => [...prev, userMsg]);
    setAssistantLoading(true);
    setAvatarState('thinking');

    try {
      const res = await apiService.sendChatMessage({
        message: trimmed,
        role: currentRole,
        language: currentLang,
        conversationId,
      });

      const assistantMsg = {
        id: `ast_${Date.now()}`,
        sender: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        tool_executed: res.tool_executed,
        persona: res.persona,
        engine: res.engine,
      };
      setChatMessages((prev) => [...prev, assistantMsg]);
      if (res.conversation_id) setConversationId(res.conversation_id);

      setAvatarState('speaking');
      if (speak) {
        voiceService.speak(res.response, currentLang, {
          onEnd: () => setAvatarState('idle'),
          onError: () => setAvatarState('idle'),
        });
      } else {
        setTimeout(() => setAvatarState('idle'), 2000);
      }
      return assistantMsg;
    } catch (err) {
      console.error('Assistant error:', err);
      const errorMsg = {
        id: `err_${Date.now()}`,
        sender: 'assistant',
        content: `I ran into a problem reaching the EduSaathi service: ${err.message || 'unknown error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isError: true,
      };
      setChatMessages((prev) => [...prev, errorMsg]);
      setAvatarState('error');
      setTimeout(() => setAvatarState('idle'), 3000);
      return null;
    } finally {
      setAssistantLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8FF] text-content-primary flex flex-col font-sans text-xs">
      
      {/* Login Screen if not authenticated */}
      {!currentUser && (
        <LoginModal 
          onLoginSuccess={handleLoginSuccess} 
          currentLang={currentLang} 
        />
      )}

      {/* Voice Assistant Modal — shares the same conversation/avatar state as the text chat */}
      <VoiceModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onSendToAssistant={(text) => sendToAssistant(text, { speak: true })}
        currentRole={currentRole}
        currentLang={currentLang}
        currentUser={currentUser}
        assistantLoading={assistantLoading}
        avatarState={avatarState}
        messages={chatMessages}
      />

      {/* Top Navigation Bar */}
      <Navbar
        currentUser={currentUser}
        currentRole={currentRole}
        currentLang={currentLang}
        onLangChange={setCurrentLang}
        backendHealth={backendHealth}
        onRefreshHealth={checkBackend}
        onLogout={handleLogout}
        onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
      />

      {/* Main App Layout */}
      <div className="flex flex-1">
        {/* Left Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          currentRole={currentRole}
          currentUser={currentUser}
          currentLang={currentLang}
        />

        {/* Dynamic Content Main Body */}
        <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
          {activeTab === 'overview' && (
            <Overview
              currentRole={currentRole}
              currentUser={currentUser}
              onOpenChat={handleOpenChatWithPrompt}
              backendHealth={backendHealth}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'assistant' && (
            <ChatWorkspace
              currentUser={currentUser}
              currentRole={currentRole}
              currentLang={currentLang}
              onOpenVoiceModal={() => setIsVoiceModalOpen(true)}
              initialPrompt={selectedPrompt}
              messages={chatMessages}
              loading={assistantLoading}
              avatarState={avatarState}
              onSend={(text) => sendToAssistant(text, { speak: false })}
            />
          )}

          {activeTab === 'attendance' && (
            <AttendanceView
              currentUser={currentUser}
              currentRole={currentRole}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'academics' && (
            <AcademicsView
              currentUser={currentUser}
              currentRole={currentRole}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'support' && (
            <SupportView
              currentUser={currentUser}
              currentRole={currentRole}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'security' && (
            <SecurityView
              currentUser={currentUser}
              currentRole={currentRole}
              currentLang={currentLang}
            />
          )}

          {activeTab === 'settings' && (
            <div className="bg-white p-8 rounded-3xl border border-brand-100 shadow-brand-sm space-y-6">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-2xl bg-gray-100 text-gray-700 flex items-center justify-center font-bold">
                  <SettingsIcon className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-extrabold text-brand-950">
                    {t('settings', currentLang)}
                  </h2>
                  <p className="text-xs text-content-muted">
                    System Parameters, Environment Metadata, and Database Status
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-2">
                  <h4 className="font-bold text-brand-900">Application Identity</h4>
                  <div><b>Product:</b> EduSaathi</div>
                  <div><b>Tagline:</b> The Operating System Your School Needs</div>
                  <div><b>Competition:</b> Bharat Academix AI & ML Track 2026</div>
                  <div><b>Version:</b> {backendHealth?.version || '1.0.0'}</div>
                </div>

                <div className="p-4 bg-brand-50/50 rounded-2xl border border-brand-100 space-y-2">
                  <h4 className="font-bold text-brand-900">Backend & Database</h4>
                  <div><b>Backend Host:</b> 127.0.0.1:8000</div>
                  <div><b>Database:</b> SQLite (edusaathi.db)</div>
                  <div><b>ORM Layer:</b> SQLAlchemy 2.0</div>
                  <div><b>Security Mode:</b> Zero-Trust Deterministic Barrier</div>
                </div>
              </div>

              <div className="pt-4 border-t border-brand-100 flex items-center justify-between">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 font-bold text-xs flex items-center gap-1.5 transition-all"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{t('logout', currentLang)}</span>
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

    </div>
  );
}

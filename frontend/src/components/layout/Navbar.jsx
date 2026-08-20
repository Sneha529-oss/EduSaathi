import React from 'react';
import { 
  Sparkles, 
  Globe, 
  UserCheck, 
  Activity, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  LogOut,
  User as UserIcon,
  Bot
} from 'lucide-react';
import { SUPPORTED_LANGUAGES, t } from '../../utils/i18n';

export default function Navbar({ 
  currentUser,
  currentRole, 
  currentLang, 
  onLangChange, 
  backendHealth, 
  onRefreshHealth,
  onLogout,
  onOpenVoiceModal 
}) {
  const isHealthy = backendHealth?.status === 'healthy';

  const roleBadges = {
    student: 'Student',
    parent: 'Parent',
    teacher: 'Teacher',
    principal: 'Principal',
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-brand-100 px-6 py-3 transition-all">
      <div className="flex items-center justify-between gap-4">
        
        {/* Brand Logo & Tagline */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-600 flex items-center justify-center shadow-brand-md shadow-brand-500/20 text-white font-black text-xl tracking-wider">
            ES
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-xl text-brand-900 tracking-tight">
                {t('appName', currentLang)}
              </h1>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-brand-100 text-brand-700 border border-brand-200">
                AI OS
              </span>
            </div>
            <p className="text-xs text-brand-600/80 font-medium">
              {t('tagline', currentLang)}
            </p>
          </div>
        </div>

        {/* Action Controls: User Profile, Language, Voice, Health & Logout */}
        <div className="flex items-center gap-3 flex-wrap">
          
          {/* Active User Badge */}
          {currentUser && (
            <div className="hidden sm:flex items-center gap-2 bg-brand-50/80 px-3 py-1.5 rounded-xl border border-brand-200/80 text-xs">
              <div className="w-6 h-6 rounded-lg bg-brand-700 text-white flex items-center justify-center font-bold text-[10px]">
                {currentUser.full_name?.[0] || 'U'}
              </div>
              <div className="leading-tight">
                <span className="font-bold text-brand-900 block truncate max-w-[120px]">
                  {currentUser.full_name}
                </span>
                <span className="text-[10px] text-brand-600 capitalize font-medium">
                  {t(currentRole, currentLang)}
                </span>
              </div>
            </div>
          )}

          {/* Voice Assistant Shortcut Button */}
          <button
            onClick={onOpenVoiceModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 hover:bg-brand-100 text-brand-800 border border-brand-200 text-xs font-bold transition-all"
            title="Open Voice Assistant"
          >
            <Bot className="w-3.5 h-3.5 text-brand-600" />
            <span className="hidden md:inline">{t('voiceAssistant', currentLang)}</span>
          </button>

          {/* Language Selector */}
          <div className="flex items-center bg-brand-50/80 px-2.5 py-1.5 rounded-xl border border-brand-200/80 gap-1.5 text-xs text-brand-900">
            <Globe className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            <select
              value={currentLang}
              onChange={(e) => onLangChange(e.target.value)}
              className="bg-transparent text-xs font-medium text-brand-900 focus:outline-none cursor-pointer pr-1"
            >
              {SUPPORTED_LANGUAGES.map((lang) => (
                <option key={lang.code} value={lang.code} className="text-gray-900">
                  {lang.label} ({lang.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Backend Connection Health Badge */}
          <button
            onClick={onRefreshHealth}
            title="Click to re-check backend status"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
              isHealthy
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
            }`}
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isHealthy ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isHealthy ? 'bg-emerald-500' : 'bg-rose-500'
                }`}
              />
            </span>
            <span className="hidden sm:inline">{isHealthy ? 'API Online' : 'API Offline'}</span>
            <RefreshCw className="w-3 h-3 text-current opacity-70 hover:rotate-180 transition-transform" />
          </button>

          {/* Logout Button */}
          {currentUser && (
            <button
              onClick={onLogout}
              title="Log out of EduSaathi"
              className="p-2 rounded-xl text-brand-600 hover:bg-rose-50 hover:text-rose-600 border border-transparent hover:border-rose-200 transition-all"
            >
              <LogOut className="w-4 h-4" />
            </button>
          )}

        </div>
      </div>
    </header>
  );
}

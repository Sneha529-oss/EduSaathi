import React from 'react';
import { 
  LayoutDashboard, 
  MessageSquare, 
  UserCheck, 
  GraduationCap, 
  Users, 
  Headphones, 
  ShieldAlert, 
  Settings, 
  Sparkles,
  Bot
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function Sidebar({ activeTab, onSelectTab, currentRole, currentUser, currentLang = 'en' }) {
  const roleDescriptions = {
    student: {
      title: 'EduSaathi Academic Assistant',
      persona: 'Friendly & Encouraging',
      avatarBg: 'bg-emerald-500',
      user: currentUser?.full_name || 'Rahul Sharma (STU001)'
    },
    parent: {
      title: 'EduSaathi Parent Support',
      persona: 'Caring & Reassuring',
      avatarBg: 'bg-blue-500',
      user: currentUser?.full_name || 'Sanjay Sharma (Parent)'
    },
    teacher: {
      title: 'EduSaathi Teaching Assistant',
      persona: 'Efficient & Organized',
      avatarBg: 'bg-purple-500',
      user: currentUser?.full_name || 'Ms. Anjali Sharma (T001)'
    },
    principal: {
      title: 'EduSaathi Management Assistant',
      persona: 'Executive & Strategic',
      avatarBg: 'bg-amber-500',
      user: currentUser?.full_name || 'Dr. Vikram Rao (PRIN001)'
    },
  };

  const currentPersona = roleDescriptions[currentRole] || roleDescriptions.student;

  const navItems = [
    { id: 'overview', labelKey: 'dashboard', icon: LayoutDashboard },
    { id: 'assistant', labelKey: 'assistant', icon: MessageSquare, badge: 'Active' },
    { id: 'attendance', labelKey: 'attendance', icon: UserCheck },
    { id: 'academics', labelKey: 'academics', icon: GraduationCap },
    { id: 'support', labelKey: 'support', icon: Headphones },
    { id: 'security', labelKey: 'security', icon: ShieldAlert },
    { id: 'settings', labelKey: 'settings', icon: Settings },
  ];

  return (
    <aside className="w-72 bg-white border-r border-brand-100 flex flex-col justify-between h-[calc(100vh-65px)] sticky top-[65px] transition-all">
      <div className="p-4 space-y-6">
        
        {/* Active Persona & User Card */}
        <div className="bg-gradient-to-br from-brand-50 to-brand-100/60 p-3.5 rounded-2xl border border-brand-200/80 shadow-brand-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-700 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand-600 bg-white/80 px-1.5 py-0.5 rounded border border-brand-200 inline-block">
                Active Persona
              </span>
              <h3 className="text-xs font-bold text-brand-900 truncate mt-0.5">
                {currentPersona.title}
              </h3>
              <p className="text-[11px] text-brand-700/80 truncate font-semibold">
                {currentPersona.user}
              </p>
            </div>
          </div>
          <div className="mt-2.5 pt-2 border-t border-brand-200/50 flex items-center justify-between text-[11px] text-brand-700 font-medium">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-brand-600" />
              {currentPersona.persona}
            </span>
            <span className="capitalize font-bold text-brand-900 bg-brand-200/60 px-2 py-0.5 rounded-full text-[10px]">
              {t(currentRole, currentLang)}
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          <p className="px-3 text-[11px] font-bold text-brand-400 uppercase tracking-wider mb-2">
            School OS Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  active
                    ? 'bg-brand-700 text-white shadow-brand-sm shadow-brand-700/20'
                    : 'text-content-secondary hover:bg-brand-50 hover:text-brand-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-brand-600'}`} />
                  <span>{t(item.labelKey, currentLang)}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                      active ? 'bg-white/20 text-white' : 'bg-brand-100 text-brand-700'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>

      {/* Footer info & Competition Badge */}
      <div className="p-4 border-t border-brand-100 bg-brand-50/40">
        <div className="flex items-center justify-between text-[11px] text-brand-600">
          <span className="font-semibold">Bharat Academix 2026</span>
          <span className="bg-brand-200/80 text-brand-800 font-bold px-1.5 py-0.5 rounded text-[10px]">
            AI & ML Track
          </span>
        </div>
        <p className="text-[10px] text-brand-500 mt-1">
          EduSaathi School Operating System
        </p>
      </div>
    </aside>
  );
}

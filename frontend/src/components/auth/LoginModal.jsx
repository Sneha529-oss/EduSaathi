import React, { useState } from 'react';
import { apiService } from '../../services/api';
import { Bot, Sparkles, UserCheck, ShieldCheck, Lock, Mail, User, AlertCircle, ArrowRight } from 'lucide-react';
import { t } from '../../utils/i18n';

export default function LoginModal({ onLoginSuccess, currentLang = 'en' }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState('student');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const demoAccounts = [
    { label: 'Student', email: 'student@edusaathi.demo', pass: 'student123', role: 'student', desc: 'Rahul Sharma (Class 10-A)', icon: '🎓' },
    { label: 'Parent', email: 'parent@edusaathi.demo', pass: 'parent123', role: 'parent', desc: 'Sanjay Sharma (Parent of Rahul)', icon: '👨‍👩‍👧' },
    { label: 'Teacher', email: 'teacher@edusaathi.demo', pass: 'teacher123', role: 'teacher', desc: 'Ms. Anjali Sharma (Math Faculty)', icon: '👩‍🏫' },
    { label: 'Principal', email: 'principal@edusaathi.demo', pass: 'principal123', role: 'principal', desc: 'Dr. Vikram Rao (School Head)', icon: '🏫' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isRegister) {
        const res = await apiService.register({
          email,
          password,
          full_name: fullName,
          role,
        });
        onLoginSuccess(res.user);
      } else {
        const res = await apiService.login(email, password);
        onLoginSuccess(res.user);
      }
    } catch (err) {
      setError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (acc) => {
    setError('');
    setLoading(true);
    try {
      const res = await apiService.login(acc.email, acc.pass);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || 'Demo login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gradient-to-br from-brand-950/70 via-brand-900/60 to-brand-950/80 backdrop-blur-md">
      <div className="bg-white rounded-3xl border border-brand-100 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col p-8 space-y-6">
        
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-800 to-brand-600 flex items-center justify-center mx-auto shadow-brand-md shadow-brand-500/25 text-white font-black text-2xl tracking-wider">
            ES
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-brand-900 tracking-tight">
              {t('appName', currentLang)}
            </h2>
            <p className="text-xs text-brand-600 font-medium mt-0.5">
              {t('tagline', currentLang)}
            </p>
          </div>
        </div>

        {/* 1-Click Quick Demo Login Row */}
        <div className="bg-brand-50/80 p-3.5 rounded-2xl border border-brand-200/80 space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-brand-800">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-brand-600" />
              {t('demoUsers', currentLang)}
            </span>
            <span className="text-[10px] text-brand-500 font-medium">1-Click Evaluation Access</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {demoAccounts.map((acc) => (
              <button
                key={acc.role}
                type="button"
                onClick={() => handleQuickDemoLogin(acc)}
                disabled={loading}
                className="bg-white hover:bg-brand-100/80 border border-brand-200 p-2 rounded-xl text-left transition-all hover:scale-[1.02] flex flex-col justify-between"
              >
                <div className="text-base mb-1">{acc.icon}</div>
                <div className="text-xs font-bold text-brand-900">{acc.label}</div>
                <div className="text-[10px] text-brand-600/80 truncate">{acc.desc.split(' ')[0]}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Tab Switcher (Login / Register) */}
        <div className="flex border-b border-brand-100 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setIsRegister(false); setError(''); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              !isRegister ? 'border-brand-700 text-brand-900' : 'border-transparent text-content-muted hover:text-brand-700'
            }`}
          >
            {t('login', currentLang)}
          </button>
          <button
            type="button"
            onClick={() => { setIsRegister(true); setError(''); }}
            className={`flex-1 py-2.5 text-center border-b-2 transition-all ${
              isRegister ? 'border-brand-700 text-brand-900' : 'border-transparent text-content-muted hover:text-brand-700'
            }`}
          >
            {t('register', currentLang)}
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {isRegister && (
            <>
              <div>
                <label className="block font-bold text-brand-900 mb-1">Full Name</label>
                <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl focus-within:border-brand-600 focus-within:bg-white transition-all">
                  <User className="w-4 h-4 text-brand-500" />
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full bg-transparent focus:outline-none text-brand-950 font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-brand-900 mb-1">{t('role', currentLang)}</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full px-3 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl focus:border-brand-600 focus:bg-white text-brand-950 font-medium"
                >
                  <option value="student">{t('student', currentLang)}</option>
                  <option value="parent">{t('parent', currentLang)}</option>
                  <option value="teacher">{t('teacher', currentLang)}</option>
                  <option value="principal">{t('principal', currentLang)}</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block font-bold text-brand-900 mb-1">Email Address</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl focus-within:border-brand-600 focus-within:bg-white transition-all">
              <Mail className="w-4 h-4 text-brand-500" />
              <input
                type="email"
                required
                placeholder="e.g. user@edusaathi.demo"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-brand-950 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block font-bold text-brand-900 mb-1">Password</label>
            <div className="flex items-center gap-2 px-3 py-2.5 bg-brand-50/50 border border-brand-200 rounded-xl focus-within:border-brand-600 focus-within:bg-white transition-all">
              <Lock className="w-4 h-4 text-brand-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent focus:outline-none text-brand-950 font-medium"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-brand-700 hover:bg-brand-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-brand-md shadow-brand-700/20 transition-all hover:scale-[1.01]"
          >
            <span>{loading ? t('loading', currentLang) : (isRegister ? t('register', currentLang) : t('login', currentLang))}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-2 text-center">
          <p className="text-[11px] text-content-muted">
            EduSaathi enforces real backend role verification on every API transaction.
          </p>
        </div>

      </div>
    </div>
  );
}

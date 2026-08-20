import React from 'react';
import { 
  Users, 
  UserCheck, 
  GraduationCap, 
  Calendar, 
  ArrowUpRight, 
  ShieldCheck, 
  Sparkles, 
  AlertTriangle,
  Clock,
  TrendingUp,
  MessageSquareText,
  Layers,
  ChevronRight,
  Bot
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function Overview({ currentRole, currentUser, onOpenChat, backendHealth, currentLang = 'en' }) {
  // Role-specific metrics
  const roleMetrics = {
    student: {
      headline: `Welcome back, ${currentUser?.full_name || 'Rahul'}!`,
      subheadline: "Grade 10 - Section A • Roll No. 10A01 • Academic Year 2025-26",
      cards: [
        { title: "Current Attendance", value: "93.3%", status: "Good Standing", change: "14 of 15 Days Present", color: "from-brand-700 to-brand-900" },
        { title: "Overall GPA / Grade", value: "A (86.3%)", status: "Top 10%", change: "Math: 92% | Sci: 88%", color: "from-indigo-600 to-purple-800" },
        { title: "Upcoming Tests", value: "Math Unit 2", status: "In 2 days", change: "Topic: Quadratic Equations", color: "from-violet-600 to-brand-800" },
        { title: "AI Academic Saathi", value: "Ready", status: "24/7 Active", change: "Ask homework or doubts", color: "from-purple-700 to-brand-950" },
      ],
      quickPrompts: [
        "What is my attendance?",
        "Can you show my latest Math exam score?",
        "Help me understand Quadratic Equations for tomorrow's test",
        "Mark Rahul absent (Test Unauthorized Security Action)"
      ]
    },
    parent: {
      headline: `Parent Portal — ${currentUser?.full_name || 'Sanjay Sharma'}`,
      subheadline: "Linked Child: Rahul Sharma (Grade 10-A, STU001)",
      cards: [
        { title: "Child's Attendance", value: "93.3%", status: "Regular", change: "14 of 15 Days Present", color: "from-brand-700 to-brand-900" },
        { title: "Academic Performance", value: "Distinction", status: "Consistent", change: "Next PTM: Friday 4:00 PM", color: "from-indigo-600 to-purple-800" },
        { title: "Teacher Contact", value: "Ms. Sharma", status: "Available", change: "Math & Class Teacher", color: "from-violet-600 to-brand-800" },
        { title: "Support Escalations", value: "1 Active", status: "Callback pending", change: "Direct line to leadership", color: "from-purple-700 to-brand-950" },
      ],
      quickPrompts: [
        "How much attendance does my child have?",
        "How is Rahul performing in Mathematics?",
        "I want to request a call with Rahul's teacher.",
        "Show me school-wide attendance (Test Unauthorized Action)"
      ]
    },
    teacher: {
      headline: `Teacher Dashboard — ${currentUser?.full_name || 'Ms. Anjali Sharma'}`,
      subheadline: "Department of Mathematics • Class 10-A Mentor",
      cards: [
        { title: "Class 10-A Attendance", value: "94.8%", status: "36 / 38 Present", change: "2 Students Absent Today", color: "from-brand-700 to-brand-900" },
        { title: "Students Supervised", value: "38", status: "Active Roster", change: "Grade 10 - Section A", color: "from-indigo-600 to-purple-800" },
        { title: "Pending Grading", value: "14 Papers", status: "Unit Test 2", change: "Submission deadline: Tomorrow", color: "from-violet-600 to-brand-800" },
        { title: "Action Authorization", value: "Verified", status: "Grade 10 Write Access", change: "Attendance & Grade marking enabled", color: "from-purple-700 to-brand-950" },
      ],
      quickPrompts: [
        "Mark Rahul absent today.",
        "Show me attendance summary for Class 10-A.",
        "Who was absent yesterday?",
        "Summarize Unit Test 1 marks for Class 10-A."
      ]
    },
    principal: {
      headline: `Executive Overview — ${currentUser?.full_name || 'Dr. Vikram Rao'}`,
      subheadline: "Principal & Head of Institution • EduSaathi School OS",
      cards: [
        { title: "School-Wide Attendance", value: "92.6%", status: "Above Target (90%)", change: "1,240 / 1,338 Students", color: "from-brand-700 to-brand-900" },
        { title: "Total Faculty & Staff", value: "78 Active", status: "98% Present", change: "All departments operational", color: "from-indigo-600 to-purple-800" },
        { title: "Support Escalations", value: "2 Pending", status: "Requires Review", change: "1 Parent, 1 Teacher request", color: "from-violet-600 to-brand-800" },
        { title: "System Security & Auth", value: "100% Deterministic", status: "Zero-Trust Active", change: "Role barrier enforcing access", color: "from-purple-700 to-brand-950" },
      ],
      quickPrompts: [
        "What is the overall school attendance today?",
        "Show me grade-wise attendance breakdown.",
        "Are there any pending parent escalation requests?",
        "Provide a summary of faculty attendance this week."
      ]
    }
  };

  const current = roleMetrics[currentRole] || roleMetrics.student;
  const isHealthy = backendHealth?.status === 'healthy';

  return (
    <div className="space-y-6">
      
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-950 via-brand-900 to-brand-800 text-white p-8 shadow-brand-lg">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-brand-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 backdrop-blur-md border border-white/20 text-brand-100">
                <Sparkles className="w-3.5 h-3.5 text-brand-300" />
                {t('appName', currentLang)} OS
              </span>
              <span className="text-xs text-brand-200">
                • {isHealthy ? `Backend Online (v${backendHealth?.version || '1.0.0'})` : 'Connecting Backend...'}
              </span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {current.headline}
            </h2>
            <p className="text-sm text-brand-100/90 font-medium">
              {current.subheadline}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenChat()}
              className="flex items-center gap-2 bg-white text-brand-950 hover:bg-brand-50 px-6 py-3 rounded-2xl font-bold text-xs shadow-md transition-all hover:scale-105 active:scale-95"
            >
              <Bot className="w-4 h-4 text-brand-700" />
              <span>Launch AI Assistant</span>
              <ArrowUpRight className="w-4 h-4 text-brand-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {current.cards.map((card, idx) => (
          <div
            key={idx}
            className="bg-white p-6 rounded-2xl border border-brand-100 shadow-brand-sm brand-card-hover flex flex-col justify-between"
          >
            <div className="space-y-1">
              <span className="text-xs font-bold text-content-muted">
                {card.title}
              </span>
              <div className="text-2xl sm:text-3xl font-extrabold text-brand-950 tracking-tight">
                {card.value}
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-brand-50 flex items-center justify-between text-xs">
              <span className="font-bold text-brand-800 bg-brand-50 px-2.5 py-1 rounded-md">
                {card.status}
              </span>
              <span className="text-content-secondary text-xs font-medium">
                {card.change}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Dual Section: AI Assistant Capabilities & Quick Prompts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Quick Prompts Panel */}
        <div className="lg:col-span-2 bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm space-y-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
              <MessageSquareText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-brand-950">
                {t('quickPrompts', currentLang)} ({t(currentRole, currentLang)})
              </h3>
              <p className="text-xs text-content-muted">
                Click any verified prompt to test deterministic AI orchestration & role boundary checks
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {current.quickPrompts.map((prompt, idx) => (
              <button
                key={idx}
                onClick={() => onOpenChat(prompt)}
                className="text-left p-4 rounded-2xl border border-brand-100/90 bg-brand-50/40 hover:bg-brand-100/60 hover:border-brand-300 transition-all flex items-start justify-between gap-2 group"
              >
                <span className="text-xs font-semibold text-brand-950 group-hover:text-brand-800 leading-relaxed">
                  "{prompt}"
                </span>
                <ChevronRight className="w-4 h-4 text-brand-400 group-hover:text-brand-700 shrink-0 mt-0.5 transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        </div>

        {/* System Architecture & Security Readiness Card */}
        <div className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 text-white p-6 rounded-3xl shadow-brand-md flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-brand-300" />
              <span className="text-xs font-bold uppercase tracking-wider text-brand-200">
                {t('verifiedSecurity', currentLang)}
              </span>
            </div>
            <h4 className="text-base font-bold text-white mb-2">
              Deterministic Role Barrier Active
            </h4>
            <p className="text-xs text-brand-100/80 leading-relaxed">
              Every tool execution and database query is strictly validated in Python. Natural-language prompt overrides and role spoofing are rejected deterministically.
            </p>
          </div>

          <div className="space-y-2.5 pt-3 border-t border-brand-800 text-xs">
            <div className="flex items-center justify-between text-brand-200">
              <span>Backend API Status</span>
              <span className="font-bold text-emerald-400 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                {isHealthy ? 'Online (Healthy)' : 'Connecting...'}
              </span>
            </div>
            <div className="flex items-center justify-between text-brand-200">
              <span>Authorization Gate</span>
              <span className="font-bold text-brand-100">Zero-Trust Enforcing</span>
            </div>
            <div className="flex items-center justify-between text-brand-200">
              <span>Multilingual Engine</span>
              <span className="font-bold text-brand-100">11 Languages Active</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { 
  Headphones, 
  PhoneCall, 
  Building2, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  RefreshCw,
  MessageSquare
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function SupportView({ currentUser, currentRole = 'student', currentLang = 'en' }) {
  const [activeSubTab, setActiveSubTab] = useState('teacher'); // 'teacher' | 'management'
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [requests, setRequests] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      if (currentRole === 'principal') {
        const res = await apiService.getAllSupportRequests();
        setRequests(res.requests || []);
      } else {
        const res = await apiService.getMySupportRequests();
        setRequests(res.requests || []);
      }
    } catch (err) {
      console.error('Support history error:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [currentRole]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim()) return;

    setSubmitting(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      if (activeSubTab === 'teacher') {
        const res = await apiService.requestTeacherCall({
          description: description.trim(),
        });
        setSuccessMsg(res.message);
      } else {
        const res = await apiService.requestManagementSupport({
          description: description.trim(),
        });
        setSuccessMsg(res.message);
      }
      setDescription('');
      await fetchHistory();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to submit escalation request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-violet-100 text-violet-700 flex items-center justify-center font-bold">
            <Headphones className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-brand-950">
              {t('support', currentLang)}
            </h2>
            <p className="text-xs text-content-muted">
              Verified human escalation channels for Faculty callbacks and Leadership support
            </p>
          </div>
        </div>

        <button
          onClick={fetchHistory}
          className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-bold border border-brand-200 transition-all"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loadingHistory ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Escalation Request Form */}
      <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-6">
        <div className="flex border-b border-brand-100 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('teacher')}
            className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all ${
              activeSubTab === 'teacher' 
                ? 'border-brand-700 text-brand-900 font-extrabold' 
                : 'border-transparent text-content-muted hover:text-brand-700'
            }`}
          >
            <PhoneCall className="w-4 h-4" />
            <span>{t('talkToTeacher', currentLang)}</span>
          </button>
          <button
            onClick={() => setActiveSubTab('management')}
            className={`flex items-center gap-2 pb-3 px-4 border-b-2 transition-all ${
              activeSubTab === 'management' 
                ? 'border-brand-700 text-brand-900 font-extrabold' 
                : 'border-transparent text-content-muted hover:text-brand-700'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>{t('contactManagement', currentLang)}</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-brand-900 mb-1.5">
              {activeSubTab === 'teacher' 
                ? 'Reason for Teacher Discussion / Query Details' 
                : 'Management Escalation Summary & Request'
              }
            </label>
            <textarea
              required
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={activeSubTab === 'teacher' 
                ? "e.g., I would like to schedule a 10-minute call with Rahul's Mathematics teacher to discuss his unit test preparation." 
                : "e.g., Requesting administrative review for transportation route update or Olympiad curriculum assistance."
              }
              className="w-full p-4 text-xs font-medium text-brand-950 bg-brand-50/50 border border-brand-200 rounded-2xl focus:outline-none focus:border-brand-600 focus:bg-white transition-all placeholder:text-brand-300"
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <span className="text-[11px] text-content-muted">
              Official ticket will be generated and routed directly to school personnel.
            </span>
            <button
              type="submit"
              disabled={submitting || !description.trim()}
              className="px-6 py-2.5 rounded-xl bg-brand-700 hover:bg-brand-800 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-2 shadow-brand-sm transition-all"
            >
              <span>{submitting ? 'Submitting...' : t('submit', currentLang)}</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>

      {/* Escalation Request Status Log Table */}
      <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-4">
        <h3 className="font-extrabold text-sm text-brand-950">
          {currentRole === 'principal' ? 'All Active School Escalation Inquiries' : 'Your Escalation & Call Requests'}
        </h3>

        {requests.length === 0 ? (
          <p className="text-xs text-content-muted py-4 text-center">
            No active support tickets found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-100 text-content-muted font-bold">
                  <th className="pb-3 px-3">Ticket ID</th>
                  {currentRole === 'principal' && <th className="pb-3 px-3">Requester</th>}
                  <th className="pb-3 px-3">Type</th>
                  <th className="pb-3 px-3">Description</th>
                  <th className="pb-3 px-3">Status</th>
                  <th className="pb-3 px-3">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {requests.map((r) => (
                  <tr key={r.id} className="hover:bg-brand-50/40">
                    <td className="py-3 px-3 font-mono font-bold text-brand-800">{r.request_id}</td>
                    {currentRole === 'principal' && (
                      <td className="py-3 px-3 font-bold text-brand-950">
                        {r.user_name} <span className="text-[10px] text-brand-500 font-normal">({r.role})</span>
                      </td>
                    )}
                    <td className="py-3 px-3 font-semibold text-brand-900">{r.request_type}</td>
                    <td className="py-3 px-3 text-content-secondary max-w-md truncate">{r.description}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        r.status === 'Resolved' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : r.status === 'In Progress'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-content-muted">{r.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

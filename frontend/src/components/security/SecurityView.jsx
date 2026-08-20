import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { 
  ShieldAlert, 
  ShieldCheck, 
  Lock, 
  Key, 
  Check, 
  X, 
  AlertTriangle, 
  Play, 
  RefreshCw,
  Terminal
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function SecurityView({ currentUser, currentRole = 'student', currentLang = 'en' }) {
  const [matrixData, setMatrixData] = useState(null);
  const [loadingMatrix, setLoadingMatrix] = useState(true);
  const [testAction, setTestAction] = useState('view_school_analytics');
  const [testResult, setTestResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const fetchMatrix = async () => {
    setLoadingMatrix(true);
    try {
      const res = await apiService.getSecurityMatrix();
      setMatrixData(res);
    } catch (err) {
      console.error('Matrix load error:', err);
    } finally {
      setLoadingMatrix(false);
    }
  };

  useEffect(() => {
    fetchMatrix();
  }, []);

  const handleRunSecurityTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const res = await apiService.testSecurityAction(testAction);
      setTestResult(res);
    } catch (err) {
      setTestResult({
        authorized: false,
        status_code: 403,
        message: err.message || 'Authorization failed.',
      });
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm flex items-center justify-between">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-brand-950">
              {t('security', currentLang)}
            </h2>
            <p className="text-xs text-content-muted">
              Deterministic Application-Level Authorization Matrix & Zero-Trust Barrier
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Backend Enforcing
          </span>
        </div>
      </div>

      {/* Live Security Sandbox Tester */}
      <div className="bg-gradient-to-br from-brand-950 via-brand-900 to-brand-950 text-white rounded-3xl p-6 shadow-brand-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Terminal className="w-5 h-5 text-brand-300" />
            <h3 className="font-extrabold text-sm text-white">
              Live Backend Authorization Security Test
            </h3>
          </div>
          <span className="text-xs text-brand-300 font-semibold">
            Current Authenticated Role: <b className="text-white capitalize">{currentRole}</b>
          </span>
        </div>

        <p className="text-xs text-brand-200/90 leading-relaxed">
          Test real backend validation against your active JWT token. The Python backend evaluates the exact policy without relying on LLM trust.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <select
            value={testAction}
            onChange={(e) => { setTestAction(e.target.value); setTestResult(null); }}
            className="w-full sm:w-auto flex-1 p-3 rounded-2xl bg-brand-900 border border-brand-700 text-white text-xs font-medium focus:outline-none focus:border-brand-400"
          >
            <option value="view_school_analytics">Attempt: View School-Wide Analytics (Principal Only)</option>
            <option value="mark_attendance">Attempt: Mark Student Attendance (Teacher / Principal Only)</option>
            <option value="enter_grades">Attempt: Enter Student Grades (Teacher / Principal Only)</option>
            <option value="view_child_attendance">Attempt: View Child Attendance (Parent / Principal Only)</option>
            <option value="view_own_attendance">Attempt: View Own Attendance (Student Only)</option>
            <option value="request_support">Attempt: Request Management Escalation (All Roles)</option>
          </select>

          <button
            onClick={handleRunSecurityTest}
            disabled={testing}
            className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
          >
            <Play className={`w-3.5 h-3.5 ${testing ? 'animate-spin' : ''}`} />
            <span>{testing ? 'Testing...' : 'Execute Security Probe'}</span>
          </button>
        </div>

        {/* Live Test Response Card */}
        {testResult && (
          <div className={`mt-4 p-4 rounded-2xl border text-xs font-mono transition-all ${
            testResult.authorized
              ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/70 border-rose-500/50 text-rose-300'
          }`}>
            <div className="flex items-center gap-2 font-bold mb-1">
              {testResult.authorized ? (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>AUTHORIZATION PASSED (HTTP {testResult.status_code})</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>SECURITY REJECTION ENFORCED (HTTP {testResult.status_code})</span>
                </>
              )}
            </div>
            <p className="text-[11px] leading-relaxed text-white/90">
              {testResult.message}
            </p>
          </div>
        )}
      </div>

      {/* Permission Matrix Table */}
      <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-4">
        <h3 className="font-extrabold text-sm text-brand-950">
          Role-Based Access Control (RBAC) Permission Matrix
        </h3>
        
        {loadingMatrix ? (
          <div className="py-8 flex justify-center">
            <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-100 text-content-muted font-bold">
                  <th className="pb-3 px-3">Protected Action</th>
                  <th className="pb-3 px-3 text-center">Student</th>
                  <th className="pb-3 px-3 text-center">Parent</th>
                  <th className="pb-3 px-3 text-center">Teacher</th>
                  <th className="pb-3 px-3 text-center">Principal</th>
                  <th className="pb-3 px-3">Security Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {matrixData?.permission_matrix?.map((row, idx) => (
                  <tr key={idx} className="hover:bg-brand-50/40">
                    <td className="py-3 px-3 font-bold text-brand-950">{row.action}</td>
                    
                    <td className="py-3 px-3 text-center">
                      {row.student ? (
                        <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600"><Check className="w-3.5 h-3.5" /></span>
                      ) : (
                        <span className="inline-flex p-1 rounded-md bg-rose-50 text-rose-400"><X className="w-3.5 h-3.5" /></span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.parent ? (
                        <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600"><Check className="w-3.5 h-3.5" /></span>
                      ) : (
                        <span className="inline-flex p-1 rounded-md bg-rose-50 text-rose-400"><X className="w-3.5 h-3.5" /></span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.teacher ? (
                        <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600"><Check className="w-3.5 h-3.5" /></span>
                      ) : (
                        <span className="inline-flex p-1 rounded-md bg-rose-50 text-rose-400"><X className="w-3.5 h-3.5" /></span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-center">
                      {row.principal ? (
                        <span className="inline-flex p-1 rounded-md bg-emerald-50 text-emerald-600"><Check className="w-3.5 h-3.5" /></span>
                      ) : (
                        <span className="inline-flex p-1 rounded-md bg-rose-50 text-rose-400"><X className="w-3.5 h-3.5" /></span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-content-muted text-[11px]">{row.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Security Defenses List */}
      <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-4">
        <h3 className="font-extrabold text-sm text-brand-950">Active Defense Layers & Guardrails</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {matrixData?.active_security_defenses?.map((def, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-brand-50/50 border border-brand-100 space-y-1.5">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-xs text-brand-950">{def.defense}</h4>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {def.status}
                </span>
              </div>
              <p className="text-[11px] text-content-secondary leading-relaxed">
                {def.description}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

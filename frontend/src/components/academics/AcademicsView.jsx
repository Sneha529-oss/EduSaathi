import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { 
  GraduationCap, 
  Award, 
  BookOpen, 
  TrendingUp, 
  PlusCircle, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  Save
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function AcademicsView({ currentUser, currentRole = 'student', currentLang = 'en' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  // Teacher Grade Entry Form State
  const [formStudentId, setFormStudentId] = useState(1);
  const [formSubject, setFormSubject] = useState('Mathematics');
  const [formAssessment, setFormAssessment] = useState('Unit Test 2');
  const [formMarks, setFormMarks] = useState(92);
  const [formMaxMarks, setFormMaxMarks] = useState(100);
  const [formComments, setFormComments] = useState('Strong conceptual clarity');

  const fetchAcademics = async () => {
    setLoading(true);
    setError('');
    setSaveSuccess('');

    try {
      if (currentRole === 'student') {
        const res = await apiService.getMyAcademics();
        setData(res);
      } else if (currentRole === 'parent') {
        const childId = currentUser?.child_student_id || 1;
        const res = await apiService.getStudentAcademics(childId);
        setData(res);
      } else if (currentRole === 'teacher' || currentRole === 'principal') {
        const res = await apiService.getClassAcademics(1);
        setData(res);
      }
    } catch (err) {
      console.error('Academics fetch error:', err);
      setError(err.message || 'Unable to fetch academic records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAcademics();
  }, [currentRole]);

  const handleGradeSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaveSuccess('');

    try {
      const res = await apiService.enterGrade({
        studentId: formStudentId,
        subject: formSubject,
        assessmentName: formAssessment,
        marksObtained: formMarks,
        maxMarks: formMaxMarks,
        comments: formComments,
      });
      setSaveSuccess(res.message);
      await fetchAcademics();
    } catch (err) {
      setError(err.message || 'Failed to submit grade.');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !data) {
    return (
      <div className="bg-white p-12 rounded-3xl border border-brand-100 shadow-brand-sm flex flex-col items-center justify-center space-y-3">
        <RefreshCw className="w-6 h-6 text-brand-600 animate-spin" />
        <span className="text-xs font-bold text-brand-900">{t('loading', currentLang)}</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
            <GraduationCap className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-brand-950">
              {t('academics', currentLang)}
            </h2>
            <p className="text-xs text-content-muted">
              Role: <b className="text-brand-800 capitalize">{currentRole}</b> • Term 1 Assessment Scorecards
            </p>
          </div>
        </div>

        <button
          onClick={fetchAcademics}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-bold border border-brand-200 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {saveSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccess}</span>
        </div>
      )}

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs font-semibold text-rose-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* STUDENT & PARENT VIEW */}
      {(currentRole === 'student' || currentRole === 'parent') && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">Cumulative GPA Score</span>
              <div className="text-3xl font-black text-brand-900 mt-1">{data.overall_percentage}%</div>
              <div className="mt-2 text-xs text-emerald-700 font-bold">Grade: {data.overall_grade}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">Student Name</span>
              <div className="text-xl font-extrabold text-brand-900 mt-1">{data.student_name}</div>
              <div className="mt-2 text-xs text-content-secondary">Roll No: {data.roll_no} • Class {data.class_code}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">Evaluation Status</span>
              <div className="text-xl font-extrabold text-indigo-700 mt-1">Distinction Track</div>
              <div className="mt-2 text-xs text-emerald-700 font-bold">Top 10% in Mathematics</div>
            </div>
          </div>

          {/* Grades Table */}
          <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-brand-950">Subject Scorecard & Assessment Breakdown</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-100 text-content-muted font-bold">
                    <th className="pb-3 px-3">Subject</th>
                    <th className="pb-3 px-3">Assessment</th>
                    <th className="pb-3 px-3">Marks Obtained</th>
                    <th className="pb-3 px-3">Grade</th>
                    <th className="pb-3 px-3">Faculty Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {data.grades?.map((g) => (
                    <tr key={g.id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-3 font-bold text-brand-950">{g.subject}</td>
                      <td className="py-3 px-3 text-content-secondary">{g.assessment_name}</td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-900">
                        {g.marks_obtained} / {g.max_marks}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2.5 py-0.5 rounded-md font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {g.grade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-content-muted">{g.comments || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER & PRINCIPAL VIEW */}
      {(currentRole === 'teacher' || currentRole === 'principal') && data && (
        <div className="space-y-6">
          {/* Teacher Grade Entry Form */}
          {currentRole === 'teacher' && (
            <div className="bg-gradient-to-br from-brand-50 to-white rounded-3xl border border-brand-200/80 shadow-brand-sm p-6 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-brand-700 text-white flex items-center justify-center font-bold">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-brand-950">
                    Enter / Update Student Grade Record
                  </h3>
                  <p className="text-xs text-content-muted">
                    Backend enforces role authorization before mutating student academic records
                  </p>
                </div>
              </div>

              <form onSubmit={handleGradeSubmit} className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs pt-2">
                <div>
                  <label className="block font-bold text-brand-900 mb-1">Student</label>
                  <select
                    value={formStudentId}
                    onChange={(e) => setFormStudentId(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-brand-200 rounded-xl focus:border-brand-600 font-medium"
                  >
                    <option value={1}>Rahul Sharma (10A01)</option>
                    <option value={2}>Ananya Deshmukh (10A02)</option>
                    <option value={3}>Kabir Singh (10A03)</option>
                    <option value={4}>Priya Nair (10A04)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-brand-900 mb-1">Subject</label>
                  <input
                    type="text"
                    required
                    value={formSubject}
                    onChange={(e) => setFormSubject(e.target.value)}
                    className="w-full p-2.5 bg-white border border-brand-200 rounded-xl focus:border-brand-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-900 mb-1">Assessment</label>
                  <input
                    type="text"
                    required
                    value={formAssessment}
                    onChange={(e) => setFormAssessment(e.target.value)}
                    className="w-full p-2.5 bg-white border border-brand-200 rounded-xl focus:border-brand-600 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-900 mb-1">Marks</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formMarks}
                    onChange={(e) => setFormMarks(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-brand-200 rounded-xl focus:border-brand-600 font-medium font-mono"
                  />
                </div>

                <div>
                  <label className="block font-bold text-brand-900 mb-1">Max Marks</label>
                  <input
                    type="number"
                    value={formMaxMarks}
                    onChange={(e) => setFormMaxMarks(Number(e.target.value))}
                    className="w-full p-2.5 bg-white border border-brand-200 rounded-xl focus:border-brand-600 font-medium font-mono"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full py-2.5 bg-brand-700 hover:bg-brand-800 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-brand-sm transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>{saving ? 'Saving...' : 'Save Grade'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Class Academic Roster */}
          <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-brand-950">
              Class 10-A Academic Summary & Subject Records
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-100 text-content-muted font-bold">
                    <th className="pb-3 px-3">Roll No</th>
                    <th className="pb-3 px-3">Student Name</th>
                    <th className="pb-3 px-3">Average %</th>
                    <th className="pb-3 px-3">Grade</th>
                    <th className="pb-3 px-3">Subject Breakdown</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {data.students?.map((s) => (
                    <tr key={s.student_id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-3 font-mono font-bold text-brand-800">{s.roll_no}</td>
                      <td className="py-3 px-3 font-bold text-brand-950">{s.full_name}</td>
                      <td className="py-3 px-3 font-mono font-bold text-brand-900">{s.average_percentage}%</td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded font-bold text-xs bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {s.overall_grade}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-content-muted">
                        <div className="flex flex-wrap gap-1.5">
                          {s.subject_records?.map((sr, idx) => (
                            <span key={idx} className="bg-brand-50 text-brand-900 border border-brand-200 px-2 py-0.5 rounded text-[11px]">
                              {sr.subject}: <b>{sr.marks}/{sr.max_marks}</b>
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

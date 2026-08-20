import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { 
  UserCheck, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Calendar, 
  RefreshCw, 
  AlertCircle, 
  Sparkles,
  Search,
  Filter,
  Check
} from 'lucide-react';
import { t } from '../../utils/i18n';

export default function AttendanceView({ currentUser, currentRole = 'student', currentLang = 'en' }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');
  const [markingStudentId, setMarkingStudentId] = useState(null);

  const fetchAttendance = async () => {
    setLoading(true);
    setError('');
    setActionSuccess('');

    try {
      if (currentRole === 'student') {
        const res = await apiService.getMyAttendance();
        setData(res);
      } else if (currentRole === 'parent') {
        const childId = currentUser?.child_student_id || 1;
        const res = await apiService.getChildAttendance(childId);
        setData(res);
      } else if (currentRole === 'teacher') {
        const res = await apiService.getClassAttendance(1);
        setData(res);
      } else if (currentRole === 'principal') {
        const res = await apiService.getSchoolAttendance();
        setData(res);
      }
    } catch (err) {
      console.error('Attendance fetch error:', err);
      setError(err.message || 'Unable to fetch attendance records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, [currentRole]);

  const handleMarkStatus = async (studentId, status) => {
    setMarkingStudentId(studentId);
    setActionSuccess('');
    setError('');

    try {
      const res = await apiService.markAttendance({
        studentId,
        date: new Date().toISOString().split('T')[0],
        status,
        reason: status === 'Absent' ? 'Marked absent via Teacher Attendance Console' : 'Present in class',
      });
      setActionSuccess(res.message);
      // Refresh roster data
      await fetchAttendance();
    } catch (err) {
      setError(err.message || 'Failed to update attendance.');
    } finally {
      setMarkingStudentId(null);
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
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-brand-100 text-brand-700 flex items-center justify-center font-bold">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-brand-950">
              {t('attendance', currentLang)}
            </h2>
            <p className="text-xs text-content-muted">
              Role: <b className="text-brand-800 capitalize">{currentRole}</b> • Authorized data layer
            </p>
          </div>
        </div>

        <button
          onClick={fetchAttendance}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-brand-50 hover:bg-brand-100 text-brand-800 rounded-xl text-xs font-bold border border-brand-200 transition-all self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Action Notification */}
      {actionSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
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
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">{t('overallAttendance', currentLang)}</span>
              <div className="text-3xl font-black text-brand-900 mt-1">{data.summary?.percentage}%</div>
              <div className="mt-3 text-[11px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded inline-block">
                {data.summary?.standing}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">{t('presentDays', currentLang)}</span>
              <div className="text-3xl font-black text-emerald-600 mt-1">{data.summary?.present_days}</div>
              <div className="mt-3 text-[11px] text-content-secondary">Total recorded sessions</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">{t('absentDays', currentLang)}</span>
              <div className="text-3xl font-black text-rose-600 mt-1">{data.summary?.absent_days}</div>
              <div className="mt-3 text-[11px] text-content-secondary">Excused & medical leave</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">Enrolled Class</span>
              <div className="text-3xl font-black text-brand-900 mt-1">{data.class_code}</div>
              <div className="mt-3 text-[11px] text-brand-700 font-bold">{data.student_name}</div>
            </div>
          </div>

          {/* Recent Attendance Records Table */}
          <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm overflow-hidden p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-brand-950">Recent Attendance History</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-brand-100 text-content-muted font-bold">
                    <th className="pb-3 px-3">Date</th>
                    <th className="pb-3 px-3">Subject</th>
                    <th className="pb-3 px-3">Status</th>
                    <th className="pb-3 px-3">Remarks / Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-50">
                  {data.records?.map((rec) => (
                    <tr key={rec.id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-3 font-semibold text-brand-950">{rec.date}</td>
                      <td className="py-3 px-3 text-content-secondary">{rec.subject}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          rec.status === 'Present' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {rec.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-content-muted">{rec.reason || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TEACHER VIEW */}
      {currentRole === 'teacher' && data && (
        <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-100 pb-4">
            <div>
              <h3 className="font-extrabold text-base text-brand-950">
                Class 10-A Attendance Console
              </h3>
              <p className="text-xs text-content-muted">
                Total Roster: {data.total_students} Students • Date: {new Date().toLocaleDateString()}
              </p>
            </div>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 px-3 py-1.5 rounded-xl border border-brand-200">
              Authorized Faculty: Ms. Anjali Sharma
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-brand-100 text-content-muted font-bold">
                  <th className="pb-3 px-3">Roll No</th>
                  <th className="pb-3 px-3">Student Name</th>
                  <th className="pb-3 px-3">Overall Attendance</th>
                  <th className="pb-3 px-3">Today's Status</th>
                  <th className="pb-3 px-3 text-right">Interactive Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-50">
                {data.students?.map((stu) => {
                  const isPresent = stu.today_status === 'Present';
                  const isBusy = markingStudentId === stu.student_id;
                  return (
                    <tr key={stu.student_id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-3 font-mono font-bold text-brand-800">{stu.roll_no}</td>
                      <td className="py-3 px-3 font-bold text-brand-950">{stu.full_name}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-brand-900">{stu.overall_percentage}%</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isPresent 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {stu.today_status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleMarkStatus(stu.student_id, 'Present')}
                            disabled={isBusy || isPresent}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              isPresent
                                ? 'bg-emerald-100 text-emerald-800 cursor-default'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white border border-emerald-200'
                            }`}
                          >
                            Present
                          </button>
                          <button
                            onClick={() => handleMarkStatus(stu.student_id, 'Absent')}
                            disabled={isBusy || !isPresent}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                              !isPresent
                                ? 'bg-rose-100 text-rose-800 cursor-default'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-600 hover:text-white border border-rose-200'
                            }`}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PRINCIPAL VIEW */}
      {currentRole === 'principal' && data && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">School-Wide Attendance Rate</span>
              <div className="text-3xl font-black text-brand-900 mt-1">{data.overall_attendance_rate}%</div>
              <div className="mt-2 text-xs text-emerald-700 font-bold">{data.compliance_status}</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">Total Students Enrolled</span>
              <div className="text-3xl font-black text-indigo-700 mt-1">{data.total_enrolled}</div>
              <div className="mt-2 text-xs text-content-secondary">Grades 9-12</div>
            </div>
            <div className="bg-white p-6 rounded-3xl border border-brand-100 shadow-brand-sm">
              <span className="text-xs text-content-muted font-semibold">Active Faculty</span>
              <div className="text-3xl font-black text-purple-700 mt-1">{data.active_teachers}</div>
              <div className="mt-2 text-xs text-emerald-700 font-bold">98% Present Today</div>
            </div>
          </div>

          {/* Grade Breakdown Cards */}
          <div className="bg-white rounded-3xl border border-brand-100 shadow-brand-sm p-6 space-y-4">
            <h3 className="font-extrabold text-sm text-brand-950">Section & Grade Breakdown</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {data.class_breakdowns?.map((c, idx) => (
                <div key={idx} className="p-4 bg-brand-50/50 border border-brand-100 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-xs text-brand-800">{c.class_code}</span>
                    <span className="text-xs font-black text-brand-900">{c.attendance_rate}%</span>
                  </div>
                  <h4 className="text-xs font-bold text-brand-950">{c.name}</h4>
                  <div className="w-full bg-brand-200/60 rounded-full h-1.5">
                    <div className="bg-brand-700 h-1.5 rounded-full" style={{ width: `${c.attendance_rate}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

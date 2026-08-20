/**
 * EduSaathi Comprehensive API Service Client
 * Handles JWT authentication, request headers, error propagation, and all school subsystem calls.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';
const TOKEN_KEY = 'edusaathi_jwt_token';
const USER_KEY = 'edusaathi_user_profile';

export const apiService = {
  // --- Token & Session Management ---
  getToken() {
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(token, user) {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  getStoredUser() {
    try {
      const u = localStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getHeaders(customHeaders = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...customHeaders,
    };
    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const headers = this.getHeaders(options.headers || {});
    
    try {
      const response = await fetch(url, { ...options, headers });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.detail || data.message || `HTTP ${response.status}: ${response.statusText}`);
      }
      return data;
    } catch (err) {
      console.error(`API Error on ${endpoint}:`, err);
      throw err;
    }
  },

  // --- Health & Info ---
  async getHealth() {
    try {
      return await this.request('/api/health', { method: 'GET' });
    } catch (e) {
      return { status: 'offline', error: e.message, product: 'EduSaathi' };
    }
  },

  async getInfo() {
    return await this.request('/api/info', { method: 'GET' });
  },

  // --- Authentication ---
  async login(email, password) {
    const data = await this.request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.access_token) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  },

  async register(registrationData) {
    const data = await this.request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(registrationData),
    });
    if (data.access_token) {
      this.setSession(data.access_token, data.user);
    }
    return data;
  },

  async getMe() {
    return await this.request('/api/auth/me', { method: 'GET' });
  },

  logout() {
    this.clearSession();
  },

  // --- Chat & AI Assistant ---
  async sendChatMessage({ message, role, language, conversationId }) {
    return await this.request('/api/chat', {
      method: 'POST',
      body: JSON.stringify({
        message,
        role,
        language,
        conversation_id: conversationId,
      }),
    });
  },

  async getChatHistory(sessionId) {
    return await this.request(`/api/chat/history/${sessionId}`, { method: 'GET' });
  },

  // --- Attendance Subsystem ---
  async getMyAttendance() {
    return await this.request('/api/attendance/me', { method: 'GET' });
  },

  async getChildAttendance(childId) {
    return await this.request(`/api/attendance/child/${childId}`, { method: 'GET' });
  },

  async getClassAttendance(classId = 1) {
    return await this.request(`/api/attendance/class/${classId}`, { method: 'GET' });
  },

  async getSchoolAttendance() {
    return await this.request('/api/attendance/school', { method: 'GET' });
  },

  async markAttendance({ studentId, date, status, reason }) {
    return await this.request('/api/attendance/mark', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        date,
        status,
        reason,
      }),
    });
  },

  // --- Academics Subsystem ---
  async getMyAcademics() {
    return await this.request('/api/academics/me', { method: 'GET' });
  },

  async getStudentAcademics(studentId) {
    return await this.request(`/api/academics/student/${studentId}`, { method: 'GET' });
  },

  async getClassAcademics(classId = 1) {
    return await this.request(`/api/academics/class/${classId}`, { method: 'GET' });
  },

  async enterGrade({ studentId, subject, assessmentName, marksObtained, maxMarks, comments }) {
    return await this.request('/api/academics/grades', {
      method: 'POST',
      body: JSON.stringify({
        student_id: studentId,
        subject,
        assessment_name: assessmentName,
        marks_obtained: parseFloat(marksObtained),
        max_marks: parseFloat(maxMarks || 100),
        comments,
      }),
    });
  },

  // --- Support & Escalations ---
  async requestTeacherCall({ description, targetTeacherId, studentId }) {
    return await this.request('/api/support/teacher-call', {
      method: 'POST',
      body: JSON.stringify({
        description,
        target_teacher_id: targetTeacherId,
        student_id: studentId,
      }),
    });
  },

  async requestManagementSupport({ description, studentId }) {
    return await this.request('/api/support/management', {
      method: 'POST',
      body: JSON.stringify({
        description,
        student_id: studentId,
      }),
    });
  },

  async getMySupportRequests() {
    return await this.request('/api/support/my-requests', { method: 'GET' });
  },

  async getAllSupportRequests() {
    return await this.request('/api/support/all', { method: 'GET' });
  },

  // --- Security Matrix & Test Sandbox ---
  async getSecurityMatrix() {
    return await this.request('/api/security/matrix', { method: 'GET' });
  },

  async testSecurityAction(action, targetResource = null) {
    return await this.request('/api/security/test-action', {
      method: 'POST',
      body: JSON.stringify({
        action,
        target_resource: targetResource,
      }),
    });
  },
};

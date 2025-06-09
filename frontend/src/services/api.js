// frontend/src/services/api.js - COMPLETE FILE WITH EDITOR ASSIGNMENT
import axios from 'axios';
import toast from 'react-hot-toast';

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    // Add auth token if it exists
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log requests in development
    if (import.meta.env.DEV) {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, config.data);
    }
    
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => {
    // Log responses in development
    if (import.meta.env.DEV) {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, response.data);
    }
    
    return response;
  },
  (error) => {
    console.error('API Error:', error);
    
    // Handle different error types
    if (error.response) {
      // Server responded with error status
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          // Unauthorized - clear token and redirect to login
          localStorage.removeItem('token');
          delete api.defaults.headers.common['Authorization'];
          
          if (window.location.pathname !== '/login') {
            toast.error('Session expired. Please login again.');
            window.location.href = '/login';
          }
          break;
          
        case 403:
          toast.error(data.error || 'Access forbidden');
          break;
          
        case 404:
          toast.error(data.error || 'Resource not found');
          break;
          
        case 429:
          toast.error('Too many requests. Please try again later.');
          break;
          
        case 500:
          toast.error('Server error. Please try again later.');
          break;
          
        default:
          if (data.error) {
            toast.error(data.error);
          }
      }
    } else if (error.request) {
      // Network error
      toast.error('Network error. Please check your connection.');
    } else {
      // Something else happened
      toast.error('An unexpected error occurred.');
    }
    
    return Promise.reject(error);
  }
);

// API service functions
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  forgotPassword: (email) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token, password) => api.post(`/auth/reset-password/${token}`, { password }),
  changePassword: (currentPassword, newPassword) => 
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

export const submissionsAPI = {
  getAll: (params) => api.get('/submissions', { params }),
  getById: (id) => api.get(`/submissions/${id}`),
  create: (data) => api.post('/submissions', data),
  updateStage: (id, stage, notes) => api.put(`/submissions/${id}/stage`, { stage, notes }),
  triggerAnalysis: (id) => api.post(`/submissions/${id}/analysis`),
  archive: (id) => api.delete(`/submissions/${id}`),
  
  // ✅ NEW: Editor Assignment Functions
  assignEditor: (submissionId, editorId, notes = '') => 
    api.put(`/submissions/${submissionId}/assign-editor`, { editorId, notes }),
  getUnassigned: () => 
    api.get('/submissions/unassigned'),
  getEditorWorkload: () => 
    api.get('/submissions/editor-workload'),
};

export const filesAPI = {
  upload: (formData) => api.post('/files/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000, // 1 minute for file uploads
  }),
  getDownloadUrl: (id) => api.get(`/files/${id}`),
  delete: (id) => api.delete(`/files/${id}`),
  getBySubmission: (submissionId) => api.get(`/files/submission/${submissionId}`),
  approve: (fileId, approved, notes = '') => api.put(`/files/${fileId}/approve`, { 
    approved, 
    notes 
  }),
  // Extract text from uploaded file
  extractText: (fileId) => api.get(`/files/${fileId}/extract-text`),
  // Health check for text extraction
  healthCheck: () => api.get('/files/health'),
};

export const approvalsAPI = {
  submit: (data) => api.post('/approvals', data),
  getPending: () => api.get('/approvals/pending'),
  getBySubmission: (submissionId) => api.get(`/approvals/submission/${submissionId}`),
};

export const eventsAPI = {
  getAll: () => api.get('/events'),
  create: (data) => api.post('/events', data),
  rsvp: (eventId, data) => api.post(`/events/${eventId}/rsvp`, data),
  getRsvps: (eventId) => api.get(`/events/${eventId}/rsvps`),
};

export const reviewsAPI = {
  getPending: () => api.get('/reviews/pending'),
  submit: (submissionId, data) => api.post(`/reviews/${submissionId}`, data),
  update: (submissionId, data) => api.put(`/reviews/${submissionId}`, data),
};

export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
  getSubmissions: () => api.get('/dashboard/submissions'),
  getWorkflow: () => api.get('/dashboard/workflow'),
};

export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  assignEditor: (studentId, editorId) => api.post('/users/assign-editor', { studentId, editorId }),
};

// Utility functions
export const handleApiError = (error, defaultMessage = 'An error occurred') => {
  if (error.response?.data?.error) {
    return error.response.data.error;
  }
  if (error.message) {
    return error.message;
  }
  return defaultMessage;
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const getErrorStatus = (error) => {
  return error.response?.status;
};

// Export default api instance
export default api;

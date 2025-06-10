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
// frontend/src/services/api.js - UPDATED AUTH API SECTION ONLY

// API service functions
export const authAPI = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (userData) => api.post('/auth/register', userData),
  getProfile: () => api.get('/auth/profile'),
  
  // ✅ ENHANCED: Password Reset Functions
  forgotPassword: (email) => {
    console.log('📞 Calling forgot password API:', { email });
    return api.post('/auth/forgot-password', { email }).then(response => {
      console.log('✅ Forgot password API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Forgot password API error:', error);
      throw error;
    });
  },
  
  resetPassword: (token, email, password) => {
    console.log('📞 Calling reset password API:', { token: token.substring(0, 8) + '...', email });
    
    // Validation
    if (!token) {
      const error = new Error('Reset token is required');
      console.error('❌ Reset password validation error:', error.message);
      return Promise.reject(error);
    }
    
    if (!email) {
      const error = new Error('Email is required');
      console.error('❌ Reset password validation error:', error.message);
      return Promise.reject(error);
    }
    
    if (!password || password.length < 8) {
      const error = new Error('Password must be at least 8 characters');
      console.error('❌ Reset password validation error:', error.message);
      return Promise.reject(error);
    }
    
    return api.post('/auth/reset-password', { token, email, password }).then(response => {
      console.log('✅ Reset password API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Reset password API error:', {
        status: error.response?.status,
        error: error.response?.data || error.message
      });
      throw error;
    });
  },
  
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

// frontend/src/services/api.js - UPDATED EVENTS API SECTION ONLY

export const eventsAPI = {
  getAll: () => {
    console.log('📞 Calling events API: GET /events');
    return api.get('/events').then(response => {
      console.log('✅ Events API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Events API error:', error);
      throw error;
    });
  },
  
  create: (data) => {
    console.log('📞 Calling events API: POST /events', data);
    return api.post('/events', data).then(response => {
      console.log('✅ Create event API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Create event API error:', error);
      throw error;
    });
  },
  
  rsvp: (eventId, data) => {
    console.log(`📞 Calling RSVP API: POST /events/${eventId}/rsvp`, data);
    
    // Validation
    if (!eventId) {
      const error = new Error('Event ID is required for RSVP');
      console.error('❌ RSVP validation error:', error.message);
      return Promise.reject(error);
    }
    
    if (!data || !data.status) {
      const error = new Error('RSVP status is required');
      console.error('❌ RSVP validation error:', error.message);
      return Promise.reject(error);
    }
    
    if (!['attending', 'maybe', 'declined'].includes(data.status)) {
      const error = new Error('Invalid RSVP status');
      console.error('❌ RSVP validation error:', error.message);
      return Promise.reject(error);
    }
    
    return api.post(`/events/${eventId}/rsvp`, data).then(response => {
      console.log('✅ RSVP API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ RSVP API error:', {
        eventId,
        data,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    });
  },
  
  // ✅ NEW: Get RSVPs for an event (admin only)
  getRsvps: (eventId) => {
    console.log(`📞 Calling get RSVPs API: GET /events/${eventId}/rsvps`);
    
    if (!eventId) {
      const error = new Error('Event ID is required to get RSVPs');
      console.error('❌ Get RSVPs validation error:', error.message);
      return Promise.reject(error);
    }
    
    return api.get(`/events/${eventId}/rsvps`).then(response => {
      console.log('✅ Get RSVPs API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Get RSVPs API error:', {
        eventId,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    });
  },
  
  update: (eventId, data) => {
    console.log(`📞 Calling update event API: PUT /events/${eventId}`, data);
    
    if (!eventId) {
      const error = new Error('Event ID is required to update event');
      console.error('❌ Update event validation error:', error.message);
      return Promise.reject(error);
    }
    
    return api.put(`/events/${eventId}`, data).then(response => {
      console.log('✅ Update event API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Update event API error:', error);
      throw error;
    });
  },
  
  delete: (eventId) => {
    console.log(`📞 Calling delete event API: DELETE /events/${eventId}`);
    
    if (!eventId) {
      const error = new Error('Event ID is required to delete event');
      console.error('❌ Delete event validation error:', error.message);
      return Promise.reject(error);
    }
    
    return api.delete(`/events/${eventId}`).then(response => {
      console.log('✅ Delete event API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Delete event API error:', error);
      throw error;
    });
  }
};

// frontend/src/services/api.js - FIXED REVIEWS API SECTION ONLY

export const reviewsAPI = {
  getPending: () => {
    console.log('📞 Calling reviews API: GET /reviews/pending');
    return api.get('/reviews/pending').then(response => {
      console.log('✅ Reviews pending API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Reviews pending API error:', error);
      throw error;
    });
  },
  
  submit: (submissionId, data) => {
    console.log(`📞 Calling reviews API: POST /reviews/${submissionId}`, data);
    
    // Validation
    if (!submissionId) {
      const error = new Error('Submission ID is required for review submission');
      console.error('❌ Review validation error:', error.message);
      return Promise.reject(error);
    }
    
    if (!data || typeof data.plagiarismScore === 'undefined' || !data.plagiarismNotes) {
      const error = new Error('Plagiarism score and notes are required');
      console.error('❌ Review validation error:', error.message);
      return Promise.reject(error);
    }
    
    if (typeof data.passed !== 'boolean') {
      const error = new Error('Passed status must be boolean');
      console.error('❌ Review validation error:', error.message);
      return Promise.reject(error);
    }
    
    // Ensure proper data structure
    const reviewData = {
      plagiarismScore: parseInt(data.plagiarismScore),
      plagiarismNotes: data.plagiarismNotes.trim(),
      passed: data.passed,
      reviewedBy: data.reviewedBy || undefined // Optional
    };
    
    return api.post(`/reviews/${submissionId}`, reviewData).then(response => {
      console.log('✅ Review submit API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Review submit API error:', {
        submissionId,
        data: reviewData,
        error: error.response?.data || error.message,
        status: error.response?.status
      });
      throw error;
    });
  },
  
  update: (submissionId, data) => {
    console.log(`📞 Calling reviews API: PUT /reviews/${submissionId}`, data);
    
    if (!submissionId) {
      const error = new Error('Submission ID is required for review update');
      console.error('❌ Review update validation error:', error.message);
      return Promise.reject(error);
    }
    
    return api.put(`/reviews/${submissionId}`, data).then(response => {
      console.log('✅ Review update API success:', response.data);
      return response;
    }).catch(error => {
      console.error('❌ Review update API error:', error);
      throw error;
    });
  }
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

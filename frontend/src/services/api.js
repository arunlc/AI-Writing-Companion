import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if available
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication API calls
export const register = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

// Password reset API calls
export const forgotPassword = async (email) => {
  const response = await api.post('/auth/forgot-password', { email });
  return response.data;
};

export const resetPassword = async (token, password) => {
  const response = await api.post(`/auth/reset-password/${token}`, { password });
  return response.data;
};

// User API calls
export const getUserProfile = async () => {
  console.log('Fetching user profile');
  const response = await api.get('/user/profile');
  return response.data;
};

export const getUserSubmissions = async () => {
  console.log('Fetching user submissions from frontend');
  const response = await api.get('/user/submissions');
  console.log('Received submissions count:', response.data.length);
  return response.data;
};

export const updateRewards = async (coinsEarned) => {
  const response = await api.put('/user/rewards', { coinsEarned });
  return response.data;
};

// Analysis API calls
export const analyzeWriting = async (title, text) => {
  const response = await api.post('/analyze', { title, text });
  return response.data;
};

export const saveSubmission = async (submission) => {
  console.log('Saving submission from frontend');
  const response = await api.post('/analyze/save', submission);
  console.log('Submission saved:', response.data);
  return response.data;
};

// Add this function to frontend/src/services/api.js
export const getSubmission = async (id) => {
  const response = await api.get(`/analyze/${id}`);
  return response.data;
};
export default api;

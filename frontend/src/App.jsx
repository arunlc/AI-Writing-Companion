// frontend/src/App.jsx - UPDATED WITH PASSWORD RESET ROUTES
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword'; // ✅ NEW
import ResetPassword from './pages/auth/ResetPassword';   // ✅ NEW
import Dashboard from './pages/dashboard/Dashboard';
import SubmissionsList from './pages/submissions/SubmissionsList';
import NewSubmission from './pages/submissions/NewSubmission';
import SubmissionDetails from './pages/submissions/SubmissionDetails';
import Profile from './pages/profile/Profile';
import UserManagement from './pages/admin/UserManagement';
import ReviewQueue from './pages/reviews/ReviewQueue';
import EventsList from './pages/events/EventsList';
import LoadingSpinner from './components/ui/LoadingSpinner';
import EditorAssignment from './pages/admin/EditorAssignment';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// Public Route Component (redirect if already authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="large" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/register"
          element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          }
        />
        
        {/* ✅ NEW: Password Reset Routes */}
        <Route
          path="/forgot-password"
          element={
            <PublicRoute>
              <ForgotPassword />
            </PublicRoute>
          }
        />
        <Route
          path="/reset-password"
          element={
            <PublicRoute>
              <ResetPassword />
            </PublicRoute>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <Layout>
                <Routes>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/profile" element={<Profile />} />
                  
                  {/* Submissions Routes */}
                  <Route path="/submissions" element={<SubmissionsList />} />
                  <Route 
                    path="/submissions/new" 
                    element={
                      <ProtectedRoute allowedRoles={['STUDENT']}>
                        <NewSubmission />
                      </ProtectedRoute>
                    } 
                  />
                  <Route path="/submissions/:id" element={<SubmissionDetails />} />
                  
                  {/* Admin Routes */}
                  <Route 
                    path="/admin/users" 
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <UserManagement />
                      </ProtectedRoute>
                    } 
                  />

                  <Route 
                    path="/admin/editor-assignment"
                    element={
                      <ProtectedRoute allowedRoles={['ADMIN']}>
                        <EditorAssignment />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Reviewer Routes */}
                  <Route 
                    path="/reviews" 
                    element={
                      <ProtectedRoute allowedRoles={['REVIEWER', 'ADMIN']}>
                        <ReviewQueue />
                      </ProtectedRoute>
                    } 
                  />
                  
                  {/* Events Routes */}
                  <Route path="/events" element={<EventsList />} />
                  
                  {/* Default redirect */}
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}

export default App;

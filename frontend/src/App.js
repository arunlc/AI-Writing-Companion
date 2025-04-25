import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { Book, User, LogOut } from 'lucide-react';
import WritingEditor from './components/WritingEditor';
import AnalysisResults from './components/AnalysisResults';
import Dashboard from './components/Dashboard';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import ForgotPassword from './components/auth/ForgotPassword';
import ResetPassword from './components/auth/ResetPassword';
import * as api from './services/api';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [submissions, setSubmissions] = useState([]);
  const [analysis, setAnalysis] = useState(null);
  const [title, setTitle] = useState('');
  const [activeTab, setActiveTab] = useState('editor');
  
  // Check if user is logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData();
    } else {
      setIsLoading(false);
    }
  }, []);
  
  // Fetch user data and submissions
  const fetchUserData = async () => {
    try {
      const userData = await api.getUserProfile();
      setUser(userData);
      
      const userSubmissions = await api.getUserSubmissions();
      setSubmissions(userSubmissions);
    } catch (error) {
      console.error('Error fetching user data:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle login
  const handleLogin = async (credentials) => {
    const data = await api.login(credentials);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };
  
  // Handle register
  const handleRegister = async (userData) => {
    const data = await api.register(userData);
    localStorage.setItem('token', data.token);
    setUser(data.user);
    return data;
  };
  
  // Handle logout
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setSubmissions([]);
  };
  
  // Handle analyze writing
  const handleAnalyze = async (title, text) => {
    const analysis = await api.analyzeWriting(title, text);
    setAnalysis(analysis);
    setTitle(title);
    setActiveTab('results');
    
    // Update user rewards based on score
    if (user) {
      const coinsEarned = Math.floor(analysis.metrics.overallScore / 10);
      try {
        const updatedRewards = await api.updateRewards(coinsEarned);
        setUser(prevUser => ({
          ...prevUser,
          coins: updatedRewards.coins,
          level: updatedRewards.level
        }));
        
        // If the user leveled up, show a notification
        if (updatedRewards.levelUp) {
          alert(`Congratulations! You've leveled up to Level ${updatedRewards.level}!`);
        }
      } catch (error) {
        console.error('Error updating rewards:', error);
      }
    }
    
    return analysis;
  };
  
  // Handle save submission
  const handleSaveSubmission = async () => {
    if (!user || !analysis || !title) return;
    
    try {
      const submission = {
        title,
        content: analysis.originalText || '',
        analysis
      };
      
      await api.saveSubmission(submission);
      await fetchUserData(); // Refresh submissions
      alert('Your writing has been saved!');
    } catch (error) {
      console.error('Error saving submission:', error);
      alert('Failed to save your writing. Please try again.');
    }
  };
  
  if (isLoading) {
    return <div className="min-h-screen flex justify-center items-center">Loading...</div>;
  }
  
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <header className="bg-indigo-700 text-white p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Link to="/" className="text-2xl font-bold">Learner Circle Writing Companion</Link>
            {user && (
              <div className="flex items-center space-x-6">
                <div className="flex items-center">
                  <div className="flex items-center mr-6">
                    <div className="w-6 h-6 flex items-center justify-center bg-yellow-400 rounded-full text-white text-xs font-bold mr-1">
                      {user.coins}
                    </div>
                    <span className="text-sm">Coins</span>
                  </div>
                  <div className="flex items-center">
                    <div className="w-6 h-6 flex items-center justify-center bg-purple-400 rounded-full text-white text-xs font-bold mr-1">
                      {user.level}
                    </div>
                    <span className="text-sm">Level</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <Link to="/dashboard" className="flex items-center">
                    <User className="w-5 h-5 mr-1" />
                    <span>{user.name}</span>
                  </Link>
                  <button 
                    onClick={logout}
                    className="flex items-center text-gray-200 hover:text-white"
                  >
                    <LogOut className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </header>
        
        <main className="container mx-auto py-6 px-4">
          <Routes>
            <Route path="/" element={
              user ? (
                <div>
                  <div className="mb-6 flex border-b">
                    <button 
                      className={`px-4 py-2 font-medium ${activeTab === 'editor' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                      onClick={() => setActiveTab('editor')}
                    >
                      Writer's Studio
                    </button>
                    <button 
                      className={`px-4 py-2 font-medium ${activeTab === 'results' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500'}`}
                      onClick={() => setActiveTab('results')}
                      disabled={!analysis}
                    >
                      Analysis Results
                    </button>
                  </div>
                  
                  {activeTab === 'editor' ? (
                    <WritingEditor onAnalyze={handleAnalyze} />
                  ) : (
                    <div>
                      <AnalysisResults analysis={analysis} title={title} />
                      <div className="mt-4 flex justify-end">
                        <button
                          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center"
                          onClick={handleSaveSubmission}
                        >
                          <Book className="w-4 h-4 mr-2" />
                          Save to My Writing
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="max-w-2xl mx-auto bg-white p-8 rounded-lg shadow-md">
                  <h2 className="text-2xl font-bold mb-6">Welcome to Learner Circle Writing Companion</h2>
                  <p className="mb-6">
                    This AI-powered writing assistant helps young writers improve their skills
                    with instant feedback, personalized suggestions, and fun rewards.
                  </p>
                  <div className="flex space-x-4">
                    <Link
                      to="/login"
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                      Log In
                    </Link>
                    <Link
                      to="/register"
                      className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                    >
                      Sign Up
                    </Link>
                  </div>
                </div>
              )
            } />
            
            <Route path="/dashboard" element={
              user ? (
                <Dashboard user={user} submissions={submissions} />
              ) : (
                <Navigate to="/login" />
              )
            } />
            
            <Route path="/login" element={
              user ? (
                <Navigate to="/" />
              ) : (
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                  <Login onLogin={handleLogin} />
                  <div className="mt-4 text-center">
                    <p className="text-gray-600">
                      Don't have an account?{' '}
                      <Link to="/register" className="text-indigo-600 hover:underline">
                        Sign up
                      </Link>
                    </p>
                  </div>
                </div>
              )
            } />
            
            <Route path="/register" element={
              user ? (
                <Navigate to="/" />
              ) : (
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                  <Register onRegister={handleRegister} />
                  <div className="mt-4 text-center">
                    <p className="text-gray-600">
                      Already have an account?{' '}
                      <Link to="/login" className="text-indigo-600 hover:underline">
                        Log in
                      </Link>
                    </p>
                  </div>
                </div>
              )
            } />
            
            {/* Password Reset Routes */}
            <Route path="/forgot-password" element={
              user ? (
                <Navigate to="/" />
              ) : (
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                  <ForgotPassword />
                </div>
              )
            } />
            
            <Route path="/reset-password/:token" element={
              user ? (
                <Navigate to="/" />
              ) : (
                <div className="max-w-md mx-auto bg-white p-8 rounded-lg shadow-md">
                  <ResetPassword />
                </div>
              )
            } />
          </Routes>
        </main>
        
        <footer className="bg-gray-100 p-6 mt-12">
          <div className="container mx-auto">
            <p className="text-center text-gray-600">
              &copy; {new Date().getFullYear()} Learner Circle Writing Companion. All rights reserved.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default App;

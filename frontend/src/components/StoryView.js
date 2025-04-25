// frontend/src/components/StoryView.js
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Award } from 'lucide-react';
import { getSubmission } from '../services/api';
import AnalysisResults from './AnalysisResults';

const StoryView = () => {
  const [submission, setSubmission] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { id } = useParams();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const data = await getSubmission(id);
        setSubmission(data);
      } catch (error) {
        console.error('Error fetching submission:', error);
        setError('Unable to load the story. It may have been deleted or you may not have permission to view it.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmission();
  }, [id]);
  
  if (loading) {
    return <div className="flex justify-center items-center py-12">Loading story...</div>;
  }
  
  if (error) {
    return (
      <div className="max-w-4xl mx-auto py-8">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </button>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-6">
        <Link
          to="/dashboard"
          className="flex items-center text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Dashboard
        </Link>
      </div>
      
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="mb-4">
          <h1 className="text-2xl font-bold">{submission.title}</h1>
          <div className="flex items-center text-sm text-gray-500 mt-1">
            <span>{new Date(submission.createdAt).toLocaleDateString()}</span>
            <span className="mx-2">•</span>
            <span>{submission.analysis.basicMetrics.wordCount} words</span>
            <span className="mx-2">•</span>
            <span className="flex items-center">
              <Award className="w-4 h-4 text-yellow-500 mr-1" />
              Score: {submission.analysis.metrics.overallScore}
            </span>
          </div>
        </div>
        
        <div className="prose prose-indigo max-w-none">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6">
            <h2 className="text-lg font-semibold mb-2">Your Story</h2>
            <div className="whitespace-pre-line">{submission.content}</div>
          </div>
        </div>
      </div>
      
      <AnalysisResults analysis={submission.analysis} title={submission.title} />
    </div>
  );
};

export default StoryView;

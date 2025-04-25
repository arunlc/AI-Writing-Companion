// frontend/src/components/StoriesList.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Star, ArrowLeft } from 'lucide-react';
import { getUserSubmissions } from '../services/api';

const StoriesList = () => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await getUserSubmissions();
        setSubmissions(data);
      } catch (error) {
        console.error('Error fetching submissions:', error);
        setError('Failed to load your stories. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSubmissions();
  }, []);
  
  if (loading) {
    return <div className="flex justify-center items-center py-12">Loading your stories...</div>;
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
      
      <h1 className="text-2xl font-bold mb-6">My Stories</h1>
      
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {submissions.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-md text-center">
          <p className="text-gray-600">You haven't saved any stories yet.</p>
          <Link to="/" className="mt-4 inline-block text-indigo-600 hover:underline">
            Start writing your first story
          </Link>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <div className="divide-y">
            {submissions.map((submission, idx) => (
              <div key={idx} className="py-4 first:pt-0 last:pb-0">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <FileText className="w-5 h-5 text-gray-400 mr-3" />
                    <div>
                      <Link to={`/story/${submission._id}`} className="font-medium text-lg hover:text-indigo-600">
                        {submission.title}
                      </Link>
                      <p className="text-sm text-gray-500">
                        {new Date(submission.createdAt).toLocaleDateString()} • 
                        {submission.analysis.basicMetrics.wordCount} words • 
                        {submission.analysis.metrics.genre}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center bg-yellow-50 px-3 py-1 rounded-full">
                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                    <span className="font-medium">{submission.analysis.metrics.overallScore}</span>
                  </div>
                </div>
                <p className="mt-2 text-gray-600 line-clamp-2">
                  {submission.content.substring(0, 150)}...
                </p>
                <div className="mt-2">
                  <Link to={`/story/${submission._id}`} className="text-sm text-indigo-600 hover:underline">
                    Read full story
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesList;

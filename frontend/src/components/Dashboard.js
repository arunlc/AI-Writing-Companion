import React, { useState, useEffect } from 'react';
import { Award, Book, Star, TrendingUp, FileText } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const Dashboard = ({ user, submissions }) => {
  const [progressData, setProgressData] = useState([]);
  
  useEffect(() => {
    if (submissions && submissions.length > 0) {
      // Format submissions for progress chart
      const data = submissions.map(sub => ({
        date: new Date(sub.createdAt).toLocaleDateString(),
        score: sub.analysis.metrics.overallScore
      }));
      
      setProgressData(data.reverse());
    }
  }, [submissions]);
  
  if (!user) return <div>Loading user data...</div>;
  
  return (
    <div className="space-y-6">
      {/* User Profile Card */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex items-start">
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mr-4">
            <span className="text-xl font-bold text-indigo-700">{user.name.charAt(0)}</span>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{user.name}</h2>
            <p className="text-gray-500">{user.grade || 'Student'}</p>
            <div className="mt-2 flex items-center">
              <Book className="w-4 h-4 text-gray-400 mr-1" />
              <span className="text-sm text-gray-600">{submissions?.length || 0} stories submitted</span>
            </div>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-3 gap-2">
          <div className="bg-indigo-50 p-3 rounded-lg flex flex-col items-center">
            <div className="text-xs text-gray-500">Level</div>
            <div className="text-lg font-bold text-indigo-700">{user.level}</div>
          </div>
          
          <div className="bg-yellow-50 p-3 rounded-lg flex flex-col items-center">
            <div className="text-xs text-gray-500">Coins</div>
            <div className="text-lg font-bold text-yellow-600">{user.coins}</div>
          </div>
          
          <div className="bg-green-50 p-3 rounded-lg flex flex-col items-center">
            <div className="text-xs text-gray-500">Avg Score</div>
            <div className="text-lg font-bold text-green-600">
              {submissions && submissions.length > 0
                ? Math.round(
                    submissions.reduce((sum, sub) => sum + sub.analysis.metrics.overallScore, 0) / 
                    submissions.length
                  )
                : '-'}
            </div>
          </div>
        </div>
      </div>
      
      {/* Progress Chart */}
      {progressData.length > 0 && (
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-lg font-semibold mb-4">Writing Progress</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={progressData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#8884d8" activeDot={{ r: 8 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
      
    // Update the Recent Submissions section in Dashboard.js
{/* Recent Submissions */}
{submissions && submissions.length > 0 && (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-lg font-semibold mb-4">Recent Submissions</h2>
    <div className="space-y-3">
      {submissions.slice(0, 5).map((submission, idx) => (
        <div key={idx} className="border-b pb-3 last:border-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <FileText className="w-4 h-4 text-gray-400 mr-2" />
              <div>
                <Link to={`/story/${submission._id}`} className="font-medium hover:text-indigo-600">
                  {submission.title}
                </Link>
                <p className="text-xs text-gray-500">
                  {new Date(submission.createdAt).toLocaleDateString()} • 
                  {submission.analysis.basicMetrics.wordCount} words
                </p>
              </div>
            </div>
            <div className="flex items-center">
              <Star className="w-4 h-4 text-yellow-400 mr-1" />
              <span className="font-medium">{submission.analysis.metrics.overallScore}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
    
    {submissions.length > 5 && (
      <div className="mt-4 text-center">
        <Link to="/my-stories" className="text-indigo-600 hover:underline">
          View all stories
        </Link>
      </div>
    )}
  </div>
)}

export default Dashboard;

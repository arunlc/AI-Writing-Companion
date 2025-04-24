import React from 'react';
import { Star, CheckCircle, TrendingUp, HelpCircle, FileText } from 'lucide-react';

const AnalysisResults = ({ analysis, title }) => {
  if (!analysis) return null;
  
  // Format score with color
  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };
  
  // Score display component
  const ScoreDisplay = ({ score, label, icon: Icon }) => (
    <div className="flex flex-col items-center">
      <div className="text-gray-600 mb-1 text-sm">{label}</div>
      <div className="flex items-center">
        {Icon && <Icon className="w-4 h-4 mr-1 text-gray-500" />}
        <span className={`text-xl font-bold ${getScoreColor(score)}`}>
          {score}
        </span>
      </div>
    </div>
  );
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-lg font-semibold mb-4">
        Analysis Results: {title}
      </h2>
      
      <div className="flex items-center text-sm text-gray-600 mb-4">
        <FileText className="w-4 h-4 mr-1" />
        <span>{analysis.basicMetrics.wordCount} words</span>
        <span className="mx-2">•</span>
        <span>{new Date().toLocaleDateString()}</span>
        <span className="mx-2">•</span>
        <span>{analysis.metrics.genre || 'Fiction'}</span>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <ScoreDisplay 
          score={analysis.metrics.overallScore} 
          label="Overall" 
          icon={Star}
        />
        <ScoreDisplay 
          score={analysis.grammar.score} 
          label="Grammar" 
          icon={CheckCircle}
        />
        <ScoreDisplay 
          score={analysis.metrics.originalityScore} 
          label="Originality" 
          icon={TrendingUp}
        />
        <ScoreDisplay 
          score={analysis.characters.score} 
          label="Characters" 
          icon={HelpCircle}
        />
      </div>
      
      <div className="space-y-6">
        {/* Grammar Analysis */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-lg mb-2">Grammar & Style</h3>
          {analysis.grammar.errors.length > 0 ? (
            <div className="space-y-2">
              {analysis.grammar.errors.map((error, idx) => (
                <div key={idx} className="p-3 bg-orange-50 border-l-4 border-orange-400 rounded">
                  <p className="line-through text-gray-500">{error.original}</p>
                  <p className="text-green-600 font-medium">{error.correction}</p>
                  <p className="text-sm text-gray-600">{error.explanation}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-green-600">No grammar errors detected!</p>
          )}
        </div>
        
        {/* Tone Analysis */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-lg mb-2">Tone & Sentiment</h3>
          <div className="flex items-center space-x-2 mb-2">
            <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
              {analysis.tone.classification}
            </span>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {analysis.tone.sentiment}

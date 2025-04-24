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
<span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
              {analysis.tone.sentiment}
            </span>
          </div>
          <p className="text-sm text-gray-600">
            Your writing has a {analysis.tone.classification.toLowerCase()} tone with a {analysis.tone.sentiment.toLowerCase()} sentiment.
          </p>
        </div>
        
        {/* Structure Analysis */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-lg mb-2">Story Structure</h3>
          <div className="grid grid-cols-3 gap-4 mb-2">
            <div className="p-3 bg-gray-50 rounded">
              <h4 className="font-medium text-gray-700">Beginning</h4>
              <p className="text-sm">{analysis.structure.beginning}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <h4 className="font-medium text-gray-700">Middle</h4>
              <p className="text-sm">{analysis.structure.middle}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded">
              <h4 className="font-medium text-gray-700">End</h4>
              <p className="text-sm">{analysis.structure.end}</p>
            </div>
          </div>
          <p className="text-sm italic">{analysis.structure.suggestions}</p>
        </div>
        
        {/* Character Analysis */}
        {analysis.characters.characters.length > 0 && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-lg mb-2">Character Analysis</h3>
            <div className="space-y-2">
              {analysis.characters.characters.map((character, idx) => (
                <div key={idx} className="p-3 bg-purple-50 rounded">
                  <h4 className="font-medium text-purple-800">{character.name} - {character.role}</h4>
                  {character.traits !== 'Unknown' && <p className="text-sm">Traits: {character.traits}</p>}
                  <p className="text-sm">Consistency: {character.consistency}</p>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Logical Flaws / Questions */}
        {(analysis.logicalFlaws.flaws.length > 0 || analysis.logicalFlaws.questions.length > 0) && (
          <div className="border-t pt-4">
            <h3 className="font-medium text-lg mb-2">Logical Flaws / Questions</h3>
            {analysis.logicalFlaws.flaws.length > 0 && (
              <>
                <h4 className="font-medium text-gray-700 mb-1">Potential Issues:</h4>
                <ul className="list-disc pl-5 space-y-1 mb-3">
                  {analysis.logicalFlaws.flaws.map((flaw, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{flaw}</li>
                  ))}
                </ul>
              </>
            )}
            {analysis.logicalFlaws.questions.length > 0 && (
              <>
                <h4 className="font-medium text-gray-700 mb-1">Questions Readers Might Have:</h4>
                <ul className="list-disc pl-5 space-y-1">
                  {analysis.logicalFlaws.questions.map((question, idx) => (
                    <li key={idx} className="text-sm text-gray-700">{question}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        )}
        
        {/* Tense Analysis */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-lg mb-2">Tense Analysis</h3>
          <p className="mb-1">Primary tense: <span className="font-medium">{analysis.tense.primary}</span></p>
          {analysis.tense.inconsistencies.length > 0 && (
            <div>
              <p className="text-sm font-medium text-orange-600">Inconsistencies:</p>
              <ul className="list-disc pl-5">
                {analysis.tense.inconsistencies.map((inconsistency, idx) => (
                  <li key={idx} className="text-sm">{inconsistency}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        {/* AI & Plagiarism Scores */}
        <div className="border-t pt-4">
          <h3 className="font-medium text-lg mb-2">Content Authenticity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">AI-Generated Content Score</h3>
                <div className={`px-3 py-1 ${analysis.metrics.aiScore < 7 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded-full text-sm font-medium`}>
                  {analysis.metrics.aiScore}/100
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${analysis.metrics.aiScore}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {analysis.metrics.aiScore < 7 ? 'Great! Your content appears to be original and human-written.' : 'Your content may contain AI-generated sections. Try to add more originality.'}
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-medium">Plagiarism Score</h3>
                <div className={`px-3 py-1 ${analysis.metrics.plagiarismScore < 7 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded-full text-sm font-medium`}>
                  {analysis.metrics.plagiarismScore}%
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${analysis.metrics.plagiarismScore}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {analysis.metrics.plagiarismScore < 7 ? 'Excellent! Your content appears to be highly original.' : 'Some content may be similar to existing sources. Review for originality.'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisResults;

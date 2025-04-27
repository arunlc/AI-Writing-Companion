// frontend/src/components/AnalysisResults.js
import React from 'react';
import { Star, CheckCircle, TrendingUp, HelpCircle, FileText } from 'lucide-react';

// Enhanced component for displaying grammar errors
const GrammarErrorDisplay = ({ errors }) => {
  if (!errors || errors.length === 0) {
    return <p className="text-green-600">No grammar errors detected!</p>;
  }
  
  return (
    <div className="space-y-3">
      {errors.map((error, idx) => (
        <div key={idx} className="p-4 bg-orange-50 border-l-4 border-orange-400 rounded">
          <div className="flex items-center mb-1">
            <span className="font-medium text-orange-800">Error {idx + 1}</span>
          </div>
          <div className="flex flex-col sm:flex-row sm:gap-6 mb-2">
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Original:</p>
              <p className="line-through text-gray-600 bg-gray-100 p-2 rounded">{error.original}</p>
            </div>
            <div className="flex-1 mt-2 sm:mt-0">
              <p className="text-xs text-gray-500 mb-1">Suggestion:</p>
              <p className="text-green-600 font-medium bg-green-50 p-2 rounded">{error.correction}</p>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-orange-200">
            <p className="text-sm text-gray-700"><span className="font-medium">Why:</span> {error.explanation}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// Enhanced component for displaying character analysis
const CharacterAnalysisDisplay = ({ characters, suggestions }) => {
  if (!characters || characters.length === 0) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No distinct characters detected in this text.</p>
        {suggestions && <p className="text-sm italic mt-2">{suggestions}</p>}
      </div>
    );
  }
  
  // Function to get badge color based on consistency
  const getConsistencyColor = (consistency) => {
    switch (consistency.toLowerCase()) {
      case 'high': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="space-y-4">
      {characters.map((character, idx) => (
        <div key={idx} className="p-4 bg-purple-50 rounded-lg border border-purple-100">
          <div className="flex flex-wrap items-start justify-between mb-2">
            <h4 className="font-medium text-purple-800 text-lg">{character.name}</h4>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getConsistencyColor(character.consistency)}`}>
              {character.consistency} Consistency
            </span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
            <div className="bg-white p-3 rounded border border-purple-100">
              <p className="text-xs text-purple-600 font-medium mb-1">Role</p>
              <p className="text-sm">{character.role || 'Unspecified'}</p>
            </div>
            
            <div className="bg-white p-3 rounded border border-purple-100">
              <p className="text-xs text-purple-600 font-medium mb-1">Traits</p>
              <p className="text-sm">{character.traits || 'Not identified'}</p>
            </div>
          </div>
        </div>
      ))}
      
      {suggestions && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-800">
          <span className="font-medium">Suggestions:</span> {suggestions}
        </div>
      )}
    </div>
  );
};

// Component for displaying AI detection reasoning
const AIReasoningDisplay = ({ reasoning }) => {
  if (!reasoning) return null;
  
  return (
    <div className="mt-3 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <h4 className="font-medium text-gray-800 mb-2">AI Detection Analysis</h4>
      <p className="text-sm text-gray-700 whitespace-pre-line">{reasoning}</p>
    </div>
  );
};

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
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Grammar & Style</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.grammar.score >= 80 ? 'bg-green-100 text-green-800' : 
              analysis.grammar.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              Score: {analysis.grammar.score}/100
            </div>
          </div>
          
          {analysis.grammar.summary && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-blue-800 text-sm">
              {analysis.grammar.summary}
            </div>
          )}
          
          <GrammarErrorDisplay errors={analysis.grammar.errors} />
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
        <div className="border-t pt-4">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-lg">Character Analysis</h3>
            <div className={`px-3 py-1 rounded-full text-sm font-medium ${
              analysis.characters.score >= 80 ? 'bg-green-100 text-green-800' : 
              analysis.characters.score >= 60 ? 'bg-yellow-100 text-yellow-800' : 
              'bg-red-100 text-red-800'
            }`}>
              Score: {analysis.characters.score}/100
            </div>
          </div>
          
          <CharacterAnalysisDisplay 
            characters={analysis.characters.characters} 
            suggestions={analysis.characters.suggestions} 
          />
        </div>
        
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
                <div className={`px-3 py-1 ${analysis.metrics.aiScore < 25 ? 'bg-green-100 text-green-800' : 
                  analysis.metrics.aiScore < 60 ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'} rounded-full text-sm font-medium`}>
                  {analysis.metrics.aiScore}/100
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div className={`h-2.5 rounded-full ${
                  analysis.metrics.aiScore < 25 ? 'bg-green-600' : 
                  analysis.metrics.aiScore < 60 ? 'bg-yellow-600' : 
                  'bg-red-600'
                }`} style={{ width: `${analysis.metrics.aiScore}%` }}></div>
              </div>
              <p className="text-sm text-gray-600 mt-2">
                {analysis.metrics.aiScore < 25 ? 
                  'Great! Your content appears to be original and human-written.' : 
                  analysis.metrics.aiScore < 60 ?
                  'Your content has some patterns that might be AI-generated. Consider adding more personal voice.' :
                  'Your content shows strong indicators of AI generation. Try to make it more personal and unique.'}
              </p>
              
              {/* Display Claude's detailed reasoning */}
              {analysis.aiDetection && analysis.aiDetection.reasoning && 
                <AIReasoningDisplay reasoning={analysis.aiDetection.reasoning} />}
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

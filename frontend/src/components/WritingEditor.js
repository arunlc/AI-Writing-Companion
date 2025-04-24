import React, { useState } from 'react';
import { BarChart2 } from 'lucide-react';

const WritingEditor = ({ onAnalyze }) => {
  const [text, setText] = useState('');
  const [title, setTitle] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const handleAnalyze = async () => {
    if (text.trim().length < 50) {
      alert('Please write at least 50 characters for analysis');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      await onAnalyze(title, text);
    } catch (error) {
      console.error('Analysis error:', error);
      alert('Failed to analyze writing. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <div className="mb-4 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Write Your Story</h2>
      </div>
      
      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Title
        </label>
        <input
          type="text"
          id="title"
          className="w-full p-2 border rounded-lg"
          placeholder="Enter a title for your story"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      
      <textarea
        className="w-full p-3 border rounded-lg min-h-96 font-sans text-gray-800"
        placeholder="Start writing your story here... (at least 50 characters for analysis)"
        value={text}
        onChange={(e) => setText(e.target.value)}
      ></textarea>
      
      <div className="mt-4 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {text.split(/\s+/).filter(Boolean).length} words
        </div>
        
        <button
          className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center disabled:bg-gray-300"
          onClick={handleAnalyze}
          disabled={isAnalyzing || text.trim().length < 50}
        >
          {isAnalyzing ? (
            <>
              <span className="mr-2">Analyzing...</span>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            </>
          ) : (
            <>
              <BarChart2 className="w-4 h-4 mr-2" />
              Analyze Writing
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default WritingEditor;

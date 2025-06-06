import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import toast from 'react-hot-toast';

const NewSubmission = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!formData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (formData.content.trim().length < 50) {
      newErrors.content = 'Content must be at least 50 characters for analysis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await submissionsAPI.create({
        title: formData.title.trim(),
        content: formData.content.trim()
      });
      
      toast.success('Submission created successfully! AI analysis is in progress...');
      
      // Navigate to the new submission details page
      navigate(`/submissions/${response.data.submission.id}`);
    } catch (error) {
      console.error('Submission creation error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create submission';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() && !formData.content.trim()) {
      toast.error('Please enter a title or content to save as draft');
      return;
    }

    // For now, just save to localStorage as a draft
    const draft = {
      title: formData.title,
      content: formData.content,
      savedAt: new Date().toISOString()
    };
    
    localStorage.setItem('submissionDraft', JSON.stringify(draft));
    toast.success('Draft saved locally');
  };

  const loadDraft = () => {
    const draft = localStorage.getItem('submissionDraft');
    if (draft) {
      const parsedDraft = JSON.parse(draft);
      setFormData({
        title: parsedDraft.title || '',
        content: parsedDraft.content || ''
      });
      toast.success('Draft loaded');
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('submissionDraft');
    setFormData({ title: '', content: '' });
    toast.success('Draft cleared');
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = formData.content.length;

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Submission</h1>
          <p className="text-gray-600">Submit your writing for AI analysis and review.</p>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            {/* Draft Controls */}
            <div className="mb-4 flex space-x-2">
              <button
                type="button"
                onClick={loadDraft}
                className="text-sm text-blue-600 hover:text-blue-700"
              >
                Load Draft
              </button>
              <span className="text-gray-300">|</span>
              <button
                type="button"
                onClick={clearDraft}
                className="text-sm text-red-600 hover:text-red-700"
              >
                Clear Draft
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <Input
                label="Title"
                name="title"
                placeholder="Enter a title for your submission"
                value={formData.title}
                onChange={handleChange}
                error={errors.title}
                required
              />
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  name="content"
                  rows={12}
                  className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                    errors.content 
                      ? 'border-red-300 text-red-900 placeholder-red-300' 
                      : 'border-gray-300'
                  }`}
                  placeholder="Paste or type your writing here..."
                  value={formData.content}
                  onChange={handleChange}
                  required
                />
                <div className="mt-1 flex justify-between items-center">
                  <div className="text-sm text-gray-500">
                    {charCount} characters • {wordCount} words
                    {charCount < 50 && (
                      <span className="text-red-500 ml-2">
                        (Minimum 50 characters required)
                      </span>
                    )}
                  </div>
                  {charCount >= 50 && (
                    <div className="text-sm text-green-600">
                      ✓ Ready for analysis
                    </div>
                  )}
                </div>
                {errors.content && (
                  <p className="mt-1 text-sm text-red-600">{errors.content}</p>
                )}
              </div>
              
              <div className="flex space-x-3">
                <Button 
                  type="submit" 
                  disabled={isLoading || charCount < 50}
                  className="flex items-center"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating & Analyzing...
                    </>
                  ) : (
                    'Submit for Analysis'
                  )}
                </Button>
                
                <Button 
                  type="button"
                  variant="secondary" 
                  onClick={handleSaveDraft}
                  disabled={isLoading}
                >
                  Save as Draft
                </Button>
                
                <Button 
                  type="button"
                  variant="ghost"
                  onClick={() => navigate('/submissions')}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
              </div>
            </form>

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your writing will be analyzed by an AI engine for grammar, structure, and style</li>
                <li>• The submission will be sent for plagiarism review</li>
                <li>• You'll be assigned to an editor for personalized feedback</li>
                <li>• You can track progress through all 7 stages in your submissions list</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubmission;

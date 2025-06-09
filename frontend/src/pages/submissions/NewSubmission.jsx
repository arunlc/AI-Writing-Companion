// frontend/src/pages/submissions/NewSubmission.jsx - ENHANCED VERSION
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionsAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FileUpload from '../../components/files/FileUpload';
import { DocumentTextIcon, CloudArrowUpIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const NewSubmission = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [step, setStep] = useState(1); // 1: Basic Info, 2: File Upload, 3: Submit
  const [uploadedFiles, setUploadedFiles] = useState([]);
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

  const handleCreateDraft = async () => {
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
      
      const newSubmissionId = response.data.submission.id;
      setSubmissionId(newSubmissionId);
      setStep(2);
      
      toast.success('Draft created! You can now upload files before final submission.');
    } catch (error) {
      console.error('Draft creation error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create draft';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!submissionId) {
      toast.error('Please create a draft first');
      return;
    }

    setIsLoading(true);
    
    try {
      // Move to analysis stage - the submission is already created
      toast.success('Submission completed! AI analysis will begin shortly.');
      
      // Navigate to the submission details page
      navigate(`/submissions/${submissionId}`);
    } catch (error) {
      console.error('Final submission error:', error);
      toast.error('Failed to complete submission');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUploadComplete = (file) => {
    console.log('File uploaded:', file);
    setUploadedFiles(prev => [...prev, file]);
    toast.success(`File "${file.originalName}" uploaded successfully`);
  };

  const handleSaveDraft = async () => {
    if (!formData.title.trim() && !formData.content.trim()) {
      toast.error('Please enter a title or content to save as draft');
      return;
    }

    // Save to localStorage as backup
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
    } else {
      toast.info('No saved draft found');
    }
  };

  const clearDraft = () => {
    localStorage.removeItem('submissionDraft');
    setFormData({ title: '', content: '' });
    toast.success('Draft cleared');
  };

  const wordCount = formData.content.trim().split(/\s+/).filter(word => word.length > 0).length;
  const charCount = formData.content.length;

  // Step 1: Basic Information
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <DocumentTextIcon className="mx-auto h-12 w-12 text-primary-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Step 1: Basic Information</h2>
        <p className="text-gray-600">Enter your title and content to get started</p>
      </div>

      {/* Draft Controls */}
      <div className="mb-4 flex justify-center space-x-4">
        <button
          type="button"
          onClick={loadDraft}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          Load Saved Draft
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
              ✓ Ready for next step
            </div>
          )}
        </div>
        {errors.content && (
          <p className="mt-1 text-sm text-red-600">{errors.content}</p>
        )}
      </div>
      
      <div className="flex space-x-3">
        <Button 
          onClick={handleCreateDraft}
          disabled={isLoading || charCount < 50}
          className="flex items-center"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Creating Draft...
            </>
          ) : (
            'Create Draft & Continue'
          )}
        </Button>
        
        <Button 
          type="button"
          variant="secondary" 
          onClick={handleSaveDraft}
          disabled={isLoading}
        >
          Save Locally
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
    </div>
  );

  // Step 2: File Upload
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <CloudArrowUpIcon className="mx-auto h-12 w-12 text-primary-600 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Step 2: Upload Files (Optional)</h2>
        <p className="text-gray-600">Upload any supporting documents or attachments</p>
      </div>

      {/* Submission Info */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <div className="flex items-center">
          <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
          <div>
            <h3 className="text-sm font-medium text-green-900">Draft Created Successfully</h3>
            <p className="text-sm text-green-700 mt-1">
              Title: "{formData.title}" • {wordCount} words
            </p>
          </div>
        </div>
      </div>

      {/* File Upload Types */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Submission Content</h3>
          <FileUpload
            submissionId={submissionId}
            fileType="SUBMISSION_CONTENT"
            accept=".doc,.docx,.txt,.pdf"
            onUploadComplete={handleFileUploadComplete}
            className="h-32"
          />
        </div>

        <div>
          <h3 className="text-sm font-medium text-gray-900 mb-3">Attachments</h3>
          <FileUpload
            submissionId={submissionId}
            fileType="ATTACHMENT"
            accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif"
            multiple={true}
            onUploadComplete={handleFileUploadComplete}
            className="h-32"
          />
        </div>
      </div>

      {/* Uploaded Files Summary */}
      {uploadedFiles.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Uploaded Files</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            {uploadedFiles.map((file, index) => (
              <li key={index} className="flex items-center">
                <CheckCircleIcon className="h-4 w-4 text-green-600 mr-2" />
                {file.originalName} ({file.fileType.replace('_', ' ')})
              </li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="flex space-x-3">
        <Button 
          onClick={handleFinalSubmit}
          disabled={isLoading}
          className="flex items-center"
        >
          {isLoading ? (
            <>
              <LoadingSpinner size="sm" className="mr-2" />
              Submitting...
            </>
          ) : (
            'Complete Submission'
          )}
        </Button>
        
        <Button 
          variant="secondary"
          onClick={() => setStep(1)}
          disabled={isLoading}
        >
          Back to Edit
        </Button>
        
        <Button 
          variant="ghost"
          onClick={() => navigate(`/submissions/${submissionId}`)}
          disabled={isLoading}
        >
          View Draft
        </Button>
      </div>
    </div>
  );

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Submission</h1>
          <p className="text-gray-600">Submit your writing for AI analysis and review.</p>
          
          {/* Progress Indicator */}
          <div className="mt-4 flex items-center space-x-4">
            <div className={`flex items-center ${step >= 1 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 1 ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
              }`}>
                1
              </div>
              <span className="ml-2 text-sm font-medium">Basic Info</span>
            </div>
            <div className={`w-8 h-0.5 ${step >= 2 ? 'bg-primary-600' : 'bg-gray-300'}`}></div>
            <div className={`flex items-center ${step >= 2 ? 'text-primary-600' : 'text-gray-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step >= 2 ? 'bg-primary-100 text-primary-600' : 'bg-gray-100 text-gray-400'
              }`}>
                2
              </div>
              <span className="ml-2 text-sm font-medium">Upload Files</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="p-6">
            {step === 1 && renderStep1()}
            {step === 2 && renderStep2()}

            {/* Help Text */}
            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">What happens next?</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Your writing will be analyzed by an AI engine for grammar, structure, and style</li>
                <li>• The submission will be sent for plagiarism review</li>
                <li>• You'll be assigned to an editor for personalized feedback</li>
                <li>• You can track progress through all 7 stages in your submissions list</li>
                <li>• Files can be uploaded now or later during the review process</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubmission;

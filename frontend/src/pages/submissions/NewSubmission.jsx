// frontend/src/pages/submissions/NewSubmission.jsx - REAL TEXT EXTRACTION
import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { submissionsAPI, filesAPI } from '../../services/api';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FileUpload from '../../components/files/FileUpload';
import { 
  DocumentTextIcon, 
  CloudArrowUpIcon, 
  CheckCircleIcon, 
  ExclamationTriangleIcon,
  EyeIcon,
  BeakerIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const NewSubmission = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [submissionId, setSubmissionId] = useState(null);
  const [uploadedDocument, setUploadedDocument] = useState(null);
  const [extractedContent, setExtractedContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [contentSource, setContentSource] = useState(''); // 'pasted' or 'document'
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // When user types, mark as pasted content
    if (name === 'content' && value.trim()) {
      setContentSource('pasted');
    }
    
    // Clear errors when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  // ✅ REAL TEXT EXTRACTION - Call backend API
  const extractTextFromDocument = async (uploadedFile) => {
    setIsExtracting(true);
    setExtractionError(null);
    
    try {
      console.log('📝 Starting real text extraction for:', uploadedFile.originalName);
      
      // Check if file already has extracted text in upload response
      if (uploadedFile.extractedText) {
        console.log('✅ Using text from upload response');
        setExtractedContent(uploadedFile.extractedText);
        setContentSource('document');
        
        // Auto-fill content if textarea is empty
        if (!formData.content.trim()) {
          setFormData(prev => ({
            ...prev,
            content: uploadedFile.extractedText
          }));
        }
        
        toast.success(`Text extracted successfully! ${uploadedFile.extractionMetadata?.wordCount || 'Unknown'} words found.`);
        return;
      }

      // If no extracted text in upload response, call extraction API
      console.log('📞 Calling text extraction API...');
      const response = await filesAPI.extractText(uploadedFile.id);
      
      if (response.data.extractedText) {
        const extractedText = response.data.extractedText;
        const metadata = response.data.extractionMetadata;
        
        setExtractedContent(extractedText);
        setContentSource('document');
        
        // Auto-fill content if textarea is empty
        if (!formData.content.trim()) {
          setFormData(prev => ({
            ...prev,
            content: extractedText
          }));
        }
        
        const wordCount = metadata?.wordCount || extractedText.split(/\s+/).length;
        toast.success(`Text extracted successfully! ${wordCount} words found using ${metadata?.extractionMethod || 'text extraction'}.`);
      } else {
        throw new Error('No text content found in document');
      }
      
    } catch (error) {
      console.error('❌ Text extraction error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to extract text from document';
      setExtractionError(errorMessage);
      toast.error(`Text extraction failed: ${errorMessage}`);
    } finally {
      setIsExtracting(false);
    }
  };

  // Retry text extraction
  const retryExtraction = async () => {
    if (uploadedDocument) {
      await extractTextFromDocument(uploadedDocument);
    }
  };

  const handleFileUploadComplete = useCallback(async (uploadedFile) => {
    console.log('📁 Document uploaded:', uploadedFile);
    setUploadedDocument(uploadedFile);
    
    // Check if it's a text document that supports extraction
    const textFileTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'application/pdf' // .pdf
    ];
    
    if (textFileTypes.includes(uploadedFile.mimeType)) {
      await extractTextFromDocument(uploadedFile);
    } else {
      toast.info('Document uploaded as attachment. Please paste your content in the text area.');
    }
  }, [formData.content]);

  const getAnalysisContent = () => {
    if (contentSource === 'document' && extractedContent) {
      return extractedContent;
    }
    return formData.content;
  };

  const getContentSourceInfo = () => {
    const analysisContent = getAnalysisContent();
    const wordCount = analysisContent.trim().split(/\s+/).filter(word => word.length > 0).length;
    
    if (contentSource === 'document' && extractedContent) {
      return {
        source: 'Extracted from uploaded document',
        icon: <DocumentTextIcon className="h-4 w-4 text-blue-600" />,
        color: 'text-blue-600',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        wordCount
      };
    } else if (formData.content.trim()) {
      return {
        source: 'Pasted/typed content',
        icon: <DocumentTextIcon className="h-4 w-4 text-green-600" />,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-200',
        wordCount
      };
    } else {
      return {
        source: 'No content for analysis',
        icon: <ExclamationTriangleIcon className="h-4 w-4 text-gray-400" />,
        color: 'text-gray-400',
        bgColor: 'bg-gray-50',
        borderColor: 'border-gray-200',
        wordCount: 0
      };
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const analysisContent = getAnalysisContent();

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (formData.title.trim().length < 3) {
      newErrors.title = 'Title must be at least 3 characters';
    }

    if (!analysisContent.trim()) {
      newErrors.content = 'Please either paste content or upload a document with text';
    } else if (analysisContent.trim().length < 50) {
      newErrors.content = 'Content must be at least 50 characters for analysis';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      toast.error('Please fix the validation errors');
      return;
    }
    
    setIsLoading(true);
    
    try {
      const analysisContent = getAnalysisContent();
      
      const response = await submissionsAPI.create({
        title: formData.title.trim(),
        content: analysisContent,
        contentSource: contentSource,
        ...(uploadedDocument && { attachedFileId: uploadedDocument.id })
      });
      
      toast.success('Submission created successfully! AI analysis is starting...');
      
      // Navigate to the submission details page
      navigate(`/submissions/${response.data.submission.id}`);
    } catch (error) {
      console.error('Submission creation error:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create submission';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUseExtractedContent = () => {
    setFormData(prev => ({
      ...prev,
      content: extractedContent
    }));
    setContentSource('document');
    toast.success('Using extracted content for analysis');
  };

  const handleUsePastedContent = () => {
    setContentSource('pasted');
    toast.success('Using pasted content for analysis');
  };

  const contentInfo = getContentSourceInfo();

  return (
    <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Create New Submission</h1>
          <p className="text-gray-600">
            Upload your document for automatic text extraction, or paste your content manually. The AI will analyze whichever content you choose.
          </p>
        </div>
        
        <div className="bg-white shadow rounded-lg">
          <div className="p-6 space-y-6">
            
            {/* Title */}
            <Input
              label="Title"
              name="title"
              placeholder="Enter a title for your submission"
              value={formData.title}
              onChange={handleChange}
              error={errors.title}
              required
            />

            {/* Document Upload Section */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Your Document (Optional)
              </label>
              <FileUpload
                submissionId={submissionId}
                fileType="SUBMISSION_CONTENT"
                accept=".doc,.docx,.txt,.pdf"
                onUploadComplete={handleFileUploadComplete}
                className="border-2 border-dashed border-gray-300 rounded-lg p-4"
              />
              
              {/* Extraction Status */}
              {isExtracting && (
                <div className="mt-3 flex items-center text-blue-600">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm">Extracting text from document...</span>
                </div>
              )}
              
              {/* Upload Success */}
              {uploadedDocument && !isExtracting && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                      <div>
                        <p className="text-sm font-medium text-green-900">
                          Document uploaded: {uploadedDocument.originalName}
                        </p>
                        {extractedContent && (
                          <p className="text-sm text-green-700">
                            Text extracted successfully ({extractedContent.split(/\s+/).length} words)
                          </p>
                        )}
                        {extractionError && (
                          <p className="text-sm text-red-700">
                            Text extraction failed: {extractionError}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Retry button for failed extractions */}
                    {extractionError && (
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={retryExtraction}
                        disabled={isExtracting}
                      >
                        <ArrowPathIcon className="h-4 w-4 mr-1" />
                        Retry
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Content Text Area */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Content
                </label>
                {extractedContent && formData.content !== extractedContent && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    onClick={handleUseExtractedContent}
                  >
                    Use Extracted Content
                  </Button>
                )}
              </div>
              
              <textarea
                name="content"
                rows={12}
                className={`block w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-1 focus:ring-primary-500 focus:border-primary-500 ${
                  errors.content 
                    ? 'border-red-300 text-red-900 placeholder-red-300' 
                    : 'border-gray-300'
                }`}
                placeholder="Paste or type your content here, or upload a document above to extract text automatically..."
                value={formData.content}
                onChange={handleChange}
              />
              
              {errors.content && (
                <p className="mt-1 text-sm text-red-600">{errors.content}</p>
              )}
            </div>

            {/* Content Analysis Preview */}
            <div className={clsx(
              'p-4 rounded-lg border',
              contentInfo.bgColor,
              contentInfo.borderColor
            )}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {contentInfo.icon}
                  <h3 className={clsx('ml-2 text-sm font-medium', contentInfo.color)}>
                    Content for AI Analysis
                  </h3>
                </div>
                <BeakerIcon className="h-5 w-5 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <p className="text-sm text-gray-600">
                  <strong>Source:</strong> {contentInfo.source}
                </p>
                <p className="text-sm text-gray-600">
                  <strong>Word Count:</strong> {contentInfo.wordCount} words
                </p>
                
                {contentInfo.wordCount > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-medium text-gray-700 mb-1">Preview:</p>
                    <p className="text-xs text-gray-600 bg-white p-2 rounded border max-h-20 overflow-y-auto">
                      {getAnalysisContent().substring(0, 200)}
                      {getAnalysisContent().length > 200 && '...'}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Content Source Selection (when both exist) */}
            {extractedContent && formData.content.trim() && extractedContent !== formData.content && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="text-sm font-medium text-yellow-900 mb-2">
                  Choose Content for Analysis
                </h4>
                <p className="text-sm text-yellow-800 mb-3">
                  You have both pasted content and extracted document text. Which should the AI analyze?
                </p>
                <div className="flex space-x-3">
                  <Button
                    size="sm"
                    variant={contentSource === 'document' ? 'primary' : 'secondary'}
                    onClick={handleUseExtractedContent}
                  >
                    Use Document Text ({extractedContent.split(/\s+/).length} words)
                  </Button>
                  <Button
                    size="sm"
                    variant={contentSource === 'pasted' ? 'primary' : 'secondary'}
                    onClick={handleUsePastedContent}
                  >
                    Use Pasted Content ({formData.content.split(/\s+/).length} words)
                  </Button>
                </div>
              </div>
            )}
            
            {/* Submit Button */}
            <div className="flex space-x-3">
              <Button 
                onClick={handleSubmit}
                disabled={isLoading || contentInfo.wordCount < 50}
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
                variant="ghost"
                onClick={() => navigate('/submissions')}
                disabled={isLoading}
              >
                Cancel
              </Button>
            </div>

            {/* Help Text */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-2">How It Works</h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• <strong>Upload Document:</strong> Real text extraction from .docx, .doc, .pdf, and .txt files</li>
                <li>• <strong>Paste Content:</strong> AI will analyze whatever you paste or type in the text area</li>
                <li>• <strong>Smart Detection:</strong> The system automatically uses the most complete content available</li>
                <li>• <strong>AI Analysis:</strong> Claude AI analyzes your actual content for grammar, structure, and more</li>
                <li>• <strong>Track Progress:</strong> Monitor your submission through all workflow stages</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubmission;

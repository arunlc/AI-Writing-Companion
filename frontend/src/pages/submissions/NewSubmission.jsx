// frontend/src/pages/submissions/NewSubmission.jsx - SMART DETECTION VERSION
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
  BeakerIcon
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

  // Mock function to extract text from document
  // In real implementation, this would call a backend service
  const extractTextFromDocument = async (file) => {
    setIsExtracting(true);
    
    try {
      // Simulate text extraction (replace with actual backend call)
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock extracted content based on file type
      let mockContent = '';
      if (file.name.toLowerCase().includes('spy') || file.name.toLowerCase().includes('thriller')) {
        mockContent = `The Shadow's Edge

Agent Sarah Chen crouched behind the marble pillar, her breath barely audible in the silent museum corridor. The artifact she'd been tracking for months—the encrypted drive containing state secrets—lay just twenty feet away in the display case. 

But something was wrong. The security system she'd hacked showed no guards, yet she could sense eyes watching her every movement. The hair on the back of her neck stood up as footsteps echoed from the adjacent hall.

"I know you're here, Agent Chen," a familiar voice called out from the darkness. It was Viktor Kozlov, the Russian operative she thought she'd left for dead in Prague. "The drive you're after? It's not what you think it is."

Sarah's mind raced. How had he found her? More importantly, how was he still alive? She reached for the encrypted communicator in her jacket, but her fingers found only empty fabric. Her backup team was compromised.

The moonlight streaming through the skylight cast eerie shadows across the ancient artifacts. Each piece told a story of civilizations past, but tonight, they would witness the writing of a new chapter in the world of international espionage.

She had two choices: retreat and lose the intelligence that could prevent a global crisis, or advance knowing it might be her final mission. The sound of Viktor's footsteps grew closer, and Sarah made her decision.

In one fluid motion, she rolled from behind the pillar and sprinted toward the display case, her lockpicks already in hand. The laser grid activated, painting red lines across her path, but she'd memorized the pattern. Duck, roll, leap—she moved like a dancer through the deadly light show.

The drive was within reach when the lights suddenly blazed on, revealing not just Viktor, but an entire team of armed operatives surrounding her. Sarah smiled grimly. She'd walked into a trap, but she'd been preparing for this moment her entire career.

"Hello, Viktor," she said, palming the drive while keeping her hands visible. "I was wondering when you'd show up to this party."`;
      } else {
        mockContent = `My Summer Adventure

This summer was the most exciting time of my life! I went on a camping trip with my family to Yellowstone National Park, and it was absolutely amazing.

The first thing we did was set up our tent near a beautiful lake. The water was so clear you could see fish swimming at the bottom. My little brother tried to catch one with his bare hands, but of course, that didn't work out very well!

On our second day, we went hiking on a trail called the Grand Loop. It was pretty challenging, but the views were incredible. We saw geysers shooting water high into the sky, and our guide told us about Old Faithful, which erupts every 90 minutes like clockwork.

The wildlife was unbelievable. We spotted elk, bison, and even a black bear from a safe distance. My mom was both excited and terrified when the bear appeared. She made us all stick together and walk slowly away, just like the park rangers had taught us.

One of my favorite memories was sitting around the campfire at night, roasting marshmallows and telling stories. My dad told us about constellations, and we tried to spot them in the incredibly dark sky. You can see so many more stars when you're away from city lights!

The camping experience taught me a lot about nature and taking care of our environment. It also showed me that some of the best times don't involve screens or technology – just spending time with family and appreciating the natural world around us.

I can't wait to go back next summer and explore more of this amazing place!`;
      }
      
      setExtractedContent(mockContent);
      setContentSource('document');
      
      // Auto-fill content if textarea is empty
      if (!formData.content.trim()) {
        setFormData(prev => ({
          ...prev,
          content: mockContent
        }));
      }
      
      toast.success('Text extracted from document successfully!');
      
    } catch (error) {
      console.error('Text extraction error:', error);
      toast.error('Failed to extract text from document. You can still paste content manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileUploadComplete = useCallback(async (file) => {
    console.log('Document uploaded:', file);
    setUploadedDocument(file);
    
    // Only extract if it's a text document
    const textFileTypes = [
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'text/plain', // .txt
      'application/pdf' // .pdf
    ];
    
    if (textFileTypes.includes(file.mimeType)) {
      await extractTextFromDocument(file);
    } else {
      toast.info('Document uploaded as attachment. Please paste your content in the text area.');
    }
  }, []);

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
        content: analysisContent, // Use the smart-detected content
        contentSource: contentSource // Track where content came from
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
            Upload your document or paste your content. The AI will analyze whichever content you choose.
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
              
              {isExtracting && (
                <div className="mt-3 flex items-center text-blue-600">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-sm">Extracting text from document...</span>
                </div>
              )}
              
              {uploadedDocument && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
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
                    </div>
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
                <li>• <strong>Upload Document:</strong> AI will extract and analyze the full text from your document</li>
                <li>• <strong>Paste Content:</strong> AI will analyze whatever you paste or type in the text area</li>
                <li>• <strong>Smart Detection:</strong> The system automatically uses the most complete content available</li>
                <li>• <strong>Manual Review:</strong> Your editor will review your submission manually (no automated plagiarism checking)</li>
                <li>• <strong>Track Progress:</strong> You can monitor your submission through all stages</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NewSubmission;

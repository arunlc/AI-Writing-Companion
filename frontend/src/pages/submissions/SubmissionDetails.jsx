// src/pages/submissions/SubmissionDetails.jsx
import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { submissionsAPI } from '../../services/api';
import {
  ArrowLeftIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  UserIcon,
  CalendarIcon,
  ChartBarIcon,
  BeakerIcon,
  EyeIcon,
  PencilIcon,
  CloudArrowUpIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import FileUpload from '../../components/files/FileUpload';
import FileManager from '../../components/files/FileManager';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const SubmissionDetails = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showFullContent, setShowFullContent] = useState(false);
  const [selectedFileType, setSelectedFileType] = useState('ATTACHMENT');
  const [showFileUpload, setShowFileUpload] = useState(false);

  const { data, isLoading, error } = useQuery(
    ['submission', id],
    () => submissionsAPI.getById(id),
    {
      enabled: !!id,
      staleTime: 30000
    }
  );

  const updateStageMutation = useMutation(
    ({ stage, notes }) => submissionsAPI.updateStage(id, stage, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['submission', id]);
        toast.success('Stage updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update stage');
      }
    }
  );

  const triggerAnalysisMutation = useMutation(
    () => submissionsAPI.triggerAnalysis(id),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['submission', id]);
        toast.success('Analysis triggered successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to trigger analysis');
      }
    }
  );

  // Helper functions
  const getAcceptedFileTypes = (fileType) => {
    const typeMap = {
      'SUBMISSION_CONTENT': '.doc,.docx,.txt,.pdf',
      'PDF_SOFT_COPY': '.pdf',
      'COVER_DESIGN': '.jpg,.jpeg,.png,.gif,.pdf,.ai,.psd',
      'ATTACHMENT': '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif'
    };
    return typeMap[fileType] || '.pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif';
  };

  const canUploadFiles = () => {
    return submission?.studentId === user?.id || 
           user?.role === 'ADMIN' || 
           user?.role === 'OPERATIONS' ||
           (user?.role === 'EDITOR' && submission?.editorId === user?.id);
  };

  const handleFileUploadComplete = (file) => {
    console.log('File uploaded:', file);
    setShowFileUpload(false);
    // Refresh submission data to show new file
    queryClient.invalidateQueries(['submission', id]);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading submission</h3>
                <p className="mt-1 text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submission = data?.data?.submission;
  if (!submission) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStageColor = (stage) => {
    const colors = {
      ANALYSIS: 'bg-blue-100 text-blue-800 border-blue-200',
      PLAGIARISM_REVIEW: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      EDITOR_MEETING: 'bg-purple-100 text-purple-800 border-purple-200',
      APPROVAL_PROCESS: 'bg-orange-100 text-orange-800 border-orange-200',
      PDF_REVIEW: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      COVER_APPROVAL: 'bg-pink-100 text-pink-800 border-pink-200',
      EVENT_PLANNING: 'bg-green-100 text-green-800 border-green-200',
      COMPLETED: 'bg-gray-100 text-gray-800 border-gray-200'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const formatStage = (stage) => {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const canUpdateStage = () => {
    return user?.role === 'ADMIN' || 
           (user?.role === 'EDITOR' && submission.editorId === user.id) ||
           (user?.role === 'OPERATIONS');
  };

  const canTriggerAnalysis = () => {
    return user?.role === 'ADMIN' || user?.role === 'OPERATIONS';
  };

  const AnalysisResults = ({ analysis }) => {
    if (!analysis) return null;

    return (
      <div className="space-y-6">
        {/* Overall Score */}
        <div className="bg-white p-6 rounded-lg border">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Overall Analysis</h3>
            <div className="flex items-center">
              <ChartBarIcon className="h-5 w-5 text-gray-400 mr-2" />
              <span className={clsx('text-2xl font-bold', getScoreColor(analysis.overall_score))}>
                {analysis.overall_score}/100
              </span>
            </div>
          </div>
          {analysis.fallback_used && (
            <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800">
                <BeakerIcon className="h-4 w-4 inline mr-1" />
                Analysis completed with fallback system. Detailed review pending.
              </p>
            </div>
          )}
        </div>

        {/* Detailed Analysis */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Grammar Analysis */}
          {analysis.grammar_analysis && (
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">Grammar & Language</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={clsx('font-medium', getScoreColor(analysis.grammar_analysis.score))}>
                    {analysis.grammar_analysis.score}/100
                  </span>
                </div>
                {analysis.grammar_analysis.errors_found > 0 && (
                  <div>
                    <span className="text-sm text-gray-600">
                      {analysis.grammar_analysis.errors_found} issues found
                    </span>
                    {analysis.grammar_analysis.specific_issues?.length > 0 && (
                      <ul className="mt-2 text-sm text-gray-700 list-disc list-inside">
                        {analysis.grammar_analysis.specific_issues.slice(0, 3).map((issue, idx) => (
                          <li key={idx}>{issue}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Story Structure */}
          {analysis.story_structure && (
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">Story Structure</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={clsx('font-medium', getScoreColor(analysis.story_structure.score))}>
                    {analysis.story_structure.score}/100
                  </span>
                </div>
                <div className="text-sm space-y-1">
                  <div className="flex items-center">
                    {analysis.story_structure.has_clear_beginning ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                    )}
                    Clear Beginning
                  </div>
                  <div className="flex items-center">
                    {analysis.story_structure.has_developed_middle ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                    )}
                    Developed Middle
                  </div>
                  <div className="flex items-center">
                    {analysis.story_structure.has_satisfying_ending ? (
                      <CheckCircleIcon className="h-4 w-4 text-green-500 mr-2" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500 mr-2" />
                    )}
                    Satisfying Ending
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* AI Content Detection */}
          {analysis.ai_content_detection && (
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">AI Content Detection</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>AI Likelihood:</span>
                  <span className={clsx('font-medium', 
                    analysis.ai_content_detection.likelihood_ai_generated > 50 
                      ? 'text-red-600' : 'text-green-600'
                  )}>
                    {analysis.ai_content_detection.likelihood_ai_generated}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {analysis.ai_content_detection.reasoning}
                </p>
              </div>
            </div>
          )}

          {/* Engagement Level */}
          {analysis.engagement_level && (
            <div className="bg-white p-6 rounded-lg border">
              <h4 className="font-semibold text-gray-900 mb-3">Engagement Level</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Score:</span>
                  <span className={clsx('font-medium', getScoreColor(analysis.engagement_level.score))}>
                    {analysis.engagement_level.score}/100
                  </span>
                </div>
                {analysis.engagement_level.engaging_elements?.length > 0 && (
                  <div>
                    <p className="text-sm font-medium text-gray-700">Strengths:</p>
                    <ul className="text-sm text-gray-600 list-disc list-inside mt-1">
                      {analysis.engagement_level.engaging_elements.slice(0, 2).map((element, idx) => (
                        <li key={idx}>{element}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Actionable Feedback */}
        {analysis.actionable_feedback && (
          <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-3">Next Steps</h4>
            <div className="space-y-4">
              {analysis.actionable_feedback.top_priorities && (
                <div>
                  <p className="text-sm font-medium text-blue-800 mb-2">Top Priorities:</p>
                  <ul className="text-sm text-blue-700 list-disc list-inside space-y-1">
                    {analysis.actionable_feedback.top_priorities.map((priority, idx) => (
                      <li key={idx}>{priority}</li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.actionable_feedback.encouragement && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-800">
                    <strong>Encouragement:</strong> {analysis.actionable_feedback.encouragement}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center mb-4">
            <Link
              to="/submissions"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeftIcon className="h-5 w-5 mr-1" />
              Back to Submissions
            </Link>
          </div>
          
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {submission.title}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center">
                  <UserIcon className="h-4 w-4 mr-1" />
                  {submission.student?.name}
                  {submission.student?.grade && ` (${submission.student.grade})`}
                </div>
                <div className="flex items-center">
                  <CalendarIcon className="h-4 w-4 mr-1" />
                  Created {formatDate(submission.createdAt)}
                </div>
                <div className="flex items-center">
                  <DocumentTextIcon className="h-4 w-4 mr-1" />
                  {submission.content?.length || 0} characters
                </div>
              </div>
            </div>
            
            <div className="mt-4 sm:mt-0 flex flex-col sm:flex-row gap-2">
              <span className={clsx(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                getStageColor(submission.currentStage)
              )}>
                {formatStage(submission.currentStage)}
              </span>
              
              {canTriggerAnalysis() && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => triggerAnalysisMutation.mutate()}
                  disabled={triggerAnalysisMutation.isLoading}
                >
                  {triggerAnalysisMutation.isLoading ? (
                    <LoadingSpinner size="sm" className="mr-1" />
                  ) : (
                    <BeakerIcon className="h-4 w-4 mr-1" />
                  )}
                  Re-analyze
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Content */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Content</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFullContent(!showFullContent)}
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {showFullContent ? 'Show Less' : 'Show Full'}
                </Button>
              </div>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-gray-700 bg-gray-50 p-4 rounded-md">
                  {showFullContent 
                    ? submission.content 
                    : `${submission.content?.substring(0, 500)}${submission.content?.length > 500 ? '...' : ''}`
                  }
                </div>
              </div>
            </div>

            {/* AI Analysis Results */}
            {submission.analysisResult && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Analysis Results</h3>
                <AnalysisResults analysis={submission.analysisResult} />
              </div>
            )}

            {!submission.analysisResult && submission.currentStage === 'ANALYSIS' && (
              <div className="bg-blue-50 p-6 rounded-lg border border-blue-200">
                <div className="flex items-center">
                  <ClockIcon className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h3 className="text-sm font-medium text-blue-900">Analysis in Progress</h3>
                    <p className="text-sm text-blue-700 mt-1">
                      AI analysis is currently running. Results will appear here once complete.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* File Management Section */}
            <div className="bg-white p-6 rounded-lg border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Files & Attachments</h3>
                {canUploadFiles() && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowFileUpload(!showFileUpload)}
                  >
                    <CloudArrowUpIcon className="h-4 w-4 mr-1" />
                    {showFileUpload ? 'Hide Upload' : 'Upload File'}
                  </Button>
                )}
              </div>
              
              {/* File Manager */}
              <FileManager 
                submissionId={submission.id} 
                allowUploads={canUploadFiles()}
              />
              
              {/* File Upload Section */}
              {showFileUpload && canUploadFiles() && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      File Type
                    </label>
                    <select
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                      value={selectedFileType}
                      onChange={(e) => setSelectedFileType(e.target.value)}
                    >
                      <option value="ATTACHMENT">Attachment</option>
                      <option value="SUBMISSION_CONTENT">Submission Content</option>
                      <option value="PDF_SOFT_COPY">PDF Soft Copy</option>
                      <option value="COVER_DESIGN">Cover Design</option>
                    </select>
                    <p className="mt-1 text-xs text-gray-500">
                      Choose the appropriate category for your file
                    </p>
                  </div>
                  
                  <FileUpload
                    submissionId={submission.id}
                    fileType={selectedFileType}
                    accept={getAcceptedFileTypes(selectedFileType)}
                    onUploadComplete={handleFileUploadComplete}
                    className="border-2 border-dashed border-gray-300 rounded-lg p-4"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Workflow Progress */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Progress</h3>
              <div className="space-y-3">
                {submission.workflowStages?.map((stage, index) => (
                  <div key={stage.id} className="flex items-start">
                    <div className="flex-shrink-0 mr-3 mt-1">
                      {stage.status === 'completed' ? (
                        <CheckCircleIcon className="h-5 w-5 text-green-500" />
                      ) : stage.status === 'in_progress' ? (
                        <ClockIcon className="h-5 w-5 text-blue-500" />
                      ) : (
                        <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">
                        {formatStage(stage.stageName)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {stage.status === 'completed' && stage.completedAt && 
                          `Completed ${formatDate(stage.completedAt)}`}
                        {stage.status === 'in_progress' && stage.startedAt && 
                          `Started ${formatDate(stage.startedAt)}`}
                        {stage.status === 'pending' && 'Pending'}
                      </div>
                      {stage.notes && (
                        <div className="text-xs text-gray-600 mt-1">
                          {stage.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignment Info */}
            <div className="bg-white p-6 rounded-lg border">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment</h3>
              <div className="space-y-3">
                <div>
                  <div className="text-sm font-medium text-gray-900">Student</div>
                  <div className="text-sm text-gray-600">
                    {submission.student?.name}
                    {submission.student?.email && (
                      <div className="text-xs">{submission.student.email}</div>
                    )}
                  </div>
                </div>
                
                {submission.editor && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Editor</div>
                    <div className="text-sm text-gray-600">
                      {submission.editor.name}
                      <div className="text-xs">{submission.editor.email}</div>
                    </div>
                  </div>
                )}
                
                {submission.plagiarismScore !== null && (
                  <div>
                    <div className="text-sm font-medium text-gray-900">Plagiarism Score</div>
                    <div className={clsx(
                      'text-sm font-medium',
                      submission.plagiarismScore > 20 ? 'text-red-600' : 'text-green-600'
                    )}>
                      {submission.plagiarismScore}%
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {canUpdateStage() && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Actions</h3>
                <div className="space-y-3">
                  <select
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                    value={submission.currentStage}
                    onChange={(e) => {
                      if (window.confirm('Are you sure you want to update the stage?')) {
                        updateStageMutation.mutate({ 
                          stage: e.target.value, 
                          notes: `Stage updated by ${user.name}` 
                        });
                      }
                    }}
                    disabled={updateStageMutation.isLoading}
                  >
                    <option value="ANALYSIS">Analysis</option>
                    <option value="PLAGIARISM_REVIEW">Plagiarism Review</option>
                    <option value="EDITOR_MEETING">Editor Meeting</option>
                    <option value="APPROVAL_PROCESS">Approval Process</option>
                    <option value="PDF_REVIEW">PDF Review</option>
                    <option value="COVER_APPROVAL">Cover Approval</option>
                    <option value="EVENT_PLANNING">Event Planning</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>
              </div>
            )}

            {/* Events */}
            {submission.events?.length > 0 && (
              <div className="bg-white p-6 rounded-lg border">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Related Events</h3>
                <div className="space-y-2">
                  {submission.events.map((event) => (
                    <div key={event.id} className="p-3 bg-gray-50 rounded">
                      <div className="text-sm font-medium text-gray-900">{event.title}</div>
                      <div className="text-xs text-gray-500">
                        {formatDate(event.eventDate)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubmissionDetails;

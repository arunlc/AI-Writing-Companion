// src/pages/reviews/ReviewQueue.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { submissionsAPI, reviewsAPI } from '../../services/api';
import {
  ClipboardDocumentCheckIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  ChatBubbleBottomCenterTextIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const ReviewQueue = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [reviewData, setReviewData] = useState({
    plagiarismScore: '',
    plagiarismNotes: '',
    passed: null
  });
  const [filters, setFilters] = useState({
    search: '',
    priority: ''
  });

  // Fetch submissions pending review
  const { data: submissionsResponse, isLoading, error } = useQuery(
    ['review-queue', filters],
    () => submissionsAPI.getAll({
      stage: 'PLAGIARISM_REVIEW',
      ...filters
    }),
    {
      refetchInterval: 30000, // Refresh every 30 seconds
      staleTime: 10000
    }
  );

  // Submit review mutation
  const submitReviewMutation = useMutation(
    ({ submissionId, reviewData }) => reviewsAPI.submit(submissionId, reviewData),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['review-queue']);
        setSelectedSubmission(null);
        setReviewData({
          plagiarismScore: '',
          plagiarismNotes: '',
          passed: null
        });
        toast.success('Review submitted successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to submit review');
      }
    }
  );

  // Move to next stage mutation
  const moveToNextStageMutation = useMutation(
    ({ submissionId, notes }) => submissionsAPI.updateStage(submissionId, 'EDITOR_MEETING', notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['review-queue']);
        toast.success('Submission moved to editor meeting stage');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to move submission');
      }
    }
  );

  const submissions = submissionsResponse?.data?.submissions || [];

  const handleSubmitReview = (submissionId, passed) => {
    const plagiarismScore = parseInt(reviewData.plagiarismScore);
    
    if (isNaN(plagiarismScore) || plagiarismScore < 0 || plagiarismScore > 100) {
      toast.error('Please enter a valid plagiarism score (0-100)');
      return;
    }

    if (!reviewData.plagiarismNotes.trim()) {
      toast.error('Please provide review notes');
      return;
    }

    const reviewPayload = {
      plagiarismScore,
      plagiarismNotes: reviewData.plagiarismNotes.trim(),
      passed,
      reviewedBy: user.id
    };

    submitReviewMutation.mutate({ submissionId, reviewData: reviewPayload });

    // If passed, also move to next stage
    if (passed) {
      setTimeout(() => {
        moveToNextStageMutation.mutate({
          submissionId,
          notes: `Plagiarism review completed. Score: ${plagiarismScore}%. ${reviewData.plagiarismNotes}`
        });
      }, 1000);
    }
  };

  const getScoreColor = (score) => {
    if (score <= 10) return 'text-green-600 bg-green-50';
    if (score <= 20) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getPriorityColor = (createdAt) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated >= 3) return 'text-red-600';
    if (daysSinceCreated >= 1) return 'text-yellow-600';
    return 'text-green-600';
  };

  const getPriorityLabel = (createdAt) => {
    const daysSinceCreated = Math.floor((Date.now() - new Date(createdAt)) / (1000 * 60 * 60 * 24));
    if (daysSinceCreated >= 3) return 'High Priority';
    if (daysSinceCreated >= 1) return 'Medium Priority';
    return 'Normal';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({ search: '', priority: '' });
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
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Error loading review queue</h3>
                <p className="mt-1 text-sm text-red-700">{error.message}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Plagiarism Review Queue</h1>
            <p className="mt-1 text-sm text-gray-500">
              {submissions.length} submissions pending review
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex items-center space-x-2">
            <div className="flex items-center text-sm text-gray-600">
              <ClockIcon className="h-4 w-4 mr-1" />
              Auto-refresh every 30s
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 bg-white p-4 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search submissions..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={filters.priority}
                onChange={(e) => handleFilterChange('priority', e.target.value)}
              >
                <option value="">All Priorities</option>
                <option value="high">High Priority (3+ days)</option>
                <option value="medium">Medium Priority (1-2 days)</option>
                <option value="normal">Normal (&lt; 1 day)</option>
              </select>
              <Button variant="secondary" onClick={clearFilters}>
                <FunnelIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Submissions List */}
          <div className="lg:col-span-2">
            <div className="bg-white shadow rounded-lg overflow-hidden">
              {submissions.length > 0 ? (
                <div className="divide-y divide-gray-200">
                  {submissions.map((submission) => {
                    const daysSinceCreated = Math.floor((Date.now() - new Date(submission.createdAt)) / (1000 * 60 * 60 * 24));
                    const isSelected = selectedSubmission?.id === submission.id;
                    
                    return (
                      <div
                        key={submission.id}
                        className={clsx(
                          'p-6 hover:bg-gray-50 cursor-pointer transition-colors',
                          isSelected && 'bg-blue-50 border-l-4 border-blue-500'
                        )}
                        onClick={() => setSelectedSubmission(submission)}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">
                                {submission.title}
                              </h3>
                              <span className={clsx(
                                'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                                getPriorityColor(submission.createdAt) === 'text-red-600' && 'bg-red-100 text-red-800',
                                getPriorityColor(submission.createdAt) === 'text-yellow-600' && 'bg-yellow-100 text-yellow-800',
                                getPriorityColor(submission.createdAt) === 'text-green-600' && 'bg-green-100 text-green-800'
                              )}>
                                {getPriorityLabel(submission.createdAt)}
                              </span>
                            </div>
                            
                            <div className="space-y-1 text-sm text-gray-600">
                              <div className="flex items-center">
                                <span className="font-medium">Student:</span>
                                <span className="ml-1">{submission.student?.name}</span>
                                {submission.student?.grade && (
                                  <span className="ml-1 text-gray-500">({submission.student.grade})</span>
                                )}
                              </div>
                              
                              <div className="flex items-center">
                                <span className="font-medium">Submitted:</span>
                                <span className="ml-1">{formatDate(submission.createdAt)}</span>
                                <span className="ml-1 text-gray-500">
                                  ({daysSinceCreated === 0 ? 'today' : `${daysSinceCreated} days ago`})
                                </span>
                              </div>
                              
                              <div className="flex items-center">
                                <span className="font-medium">Word count:</span>
                                <span className="ml-1">
                                  {submission.content?.split(/\s+/).filter(word => word.length > 0).length || 0} words
                                </span>
                              </div>

                              {submission.analysisResult?.overall_score && (
                                <div className="flex items-center">
                                  <span className="font-medium">AI Score:</span>
                                  <span className={clsx(
                                    'ml-1 font-medium',
                                    submission.analysisResult.overall_score >= 80 ? 'text-green-600' :
                                    submission.analysisResult.overall_score >= 60 ? 'text-yellow-600' : 'text-red-600'
                                  )}>
                                    {submission.analysisResult.overall_score}/100
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col items-end space-y-2">
                            <Button
                              size="sm"
                              variant={isSelected ? 'primary' : 'secondary'}
                            >
                              <EyeIcon className="h-4 w-4 mr-1" />
                              {isSelected ? 'Selected' : 'Review'}
                            </Button>
                            
                            <Link
                              to={`/submissions/${submission.id}`}
                              className="text-xs text-primary-600 hover:text-primary-700"
                            >
                              View Full Details →
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions to review</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    All submissions have been reviewed or none are pending.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Review Panel */}
          <div className="lg:col-span-1">
            {selectedSubmission ? (
              <div className="bg-white shadow rounded-lg overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Review Submission</h3>
                  <p className="text-sm text-gray-600">{selectedSubmission.title}</p>
                </div>
                
                <div className="p-6 space-y-6">
                  {/* Content Preview */}
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Content Preview</h4>
                    <div className="bg-gray-50 p-3 rounded-md text-sm text-gray-700 max-h-40 overflow-y-auto">
                      {selectedSubmission.content?.substring(0, 300)}
                      {selectedSubmission.content?.length > 300 && '...'}
                    </div>
                    <Link
                      to={`/submissions/${selectedSubmission.id}`}
                      className="text-xs text-primary-600 hover:text-primary-700 mt-1 inline-block"
                    >
                      Read full content →
                    </Link>
                  </div>

                  {/* AI Analysis Summary */}
                  {selectedSubmission.analysisResult && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-900 mb-2">AI Analysis Summary</h4>
                      <div className="bg-blue-50 p-3 rounded-md text-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span>Overall Score:</span>
                          <span className="font-medium">
                            {selectedSubmission.analysisResult.overall_score}/100
                          </span>
                        </div>
                        
                        {selectedSubmission.analysisResult.ai_content_detection && (
                          <div className="flex justify-between items-center mb-2">
                            <span>AI Likelihood:</span>
                            <span className={clsx(
                              'font-medium',
                              selectedSubmission.analysisResult.ai_content_detection.likelihood_ai_generated > 50 
                                ? 'text-red-600' : 'text-green-600'
                            )}>
                              {selectedSubmission.analysisResult.ai_content_detection.likelihood_ai_generated}%
                            </span>
                          </div>
                        )}

                        {selectedSubmission.analysisResult.grammar_analysis && (
                          <div className="flex justify-between items-center">
                            <span>Grammar Score:</span>
                            <span className="font-medium">
                              {selectedSubmission.analysisResult.grammar_analysis.score}/100
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Review Form */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Plagiarism Score (0-100)
                      </label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        value={reviewData.plagiarismScore}
                        onChange={(e) => setReviewData({...reviewData, plagiarismScore: e.target.value})}
                        placeholder="Enter score (e.g., 15)"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        0-10: Excellent, 11-20: Good, 21+: Needs attention
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Review Notes
                      </label>
                      <textarea
                        rows={4}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                        value={reviewData.plagiarismNotes}
                        onChange={(e) => setReviewData({...reviewData, plagiarismNotes: e.target.value})}
                        placeholder="Provide detailed notes about plagiarism check, sources found, recommendations..."
                      />
                    </div>

                    {/* Decision Buttons */}
                    <div className="space-y-3">
                      <Button
                        variant="success"
                        className="w-full"
                        onClick={() => handleSubmitReview(selectedSubmission.id, true)}
                        disabled={submitReviewMutation.isLoading || !reviewData.plagiarismScore || !reviewData.plagiarismNotes.trim()}
                      >
                        {submitReviewMutation.isLoading ? (
                          <LoadingSpinner size="sm" className="mr-2" />
                        ) : (
                          <CheckCircleIcon className="h-4 w-4 mr-2" />
                        )}
                        Approve & Move to Editor
                      </Button>
                      
                      <Button
                        variant="danger"
                        className="w-full"
                        onClick={() => handleSubmitReview(selectedSubmission.id, false)}
                        disabled={submitReviewMutation.isLoading || !reviewData.plagiarismScore || !reviewData.plagiarismNotes.trim()}
                      >
                        <XCircleIcon className="h-4 w-4 mr-2" />
                        Flag for Attention
                      </Button>
                    </div>

                    <div className="text-xs text-gray-500 space-y-1">
                      <p>• <strong>Approve:</strong> Moves to editor meeting stage</p>
                      <p>• <strong>Flag:</strong> Requires additional review or student contact</p>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white shadow rounded-lg">
                <div className="p-6 text-center">
                  <ClipboardDocumentCheckIcon className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Select a Submission</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Choose a submission from the list to begin your review.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Review Guidelines */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-4">Review Guidelines</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-blue-800">
            <div>
              <h4 className="font-medium mb-2">Plagiarism Score Guidelines:</h4>
              <ul className="space-y-1">
                <li>• <strong>0-10%:</strong> Original work, proceed to editor</li>
                <li>• <strong>11-20%:</strong> Acceptable with proper citations</li>
                <li>• <strong>21-30%:</strong> Needs review and guidance</li>
                <li>• <strong>31%+:</strong> Significant concern, flag for attention</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">What to Check:</h4>
              <ul className="space-y-1">
                <li>• Direct copying from online sources</li>
                <li>• Proper citation of referenced material</li>
                <li>• AI-generated content patterns</li>
                <li>• Student's original voice and style</li>
                <li>• Academic integrity compliance</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewQueue;

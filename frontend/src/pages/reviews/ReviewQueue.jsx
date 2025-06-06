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

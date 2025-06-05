import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { submissionsAPI } from '../../services/api';
import {
  DocumentTextIcon,
  PlusIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  FunnelIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';

const SubmissionsList = () => {
  const { user } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({
    stage: '',
    status: '',
    search: ''
  });

  const { data, isLoading, error } = useQuery(
    ['submissions', currentPage, filters],
    () => submissionsAPI.getAll({
      page: currentPage,
      limit: 10,
      stage: filters.stage || undefined,
      status: filters.status || undefined,
      search: filters.search || undefined
    }),
    {
      keepPreviousData: true,
      staleTime: 30000
    }
  );

  const getStageColor = (stage) => {
    const colors = {
      ANALYSIS: 'bg-blue-100 text-blue-800',
      PLAGIARISM_REVIEW: 'bg-yellow-100 text-yellow-800',
      EDITOR_MEETING: 'bg-purple-100 text-purple-800',
      APPROVAL_PROCESS: 'bg-orange-100 text-orange-800',
      PDF_REVIEW: 'bg-indigo-100 text-indigo-800',
      COVER_APPROVAL: 'bg-pink-100 text-pink-800',
      EVENT_PLANNING: 'bg-green-100 text-green-800',
      COMPLETED: 'bg-gray-100 text-gray-800'
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  const getStageIcon = (stage) => {
    const icons = {
      ANALYSIS: ClockIcon,
      PLAGIARISM_REVIEW: ExclamationTriangleIcon,
      EDITOR_MEETING: DocumentTextIcon,
      APPROVAL_PROCESS: ClockIcon,
      PDF_REVIEW: DocumentTextIcon,
      COVER_APPROVAL: DocumentTextIcon,
      EVENT_PLANNING: ClockIcon,
      COMPLETED: CheckCircleIcon
    };
    const Icon = icons[stage] || ClockIcon;
    return <Icon className="h-4 w-4" />;
  };

  const formatStage = (stage) => {
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({ stage: '', status: '', search: '' });
    setCurrentPage(1);
  };

  if (isLoading && !data) {
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
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading submissions</h3>
              <p className="mt-1 text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const submissions = data?.data?.submissions || [];
  const pagination = data?.data?.pagination || {};

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {user?.role === 'STUDENT' ? 'My Submissions' : 'Submissions'}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {pagination.total ? `${pagination.total} total submissions` : 'No submissions found'}
            </p>
          </div>
          {user?.role === 'STUDENT' && (
            <div className="mt-4 sm:mt-0">
              <Link to="/submissions/new">
                <Button>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  New Submission
                </Button>
              </Link>
            </div>
          )}
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
                value={filters.stage}
                onChange={(e) => handleFilterChange('stage', e.target.value)}
              >
                <option value="">All Stages</option>
                <option value="ANALYSIS">Analysis</option>
                <option value="PLAGIARISM_REVIEW">Plagiarism Review</option>
                <option value="EDITOR_MEETING">Editor Meeting</option>
                <option value="APPROVAL_PROCESS">Approval Process</option>
                <option value="PDF_REVIEW">PDF Review</option>
                <option value="COVER_APPROVAL">Cover Approval</option>
                <option value="EVENT_PLANNING">Event Planning</option>
                <option value="COMPLETED">Completed</option>
              </select>
              <select
                className="px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                value={filters.status}
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="archived">Archived</option>
              </select>
              <Button variant="secondary" onClick={clearFilters}>
                <FunnelIcon className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {submissions.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Stage
                      </th>
                      {user?.role !== 'STUDENT' && (
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Student
                        </th>
                      )}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Updated
                      </th>
                      <th className="relative px-6 py-3">
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {submissions.map((submission) => (
                      <tr key={submission.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {submission.title}
                              </div>
                              {submission.isArchived && (
                                <div className="text-xs text-gray-500">Archived</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={clsx(
                            'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                            getStageColor(submission.currentStage)
                          )}>
                            {getStageIcon(submission.currentStage)}
                            <span className="ml-1">{formatStage(submission.currentStage)}</span>
                          </span>
                        </td>
                        {user?.role !== 'STUDENT' && (
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {submission.student?.name}
                            {submission.student?.grade && (
                              <div className="text-xs text-gray-500">{submission.student.grade}</div>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(submission.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(submission.updatedAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <Link
                            to={`/submissions/${submission.id}`}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            View Details
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                      disabled={currentPage === pagination.totalPages}
                    >
                      Next
                    </Button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing{' '}
                        <span className="font-medium">
                          {(currentPage - 1) * pagination.limit + 1}
                        </span>{' '}
                        to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * pagination.limit, pagination.total)}
                        </span>{' '}
                        of{' '}
                        <span className="font-medium">{pagination.total}</span>{' '}
                        results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Previous
                        </button>
                        <button
                          onClick={() => setCurrentPage(prev => Math.min(prev + 1, pagination.totalPages))}
                          disabled={currentPage === pagination.totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No submissions found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {filters.search || filters.stage || filters.status
                  ? 'Try adjusting your search criteria.'
                  : user?.role === 'STUDENT'
                  ? 'Get started by creating your first submission.'
                  : 'No submissions have been created yet.'
                }
              </p>
              {user?.role === 'STUDENT' && !filters.search && !filters.stage && !filters.status && (
                <div className="mt-6">
                  <Link to="/submissions/new">
                    <Button>
                      <PlusIcon className="h-5 w-5 mr-2" />
                      New Submission
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionsList;

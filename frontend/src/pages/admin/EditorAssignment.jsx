// frontend/src/pages/admin/EditorAssignment.jsx - NEW FILE
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { submissionsAPI, usersAPI } from '../../services/api';
import {
  UserGroupIcon,
  DocumentTextIcon,
  PlusIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const EditorAssignment = () => {
  const queryClient = useQueryClient();
  const [selectedSubmissions, setSelectedSubmissions] = useState([]);
  const [selectedEditor, setSelectedEditor] = useState('');
  const [assignmentNotes, setAssignmentNotes] = useState('');
  const [showBulkAssign, setShowBulkAssign] = useState(false);

  // Fetch unassigned submissions
  const { data: unassignedResponse, isLoading: loadingSubmissions } = useQuery(
    'unassigned-submissions',
    submissionsAPI.getUnassigned,
    {
      refetchInterval: 30000,
      staleTime: 10000
    }
  );

  // Fetch available editors
  const { data: editorsResponse, isLoading: loadingEditors } = useQuery(
    'editors-list',
    () => usersAPI.getAll({ role: 'EDITOR', isActive: true }),
    {
      staleTime: 60000
    }
  );

  // Fetch editor workload
  const { data: workloadResponse, isLoading: loadingWorkload } = useQuery(
    'editor-workload',
    submissionsAPI.getEditorWorkload,
    {
      refetchInterval: 60000,
      staleTime: 30000
    }
  );

  // Assign editor mutation
  const assignEditorMutation = useMutation(
    ({ submissionId, editorId, notes }) => submissionsAPI.assignEditor(submissionId, editorId, notes),
    {
      onSuccess: (data, variables) => {
        queryClient.invalidateQueries(['unassigned-submissions']);
        queryClient.invalidateQueries(['editor-workload']);
        queryClient.invalidateQueries(['submissions']);
        
        const editor = editors.find(e => e.id === variables.editorId);
        toast.success(`Assigned to ${editor?.name || 'editor'} successfully`);
        
        // Clear selection if it was a single assignment
        if (selectedSubmissions.length === 1) {
          setSelectedSubmissions([]);
        }
      },
      onError: (error) => {
        console.error('Assignment error:', error);
        toast.error(error.response?.data?.error || 'Failed to assign editor');
      }
    }
  );

  const submissions = unassignedResponse?.data?.submissions || [];
  const editors = editorsResponse?.data?.users || [];
  const workload = workloadResponse?.data?.editors || [];

  const handleSubmissionSelect = (submissionId) => {
    setSelectedSubmissions(prev => 
      prev.includes(submissionId)
        ? prev.filter(id => id !== submissionId)
        : [...prev, submissionId]
    );
  };

  const handleSingleAssign = (submissionId, editorId) => {
    const editor = editors.find(e => e.id === editorId);
    const submission = submissions.find(s => s.id === submissionId);
    
    if (window.confirm(`Assign "${submission?.title}" to ${editor?.name}?`)) {
      assignEditorMutation.mutate({
        submissionId,
        editorId,
        notes: `Assigned by admin on ${new Date().toLocaleDateString()}`
      });
    }
  };

  const handleBulkAssign = () => {
    if (!selectedEditor || selectedSubmissions.length === 0) {
      toast.error('Please select an editor and at least one submission');
      return;
    }

    const editor = editors.find(e => e.id === selectedEditor);
    const count = selectedSubmissions.length;
    
    if (window.confirm(`Assign ${count} submission${count > 1 ? 's' : ''} to ${editor?.name}?`)) {
      // Assign each submission sequentially
      selectedSubmissions.forEach((submissionId, index) => {
        setTimeout(() => {
          assignEditorMutation.mutate({
            submissionId,
            editorId: selectedEditor,
            notes: assignmentNotes || `Bulk assigned by admin on ${new Date().toLocaleDateString()}`
          });
        }, index * 500); // Stagger requests to avoid overwhelming the server
      });
      
      setSelectedSubmissions([]);
      setSelectedEditor('');
      setAssignmentNotes('');
      setShowBulkAssign(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStageColor = (stage) => {
    const colors = {
      ANALYSIS: 'bg-blue-100 text-blue-800',
      PLAGIARISM_REVIEW: 'bg-yellow-100 text-yellow-800',
      EDITOR_MEETING: 'bg-purple-100 text-purple-800',
    };
    return colors[stage] || 'bg-gray-100 text-gray-800';
  };

  if (loadingSubmissions || loadingEditors) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
          <span className="ml-3 text-gray-600">Loading assignment data...</span>
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
            <h1 className="text-2xl font-bold text-gray-900">Editor Assignment</h1>
            <p className="mt-1 text-sm text-gray-500">
              {submissions.length} unassigned submissions • {editors.length} available editors
            </p>
          </div>
          <div className="mt-4 sm:mt-0 flex space-x-3">
            {selectedSubmissions.length > 0 && (
              <Button
                variant="secondary"
                onClick={() => setShowBulkAssign(!showBulkAssign)}
              >
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Bulk Assign ({selectedSubmissions.length})
              </Button>
            )}
          </div>
        </div>

        {/* Editor Workload Summary */}
        {!loadingWorkload && workload.length > 0 && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Editor Workload</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {workload.map((editor) => (
                <div key={editor.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{editor.name}</h4>
                    <span className={clsx(
                      'px-2 py-1 text-xs font-medium rounded-full',
                      editor.activeSubmissions === 0 
                        ? 'bg-green-100 text-green-800'
                        : editor.activeSubmissions <= 3
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    )}>
                      {editor.activeSubmissions} active
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{editor.email}</p>
                  {editor.activeSubmissions > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      Latest: {editor.submissions[0]?.title?.substring(0, 30)}...
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bulk Assignment Form */}
        {showBulkAssign && selectedSubmissions.length > 0 && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-blue-900 mb-4">
              Bulk Assign {selectedSubmissions.length} Submission{selectedSubmissions.length > 1 ? 's' : ''}
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Editor
                </label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={selectedEditor}
                  onChange={(e) => setSelectedEditor(e.target.value)}
                >
                  <option value="">Choose an editor...</option>
                  {editors.map((editor) => {
                    const workloadInfo = workload.find(w => w.id === editor.id);
                    return (
                      <option key={editor.id} value={editor.id}>
                        {editor.name} ({workloadInfo?.activeSubmissions || 0} active)
                      </option>
                    );
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Assignment Notes (Optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Add notes for this assignment..."
                  value={assignmentNotes}
                  onChange={(e) => setAssignmentNotes(e.target.value)}
                />
              </div>
            </div>
            
            <div className="mt-4 flex space-x-3">
              <Button
                onClick={handleBulkAssign}
                disabled={!selectedEditor || assignEditorMutation.isLoading}
              >
                {assignEditorMutation.isLoading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Assigning...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="h-4 w-4 mr-2" />
                    Assign All
                  </>
                )}
              </Button>
              <Button
                variant="secondary"
                onClick={() => {
                  setShowBulkAssign(false);
                  setSelectedSubmissions([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Unassigned Submissions */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Unassigned Submissions</h3>
          </div>
          
          {submissions.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        checked={selectedSubmissions.length === submissions.length}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSubmissions(submissions.map(s => s.id));
                          } else {
                            setSelectedSubmissions([]);
                          }
                        }}
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Submission
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Quick Assign
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
                        <input
                          type="checkbox"
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                          checked={selectedSubmissions.includes(submission.id)}
                          onChange={() => handleSubmissionSelect(submission.id)}
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <DocumentTextIcon className="h-5 w-5 text-gray-400 mr-3" />
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {submission.title}
                            </div>
                            <div className="text-xs text-gray-500">
                              {submission.content?.substring(0, 100)}...
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{submission.student?.name}</div>
                        <div className="text-xs text-gray-500">
                          {submission.student?.grade && `${submission.student.grade} • `}
                          {submission.student?.email}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={clsx(
                          'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium',
                          getStageColor(submission.currentStage)
                        )}>
                          {submission.currentStage.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(submission.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) {
                              handleSingleAssign(submission.id, e.target.value);
                              e.target.value = ''; // Reset select
                            }
                          }}
                        >
                          <option value="">Assign to...</option>
                          {editors.map((editor) => {
                            const workloadInfo = workload.find(w => w.id === editor.id);
                            return (
                              <option key={editor.id} value={editor.id}>
                                {editor.name} ({workloadInfo?.activeSubmissions || 0})
                              </option>
                            );
                          })}
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <a
                          href={`/submissions/${submission.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircleIcon className="mx-auto h-12 w-12 text-green-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">All submissions assigned!</h3>
              <p className="mt-1 text-sm text-gray-500">
                Every submission has been assigned to an editor.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorAssignment;

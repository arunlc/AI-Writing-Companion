// src/components/files/FileManager.jsx
import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { filesAPI } from '../../services/api';
import {
  DocumentIcon,
  PhotoIcon,
  ArrowDownTrayIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  EyeIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const FileManager = ({ submissionId, allowUploads = true }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedFileType, setSelectedFileType] = useState('all');

  // Fetch files for submission
  const { data: filesResponse, isLoading, error } = useQuery(
    ['files', submissionId],
    () => filesAPI.getBySubmission(submissionId),
    {
      enabled: !!submissionId,
      staleTime: 30000
    }
  );

  // Download file mutation
  const downloadMutation = useMutation(filesAPI.getDownloadUrl, {
    onSuccess: (data) => {
      // Create temporary link and trigger download
      const link = document.createElement('a');
      link.href = data.data.downloadUrl;
      link.download = data.data.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      toast.success('Download started');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Download failed');
    }
  });

  // Delete file mutation
  const deleteMutation = useMutation(filesAPI.delete, {
    onSuccess: () => {
      queryClient.invalidateQueries(['files', submissionId]);
      toast.success('File deleted successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to delete file');
    }
  });

  // Approve file mutation
  const approveMutation = useMutation(
    ({ fileId, approved, notes }) => filesAPI.approve(fileId, approved, notes),
    {
      onSuccess: () => {
        queryClient.invalidateQueries(['files', submissionId]);
        toast.success('File approval updated');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update approval');
      }
    }
  );

  const files = filesResponse?.data?.files || [];

  const handleDownload = (fileId) => {
    downloadMutation.mutate(fileId);
  };

  const handleDelete = (fileId, fileName) => {
    if (window.confirm(`Are you sure you want to delete "${fileName}"?`)) {
      deleteMutation.mutate(fileId);
    }
  };

  const handleApproval = (fileId, approved) => {
    const notes = approved ? 'Approved' : 'Requires revision';
    approveMutation.mutate({ fileId, approved, notes });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const getFileIcon = (mimeType) => {
    if (mimeType.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8 text-green-500" />;
    }
    return <DocumentIcon className="h-8 w-8 text-blue-500" />;
  };

  const getFileTypeColor = (fileType) => {
    const colors = {
      'SUBMISSION_CONTENT': 'bg-blue-100 text-blue-800',
      'PDF_SOFT_COPY': 'bg-purple-100 text-purple-800',
      'COVER_DESIGN': 'bg-pink-100 text-pink-800',
      'ATTACHMENT': 'bg-gray-100 text-gray-800'
    };
    return colors[fileType] || 'bg-gray-100 text-gray-800';
  };

  const getFileTypeLabel = (fileType) => {
    const labels = {
      'SUBMISSION_CONTENT': 'Content',
      'PDF_SOFT_COPY': 'PDF',
      'COVER_DESIGN': 'Cover',
      'ATTACHMENT': 'Attachment'
    };
    return labels[fileType] || fileType;
  };

  const getApprovalStatus = (isApproved) => {
    if (isApproved === null) {
      return {
        icon: <ClockIcon className="h-4 w-4 text-yellow-500" />,
        label: 'Pending',
        color: 'bg-yellow-100 text-yellow-800'
      };
    } else if (isApproved) {
      return {
        icon: <CheckCircleIcon className="h-4 w-4 text-green-500" />,
        label: 'Approved',
        color: 'bg-green-100 text-green-800'
      };
    } else {
      return {
        icon: <XCircleIcon className="h-4 w-4 text-red-500" />,
        label: 'Rejected',
        color: 'bg-red-100 text-red-800'
      };
    }
  };

  const canApproveFiles = () => {
    return ['ADMIN', 'OPERATIONS', 'EDITOR'].includes(user?.role);
  };

  const canDeleteFile = (file) => {
    return user?.role === 'ADMIN' || 
           user?.role === 'OPERATIONS' || 
           file.uploadedBy.id === user?.id;
  };

  const filteredFiles = selectedFileType === 'all' 
    ? files 
    : files.filter(file => file.fileType === selectedFileType);

  const fileTypes = ['all', ...new Set(files.map(file => file.fileType))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <LoadingSpinner size="md" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Failed to load files: {error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">File Attachments</h3>
          <p className="text-sm text-gray-600">
            {files.length} file{files.length !== 1 ? 's' : ''} uploaded
          </p>
        </div>

        {/* File Type Filter */}
        {fileTypes.length > 2 && (
          <div className="flex items-center space-x-2">
            <label className="text-sm font-medium text-gray-700">Filter:</label>
            <select
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:ring-primary-500 focus:border-primary-500"
              value={selectedFileType}
              onChange={(e) => setSelectedFileType(e.target.value)}
            >
              <option value="all">All Files</option>
              {fileTypes.filter(type => type !== 'all').map(type => (
                <option key={type} value={type}>
                  {getFileTypeLabel(type)}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Files List */}
      {filteredFiles.length > 0 ? (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="divide-y divide-gray-200">
            {filteredFiles.map((file) => {
              const approvalStatus = getApprovalStatus(file.isApproved);
              
              return (
                <div key={file.id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      {getFileIcon(file.mimeType)}
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {file.originalName}
                          </p>
                          
                          <span className={clsx(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            getFileTypeColor(file.fileType)
                          )}>
                            {getFileTypeLabel(file.fileType)}
                          </span>
                          
                          <span className={clsx(
                            'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium',
                            approvalStatus.color
                          )}>
                            {approvalStatus.icon}
                            <span className="ml-1">{approvalStatus.label}</span>
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-500 space-y-1">
                          <div className="flex items-center space-x-4">
                            <span>{formatFileSize(file.fileSize)}</span>
                            <span>•</span>
                            <span>Uploaded by {file.uploadedBy.name}</span>
                            <span>•</span>
                            <span>{formatDate(file.createdAt)}</span>
                          </div>
                          
                          {file.version > 1 && (
                            <div className="text-blue-600">
                              Version {file.version}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex items-center space-x-2">
                      {/* Download Button */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDownload(file.id)}
                        disabled={downloadMutation.isLoading}
                        title="Download file"
                      >
                        {downloadMutation.isLoading ? (
                          <LoadingSpinner size="sm" />
                        ) : (
                          <ArrowDownTrayIcon className="h-4 w-4" />
                        )}
                      </Button>
                      
                      {/* Approval Buttons (for authorized users) */}
                      {canApproveFiles() && file.isApproved === null && (
                        <>
                          <Button
                            size="sm"
                            variant="success"
                            onClick={() => handleApproval(file.id, true)}
                            disabled={approveMutation.isLoading}
                            title="Approve file"
                          >
                            <CheckCircleIcon className="h-4 w-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="danger"
                            onClick={() => handleApproval(file.id, false)}
                            disabled={approveMutation.isLoading}
                            title="Reject file"
                          >
                            <XCircleIcon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      
                      {/* Delete Button */}
                      {canDeleteFile(file) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(file.id, file.originalName)}
                          disabled={deleteMutation.isLoading}
                          title="Delete file"
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  {/* File Preview for Images */}
                  {file.mimeType.startsWith('image/') && (
                    <div className="mt-3 ml-11">
                      <div className="w-32 h-24 bg-gray-100 rounded-md overflow-hidden">
                        <img
                          src={`data:${file.mimeType};base64,preview`} // You'd need to implement preview generation
                          alt={file.originalName}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-8 bg-white border border-gray-200 rounded-lg">
          <FolderIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {selectedFileType === 'all' ? 'No files uploaded' : `No ${getFileTypeLabel(selectedFileType).toLowerCase()} files`}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {allowUploads 
              ? 'Files will appear here once uploaded.'
              : 'Files will be uploaded during the workflow process.'
            }
          </p>
        </div>
      )}
      
      {/* File Upload Guidelines */}
      {allowUploads && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">File Upload Guidelines</h4>
          <div className="text-xs text-blue-800 space-y-1">
            <p>• <strong>Submission Content:</strong> Original writing documents (DOC, DOCX, TXT)</p>
            <p>• <strong>PDF Soft Copy:</strong> Final formatted version for publication</p>
            <p>• <strong>Cover Design:</strong> Book cover artwork and design files</p>
            <p>• <strong>Attachments:</strong> Supporting materials, references, images</p>
            <p>• Maximum file size: 50MB per file</p>
            <p>• Supported formats: PDF, Word documents, text files, images</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileManager;

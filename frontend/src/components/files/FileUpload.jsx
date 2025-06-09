// frontend/src/components/files/FileUpload.jsx - FIXED VERSION
import React, { useState, useRef } from 'react';
import { useMutation, useQueryClient } from 'react-query';
import { filesAPI } from '../../services/api';
import {
  CloudArrowUpIcon,
  DocumentIcon,
  PhotoIcon,
  XMarkIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const FileUpload = ({ 
  submissionId, 
  fileType = 'ATTACHMENT', 
  onUploadComplete,
  accept = '',
  maxSize = 10 * 1024 * 1024, // 10MB limit
  multiple = false,
  className = ''
}) => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  // ✅ FIXED: Proper upload mutation with correct error handling
  const uploadMutation = useMutation(filesAPI.upload, {
    onSuccess: (data, variables) => {
      // Extract filename from FormData
      const file = variables.get('file');
      const fileName = file.name;
      
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { status: 'completed', progress: 100 }
      }));
      
      // Remove file from selected files after successful upload
      setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
      
      queryClient.invalidateQueries(['submission', submissionId]);
      queryClient.invalidateQueries(['files', submissionId]);
      
      toast.success(`File "${fileName}" uploaded successfully`);
      
      if (onUploadComplete) {
        onUploadComplete(data.data.file);
      }
    },
    onError: (error, variables) => {
      // Extract filename from FormData
      const file = variables.get('file');
      const fileName = file.name;
      
      setUploadProgress(prev => ({
        ...prev,
        [fileName]: { status: 'error', progress: 0 }
      }));
      
      // Better error message handling
      const errorData = error.response?.data;
      let errorMessage = 'Upload failed';
      
      if (errorData?.code === 'FILE_TOO_LARGE') {
        errorMessage = 'File too large. Maximum size is 10MB.';
      } else if (errorData?.code === 'INVALID_FILE_TYPE') {
        errorMessage = 'File type not allowed. Please check supported formats.';
      } else if (errorData?.code === 'UPLOAD_TIMEOUT') {
        errorMessage = 'Upload timeout. Please try with a smaller file.';
      } else if (errorData?.code === 'STORAGE_CONFIG_ERROR') {
        errorMessage = 'Storage configuration error. Please contact support.';
      } else if (errorData?.error) {
        errorMessage = errorData.error;
      }
      
      toast.error(`Failed to upload "${fileName}": ${errorMessage}`);
    }
  });

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(Array.from(e.target.files));
    }
  };

  const handleFiles = (files) => {
    console.log('📁 Processing selected files:', files.length);
    
    const validFiles = files.filter(file => {
      console.log('🔍 Validating file:', file.name, file.size, file.type);
      
      // Check file size
      if (file.size > maxSize) {
        toast.error(`File "${file.name}" is too large. Maximum size is ${formatFileSize(maxSize)}.`);
        return false;
      }
      
      if (file.size === 0) {
        toast.error(`File "${file.name}" is empty.`);
        return false;
      }
      
      // Check file type if accept prop is provided
      if (accept && !isFileTypeAccepted(file, accept)) {
        toast.error(`File type not allowed for "${file.name}".`);
        return false;
      }
      
      // Additional validation for common issues
      if (file.name.length > 255) {
        toast.error(`File name "${file.name}" is too long. Maximum 255 characters.`);
        return false;
      }
      
      // Check for potentially dangerous file extensions
      const dangerousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.vbs', '.js'];
      const fileExtension = '.' + file.name.split('.').pop().toLowerCase();
      if (dangerousExtensions.includes(fileExtension)) {
        toast.error(`File type "${fileExtension}" is not allowed for security reasons.`);
        return false;
      }
      
      return true;
    });

    if (multiple) {
      setSelectedFiles(prev => [...prev, ...validFiles]);
    } else {
      setSelectedFiles(validFiles.slice(0, 1));
    }
  };

  const isFileTypeAccepted = (file, acceptString) => {
    const acceptTypes = acceptString.split(',').map(type => type.trim());
    
    return acceptTypes.some(acceptType => {
      if (acceptType.startsWith('.')) {
        // File extension
        return file.name.toLowerCase().endsWith(acceptType.toLowerCase());
      } else if (acceptType.includes('*')) {
        // MIME type with wildcard
        const [type] = acceptType.split('/');
        return file.type.startsWith(type);
      } else {
        // Exact MIME type
        return file.type === acceptType;
      }
    });
  };

  // ✅ FIXED: Simplified upload function using the mutation directly
  const uploadAllFiles = async () => {
    console.log('📤 Starting batch upload for', selectedFiles.length, 'files');
    
    for (const file of selectedFiles) {
      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('submissionId', submissionId);
        formData.append('fileType', fileType);

        console.log('📤 Starting upload for:', file.name);

        setUploadProgress(prev => ({
          ...prev,
          [file.name]: { status: 'uploading', progress: 25 }
        }));

        // Use the mutation directly - no need for custom XMLHttpRequest
        await uploadMutation.mutateAsync(formData);
        
      } catch (error) {
        console.error('❌ Upload error for:', file.name, error);
        // Error handling is done in the mutation's onError callback
      }
    }
  };

  const removeFile = (fileName) => {
    setSelectedFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const newProgress = { ...prev };
      delete newProgress[fileName];
      return newProgress;
    });
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (file) => {
    if (file.type.startsWith('image/')) {
      return <PhotoIcon className="h-8 w-8 text-green-500" />;
    }
    return <DocumentIcon className="h-8 w-8 text-blue-500" />;
  };

  const getFileTypeLabel = (type) => {
    const labels = {
      'SUBMISSION_CONTENT': 'Submission Content',
      'PDF_SOFT_COPY': 'PDF Soft Copy',
      'COVER_DESIGN': 'Cover Design',
      'ATTACHMENT': 'Attachment'
    };
    return labels[type] || type;
  };

  const getProgressColor = (status, progress) => {
    switch (status) {
      case 'uploading':
        return 'bg-blue-600';
      case 'processing':
        return 'bg-yellow-600';
      case 'completed':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getProgressLabel = (status, progress) => {
    switch (status) {
      case 'uploading':
        return `Uploading... ${progress}%`;
      case 'processing':
        return 'Processing...';
      case 'completed':
        return 'Completed';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  return (
    <div className={clsx('w-full', className)}>
      {/* Upload Area */}
      <div
        className={clsx(
          'relative border-2 border-dashed rounded-lg p-6 text-center hover:bg-gray-50 transition-colors cursor-pointer',
          dragActive 
            ? 'border-primary-500 bg-primary-50' 
            : 'border-gray-300',
          selectedFiles.length > 0 && 'border-green-500 bg-green-50'
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={handleFileSelect}
          accept={accept}
          multiple={multiple}
        />
        
        <div className="flex flex-col items-center">
          <CloudArrowUpIcon className={clsx(
            'h-12 w-12 mb-4',
            dragActive ? 'text-primary-500' : 'text-gray-400'
          )} />
          
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {dragActive 
              ? 'Drop files here' 
              : `Upload ${getFileTypeLabel(fileType)}`
            }
          </h3>
          
          <p className="text-sm text-gray-600 mb-4">
            Drag and drop files here, or click to browse
          </p>
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>Maximum file size: {formatFileSize(maxSize)}</p>
            {accept && (
              <p>Allowed types: {accept.replace(/,/g, ', ')}</p>
            )}
            {multiple && <p>Multiple files allowed</p>}
            <p className="text-green-600">✅ Files upload to secure cloud storage</p>
          </div>
        </div>
      </div>

      {/* Selected Files */}
      {selectedFiles.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            Selected Files ({selectedFiles.length})
          </h4>
          
          <div className="space-y-3">
            {selectedFiles.map((file) => {
              const progress = uploadProgress[file.name];
              
              return (
                <div
                  key={file.name}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border"
                >
                  <div className="flex items-center space-x-3">
                    {getFileIcon(file)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.type || 'Unknown type'}
                      </p>
                      
                      {progress && (
                        <div className="mt-2">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-600">
                              {getProgressLabel(progress.status, progress.progress)}
                            </span>
                            {progress.status === 'uploading' && (
                              <span className="text-gray-600">{progress.progress}%</span>
                            )}
                          </div>
                          <div className="mt-1 w-full bg-gray-200 rounded-full h-2">
                            <div
                              className={clsx(
                                'h-2 rounded-full transition-all duration-300',
                                getProgressColor(progress.status, progress.progress)
                              )}
                              style={{ width: `${progress.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {progress?.status === 'uploading' && (
                      <LoadingSpinner size="sm" />
                    )}
                    
                    {progress?.status === 'completed' && (
                      <CheckCircleIcon className="h-5 w-5 text-green-500" />
                    )}
                    
                    {progress?.status === 'error' && (
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />
                    )}
                    
                    {!progress && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.name);
                        }}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Upload Button */}
          <div className="mt-4 flex justify-end space-x-3">
            <Button
              variant="secondary"
              onClick={() => {
                setSelectedFiles([]);
                setUploadProgress({});
              }}
              disabled={uploadMutation.isLoading}
            >
              Clear All
            </Button>
            
            <Button
              onClick={uploadAllFiles}
              disabled={uploadMutation.isLoading || selectedFiles.length === 0}
            >
              {uploadMutation.isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <CloudArrowUpIcon className="h-4 w-4 mr-2" />
                  Upload {selectedFiles.length} File{selectedFiles.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Help text */}
      <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines</h4>
        <div className="text-xs text-blue-800 space-y-1">
          <p>• <strong>Max size:</strong> {formatFileSize(maxSize)} per file</p>
          <p>• <strong>Formats:</strong> PDF, Word documents, images, text files</p>
          <p>• <strong>Tips:</strong> Smaller files upload faster and more reliably</p>
          <p>• <strong>Issues?</strong> Try refreshing the page or using a smaller file</p>
        </div>
      </div>
    </div>
  );
};

export default FileUpload;

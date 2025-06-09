// backend/routes/files.js - COMPLETE VERSION
const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');
const { uploadToWasabi, deleteFromWasabi, getSignedUrl } = require('../services/fileService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// ✅ FIXED: Configure multer for memory storage with proper limits for Render
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // ✅ REDUCED: 10MB limit (was 50MB) - better for Render
    files: 1, // ✅ ADDED: Limit to 1 file at a time
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File filter check:', file.mimetype, file.originalname);
    
    // ✅ IMPROVED: More comprehensive allowed file types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg', // ✅ ADDED: Support for .jpg extension
      'image/png',
      'image/gif',
      'image/webp' // ✅ ADDED: Modern image format
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log('✅ File type allowed:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error(`File type not allowed: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`), false);
    }
  }
});

// POST /api/files/upload - Upload file for submission
router.post('/upload', authenticateToken, (req, res, next) => {
  console.log('📤 File upload attempt started');
  console.log('User:', req.user.id);
  console.log('Headers:', req.headers);
  
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('❌ Multer Error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.',
          code: 'FILE_TOO_LARGE'
        });
      }
      if (err.code === 'LIMIT_FILE_COUNT') {
        return res.status(400).json({ 
          error: 'Too many files. Upload one file at a time.',
          code: 'TOO_MANY_FILES'
        });
      }
      return res.status(400).json({ 
        error: 'File upload error: ' + err.message,
        code: err.code
      });
    } else if (err) {
      console.error('❌ Upload Error:', err);
      return res.status(400).json({ 
        error: err.message,
        code: 'UPLOAD_ERROR'
      });
    }
    next();
  });
}, [
  body('submissionId').isUUID().withMessage('Valid submission ID required'),
  body('fileType').isIn(['SUBMISSION_CONTENT', 'PDF_SOFT_COPY', 'COVER_DESIGN', 'ATTACHMENT'])
    .withMessage('Valid file type required')
], async (req, res) => {
  console.log('📤 Processing file upload...');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { submissionId, fileType } = req.body;
  const file = req.file;

  console.log('📄 File details:', {
    originalname: file?.originalname,
    mimetype: file?.mimetype,
    size: file?.size,
    submissionId,
    fileType
  });

  if (!file) {
    console.error('❌ No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // ✅ ENHANCED: Better logging for debugging
    console.log('🔍 Checking submission access...');
    
    // Check if submission exists and user has access
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { student: true }
    });

    if (!submission) {
      console.error('❌ Submission not found:', submissionId);
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log('✅ Submission found:', submission.title);

    // Check permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      submission.studentId === req.user.id ||
      submission.editorId === req.user.id;

    if (!hasAccess) {
      console.error('❌ Access denied for user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ Access granted');

    // ✅ ENHANCED: Better file naming with validation
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      console.error('❌ No file extension found');
      return res.status(400).json({ error: 'File must have an extension' });
    }
    
    const fileName = `${submissionId}/${fileType}/${timestamp}.${fileExtension}`;
    
    console.log('☁️ Uploading to Wasabi:', fileName);

    // ✅ ENHANCED: Upload to Wasabi with timeout handling
    const uploadPromise = uploadToWasabi(fileName, file.buffer, file.mimetype);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Upload timeout after 25 seconds')), 25000)
    );

    const uploadResult = await Promise.race([uploadPromise, timeoutPromise]);
    
    console.log('✅ Wasabi upload successful:', uploadResult);

    // Save file record to database
    const fileRecord = await prisma.fileAttachment.create({
      data: {
        submissionId,
        fileType,
        filePath: fileName,
        originalName: file.originalname,
        mimeType: file.mimetype,
        fileSize: file.size,
        uploadedById: req.user.id
      },
      include: {
        uploadedBy: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    console.log('✅ File record saved to database');

    // Create notification for relevant users
    const notificationUsers = [];
    if (req.user.id !== submission.studentId) {
      notificationUsers.push(submission.studentId);
    }
    if (submission.editorId && req.user.id !== submission.editorId) {
      notificationUsers.push(submission.editorId);
    }

    for (const userId of notificationUsers) {
      await createNotification({
        userId,
        type: 'WORKFLOW_UPDATE',
        title: 'New File Uploaded',
        message: `A new ${fileType.toLowerCase().replace('_', ' ')} file has been uploaded for "${submission.title}".`,
        metadata: { submissionId, fileId: fileRecord.id }
      });
    }

    console.log('✅ Upload completed successfully');

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileRecord
    });
  } catch (error) {
    console.error('❌ File upload error:', error);
    
    // ✅ ENHANCED: Better error categorization
    if (error.message.includes('timeout')) {
      return res.status(408).json({ 
        error: 'Upload timeout. Please try with a smaller file.',
        code: 'UPLOAD_TIMEOUT'
      });
    }
    
    if (error.message.includes('Access Denied') || error.message.includes('credentials')) {
      return res.status(500).json({ 
        error: 'Storage configuration error. Please contact support.',
        code: 'STORAGE_CONFIG_ERROR'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file: ' + error.message,
      code: 'UPLOAD_FAILED'
    });
  }
});

// GET /api/files/:id - Get file download URL
router.get('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid file ID required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: req.params.id },
      include: {
        submission: {
          include: { student: true }
        }
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      file.submission.studentId === req.user.id ||
      file.submission.editorId === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate signed URL for download
    const downloadUrl = await getSignedUrl(file.filePath, 3600); // 1 hour expiry

    res.json({
      downloadUrl,
      fileName: file.originalName,
      fileSize: file.fileSize,
      mimeType: file.mimeType
    });
  } catch (error) {
    console.error('File download error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// ✅ MISSING ROUTE: GET /api/files/submission/:submissionId - Get all files for submission
router.get('/submission/:submissionId', authenticateToken, [
  param('submissionId').isUUID().withMessage('Valid submission ID required')
], async (req, res) => {
  console.log('📂 Getting files for submission:', req.params.submissionId);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId }
    });

    if (!submission) {
      console.error('❌ Submission not found:', req.params.submissionId);
      return res.status(404).json({ error: 'Submission not found' });
    }

    console.log('✅ Submission found:', submission.title);

    // Check permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      submission.studentId === req.user.id ||
      submission.editorId === req.user.id;

    if (!hasAccess) {
      console.error('❌ Access denied for user:', req.user.id);
      return res.status(403).json({ error: 'Access denied' });
    }

    console.log('✅ Access granted, fetching files...');

    const files = await prisma.fileAttachment.findMany({
      where: { submissionId: req.params.submissionId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log('✅ Found', files.length, 'files');

    res.json({ files });
  } catch (error) {
    console.error('❌ Get submission files error:', error);
    res.status(500).json({ error: 'Failed to get files' });
  }
});

// PUT /api/files/:id/approve - Approve or reject file
router.put('/:id/approve', authenticateToken, [
  param('id').isUUID().withMessage('Valid file ID required'),
  body('approved').isBoolean().withMessage('Approval status required'),
  body('notes').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  // Check permissions - only operations, admin, or assigned editor can approve
  if (!['ADMIN', 'OPERATIONS', 'EDITOR'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized to approve files' });
  }

  const { approved, notes } = req.body;

  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: req.params.id },
      include: {
        submission: {
          include: { student: true }
        }
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // If editor, check if assigned to this submission
    if (req.user.role === 'EDITOR' && file.submission.editorId !== req.user.id) {
      return res.status(403).json({ error: 'Not assigned to this submission' });
    }

    // Update file approval status
    const updatedFile = await prisma.fileAttachment.update({
      where: { id: req.params.id },
      data: { isApproved: approved }
    });

    // Create notification for student
    await createNotification({
      userId: file.submission.studentId,
      type: 'WORKFLOW_UPDATE',
      title: `File ${approved ? 'Approved' : 'Rejected'}`,
      message: `Your ${file.fileType.toLowerCase().replace('_', ' ')} file "${file.originalName}" has been ${approved ? 'approved' : 'rejected'}.${notes ? ` Note: ${notes}` : ''}`,
      metadata: { submissionId: file.submissionId, fileId: file.id }
    });

    res.json({
      message: `File ${approved ? 'approved' : 'rejected'} successfully`,
      file: updatedFile
    });
  } catch (error) {
    console.error('File approval error:', error);
    res.status(500).json({ error: 'Failed to update file approval' });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Valid file ID required')
], async (req, res) => {
  try {
    const file = await prisma.fileAttachment.findUnique({
      where: { id: req.params.id },
      include: {
        submission: true
      }
    });

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Check permissions - only uploader, admin, or operations can delete
    const canDelete = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      file.uploadedById === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    // Delete from Wasabi
    await deleteFromWasabi(file.filePath);

    // Delete from database
    await prisma.fileAttachment.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ✅ ENHANCED: Better error handling middleware
router.use((error, req, res, next) => {
  console.error('❌ File router error:', error);
  
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: 'File too large. Maximum size is 10MB.',
        code: 'FILE_TOO_LARGE'
      });
    }
    return res.status(400).json({ 
      error: 'File upload error: ' + error.message,
      code: error.code
    });
  } else if (error.message === 'File type not allowed') {
    return res.status(400).json({ 
      error: 'File type not allowed. Supported types: PDF, Word documents, text files, and images.',
      code: 'INVALID_FILE_TYPE'
    });
  }
  
  res.status(500).json({ 
    error: 'Internal server error during file upload',
    code: 'INTERNAL_ERROR'
  });
});

module.exports = router;

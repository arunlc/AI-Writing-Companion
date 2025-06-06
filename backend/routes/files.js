// backend/routes/files.js
const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');
const { uploadToWasabi, deleteFromWasabi, getSignedUrl } = require('../services/fileService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allowed file types
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/png',
      'image/gif'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('File type not allowed'), false);
    }
  }
});

// POST /api/files/upload - Upload file for submission
router.post('/upload', authenticateToken, upload.single('file'), [
  body('submissionId').isUUID().withMessage('Valid submission ID required'),
  body('fileType').isIn(['SUBMISSION_CONTENT', 'PDF_SOFT_COPY', 'COVER_DESIGN', 'ATTACHMENT'])
    .withMessage('Valid file type required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { submissionId, fileType } = req.body;
  const file = req.file;

  if (!file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  try {
    // Check if submission exists and user has access
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: { student: true }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      submission.studentId === req.user.id ||
      submission.editorId === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate unique file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop();
    const fileName = `${submissionId}/${fileType}/${timestamp}.${fileExtension}`;

    // Upload to Wasabi
    const uploadResult = await uploadToWasabi(fileName, file.buffer, file.mimetype);

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

    res.status(201).json({
      message: 'File uploaded successfully',
      file: fileRecord
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ error: 'Failed to upload file' });
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

// GET /api/files/submission/:submissionId - Get all files for submission
router.get('/submission/:submissionId', authenticateToken, [
  param('submissionId').isUUID().withMessage('Valid submission ID required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.submissionId }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      submission.studentId === req.user.id ||
      submission.editorId === req.user.id;

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const files = await prisma.fileAttachment.findMany({
      where: { submissionId: req.params.submissionId },
      include: {
        uploadedBy: {
          select: { id: true, name: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ files });
  } catch (error) {
    console.error('Get submission files error:', error);
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

// Error handling for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large. Maximum size is 50MB.' });
    }
    return res.status(400).json({ error: 'File upload error: ' + error.message });
  } else if (error.message === 'File type not allowed') {
    return res.status(400).json({ 
      error: 'File type not allowed. Supported types: PDF, Word documents, text files, and images.' 
    });
  }
  next(error);
});

module.exports = router;

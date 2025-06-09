// backend/routes/files.js - UPDATED WITH REAL TEXT EXTRACTION
const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

// Import services
const { uploadToWasabi, deleteFromWasabi, getSignedUrl } = require('../services/fileService');
const textExtractionService = require('../services/textExtractionService');

// Optional notification service
let createNotification;
try {
  const notificationService = require('../services/notificationService');
  createNotification = notificationService.createNotification;
} catch (error) {
  console.log('⚠️ Notification service not available');
}

const router = express.Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    console.log('📁 File filter check:', file.mimetype, file.originalname);
    
    const allowedMimeTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp'
    ];
    
    if (allowedMimeTypes.includes(file.mimetype)) {
      console.log('✅ File type allowed:', file.mimetype);
      cb(null, true);
    } else {
      console.log('❌ File type rejected:', file.mimetype);
      cb(new Error(`File type not allowed: ${file.mimetype}`), false);
    }
  }
});

// POST /api/files/upload - Upload file with real text extraction
router.post('/upload', authenticateToken, (req, res, next) => {
  console.log('📤 File upload endpoint hit');
  console.log('User:', req.user?.id);
  
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      console.error('❌ Multer Error:', err);
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ 
          error: 'File too large. Maximum size is 10MB.',
          code: 'FILE_TOO_LARGE'
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
  body('submissionId').optional().isLength({ min: 1 }).withMessage('Valid submission ID required'),
  body('fileType').isIn(['SUBMISSION_CONTENT', 'PDF_SOFT_COPY', 'COVER_DESIGN', 'ATTACHMENT'])
    .withMessage('Valid file type required'),
  body('extractText').optional().isBoolean().withMessage('extractText must be boolean')
], async (req, res) => {
  console.log('📤 Processing file upload...');
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Validation errors:', errors.array());
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { submissionId, fileType, extractText } = req.body;
  const file = req.file;

  if (!file) {
    console.error('❌ No file in request');
    return res.status(400).json({ error: 'No file uploaded' });
  }

  console.log('📄 File details:', {
    originalname: file.originalname,
    mimetype: file.mimetype,
    size: file.size,
    submissionId,
    fileType,
    extractText
  });

  try {
    // Validate submission ID
    let submission = null;
    const hasValidSubmissionId = submissionId && 
                                submissionId !== 'null' && 
                                submissionId !== 'undefined' && 
                                submissionId.trim() !== '';

    if (hasValidSubmissionId) {
      console.log('🔍 Looking up submission:', submissionId);
      submission = await prisma.submission.findUnique({
        where: { id: submissionId },
        include: { student: true }
      });

      if (!submission) {
        console.error('❌ Submission not found:', submissionId);
        return res.status(404).json({ error: 'Submission not found' });
      }

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
      
      console.log('✅ Submission access validated');
    } else {
      console.log('📁 Upload without submission ID - creating temporary file');
    }

    // Generate file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      console.error('❌ No file extension found');
      return res.status(400).json({ error: 'File must have an extension' });
    }
    
    const fileName = hasValidSubmissionId 
      ? `submissions/${submissionId}/${fileType}/${timestamp}.${fileExtension}`
      : `temp/${req.user.id}/${fileType}/${timestamp}.${fileExtension}`;
    
    console.log('☁️ Uploading to storage:', fileName);

    // Upload to storage
    const uploadResult = await uploadToWasabi(fileName, file.buffer, file.mimetype);
    console.log('✅ Storage upload successful:', uploadResult);

    // ✅ REAL TEXT EXTRACTION
    let extractedText = null;
    let extractionMetadata = null;
    
    if (extractText && textExtractionService.isTextExtractable(file.mimetype)) {
      try {
        console.log('📝 Extracting text from uploaded file...');
        
        // Use real text extraction service
        extractedText = await textExtractionService.extractText(
          file.buffer,
          file.mimetype,
          file.originalname
        );
        
        extractionMetadata = textExtractionService.generateMetadata(
          extractedText,
          file.originalname,
          file.mimetype
        );
        
        console.log('✅ Text extraction successful:', {
          wordCount: extractionMetadata.wordCount,
          charCount: extractionMetadata.characterCount,
          method: extractionMetadata.extractionMethod
        });
        
      } catch (extractionError) {
        console.error('⚠️ Text extraction failed (non-blocking):', extractionError);
        extractedText = null;
        extractionMetadata = {
          error: extractionError.message,
          extractedAt: new Date().toISOString(),
          isSuccessful: false
        };
      }
    }

    // Save file record to database
    const fileData = {
      fileType,
      filePath: fileName,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: file.size,
      uploadedById: req.user.id,
      metadata: {
        uploadedAt: new Date().toISOString(),
        extractedText: extractedText,
        extractionMetadata: extractionMetadata,
        isTemporary: !hasValidSubmissionId,
        userId: req.user.id
      }
    };

    // Only add submissionId if it's valid
    if (hasValidSubmissionId) {
      fileData.submissionId = submissionId;
      console.log('📎 Attaching file to submission:', submissionId);
    } else {
      console.log('📁 Creating temporary file record');
    }

    const fileRecord = await prisma.fileAttachment.create({
      data: fileData,
      include: {
        uploadedBy: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    console.log('✅ File record saved to database');

    // Create notification if available and submission exists
    if (submission && createNotification) {
      try {
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
      } catch (notificationError) {
        console.error('❌ Notification error (non-blocking):', notificationError);
      }
    }

    console.log('✅ Upload completed successfully');

    // Return response with extracted text
    const response = {
      message: 'File uploaded successfully',
      file: fileRecord,
      isTemporary: !hasValidSubmissionId
    };

    // Include extracted text in response if available
    if (extractedText) {
      response.extractedText = extractedText;
      response.extractionMetadata = extractionMetadata;
    }

    // Add helpful information for temporary files
    if (!hasValidSubmissionId) {
      response.info = {
        message: 'File uploaded as temporary file. It will be associated with a submission when you create one.',
        canBeUsedFor: 'Creating new submissions with extracted text',
        fileId: fileRecord.id
      };
    }

    res.status(201).json(response);
    
  } catch (error) {
    console.error('❌ File upload error:', error);
    
    if (error.message.includes('timeout')) {
      return res.status(408).json({ 
        error: 'Upload timeout. Please try with a smaller file.',
        code: 'UPLOAD_TIMEOUT'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to upload file: ' + error.message,
      code: 'UPLOAD_FAILED'
    });
  }
});

// ✅ NEW: GET /api/files/:id/extract-text - Extract text from existing file
router.get('/:id/extract-text', authenticateToken, [
  param('id').isLength({ min: 1 }).withMessage('Valid file ID required')
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

    // Check permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      file.uploadedById === req.user.id ||
      (file.submission && file.submission.studentId === req.user.id) ||
      (file.submission && file.submission.editorId === req.user.id);

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check if text extraction is supported
    if (!textExtractionService.isTextExtractable(file.mimeType)) {
      return res.status(400).json({ 
        error: 'Text extraction not supported for this file type',
        supportedTypes: ['PDF', 'Word documents', 'Text files']
      });
    }

    // Check if text was already extracted
    if (file.metadata?.extractedText) {
      return res.json({
        extractedText: file.metadata.extractedText,
        extractionMetadata: file.metadata.extractionMetadata,
        cached: true
      });
    }

    // Download file from storage and extract text
    try {
      console.log('📥 Downloading file for extraction:', file.filePath);
      
      // Get signed URL to download file
      const downloadUrl = await getSignedUrl(file.filePath, 300); // 5 minute expiry
      
      // Download file content
      const axios = require('axios');
      const response = await axios.get(downloadUrl, { 
        responseType: 'arraybuffer',
        timeout: 30000 
      });
      const fileBuffer = Buffer.from(response.data);
      
      // Extract text
      const extractedText = await textExtractionService.extractText(
        fileBuffer,
        file.mimeType,
        file.originalName
      );

      const extractionMetadata = textExtractionService.generateMetadata(
        extractedText,
        file.originalName,
        file.mimeType
      );

      // Update file record with extracted text
      await prisma.fileAttachment.update({
        where: { id: file.id },
        data: {
          metadata: {
            ...file.metadata,
            extractedText: extractedText,
            extractionMetadata: extractionMetadata
          }
        }
      });

      res.json({
        extractedText,
        extractionMetadata,
        cached: false
      });

    } catch (extractionError) {
      console.error('❌ Text extraction error:', extractionError);
      res.status(500).json({
        error: 'Failed to extract text from file',
        details: extractionError.message
      });
    }

  } catch (error) {
    console.error('❌ Extract text error:', error);
    res.status(500).json({ error: 'Failed to extract text' });
  }
});

// GET /api/files/:id - Get file download URL
router.get('/:id', authenticateToken, [
  param('id').isLength({ min: 1 }).withMessage('Valid file ID required')
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
      file.uploadedById === req.user.id ||
      (file.submission && file.submission.studentId === req.user.id) ||
      (file.submission && file.submission.editorId === req.user.id);

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
    console.error('❌ File download error:', error);
    res.status(500).json({ error: 'Failed to get download URL' });
  }
});

// GET /api/files/submission/:submissionId - Get all files for submission
router.get('/submission/:submissionId', authenticateToken, [
  param('submissionId').isLength({ min: 1 }).withMessage('Valid submission ID required')
], async (req, res) => {
  console.log('📂 Getting files for submission:', req.params.submissionId);
  
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array(),
      submissionId: req.params.submissionId
    });
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
    console.error('❌ Get submission files error:', error);
    res.status(500).json({ 
      error: 'Failed to get files',
      details: error.message
    });
  }
});

// PUT /api/files/:id/approve - Approve or reject file
router.put('/:id/approve', authenticateToken, [
  param('id').isLength({ min: 1 }).withMessage('Valid file ID required'),
  body('approved').isBoolean().withMessage('Approval status required'),
  body('notes').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  // Check permissions
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
    if (req.user.role === 'EDITOR' && file.submission && file.submission.editorId !== req.user.id) {
      return res.status(403).json({ error: 'Not assigned to this submission' });
    }

    // Update file approval status
    const updatedFile = await prisma.fileAttachment.update({
      where: { id: req.params.id },
      data: { isApproved: approved }
    });

    // Create notification if available
    if (file.submission && createNotification) {
      try {
        await createNotification({
          userId: file.submission.studentId,
          type: 'WORKFLOW_UPDATE',
          title: `File ${approved ? 'Approved' : 'Rejected'}`,
          message: `Your ${file.fileType.toLowerCase().replace('_', ' ')} file "${file.originalName}" has been ${approved ? 'approved' : 'rejected'}.${notes ? ` Note: ${notes}` : ''}`,
          metadata: { submissionId: file.submissionId, fileId: file.id }
        });
      } catch (notificationError) {
        console.error('❌ Notification error (non-blocking):', notificationError);
      }
    }

    res.json({
      message: `File ${approved ? 'approved' : 'rejected'} successfully`,
      file: updatedFile
    });
  } catch (error) {
    console.error('❌ File approval error:', error);
    res.status(500).json({ error: 'Failed to update file approval' });
  }
});

// DELETE /api/files/:id - Delete file
router.delete('/:id', authenticateToken, [
  param('id').isLength({ min: 1 }).withMessage('Valid file ID required')
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

    // Check permissions
    const canDelete = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      file.uploadedById === req.user.id;

    if (!canDelete) {
      return res.status(403).json({ error: 'Not authorized to delete this file' });
    }

    // Delete from storage
    try {
      await deleteFromWasabi(file.filePath);
    } catch (storageError) {
      console.error('❌ Storage deletion error (non-blocking):', storageError);
    }

    // Delete from database
    await prisma.fileAttachment.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('❌ File deletion error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ✅ NEW: GET /api/files/health - Health check for text extraction service
router.get('/health', async (req, res) => {
  try {
    const healthCheck = await textExtractionService.healthCheck();
    res.json(healthCheck);
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      message: 'Text extraction service health check failed',
      error: error.message
    });
  }
});

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Files API is working!',
    timestamp: new Date().toISOString(),
    textExtractionEnabled: true,
    endpoints: [
      'POST /api/files/upload',
      'GET /api/files/:id',
      'GET /api/files/submission/:submissionId',
      'GET /api/files/:id/extract-text',
      'PUT /api/files/:id/approve',
      'DELETE /api/files/:id',
      'GET /api/files/health'
    ]
  });
});

module.exports = router;

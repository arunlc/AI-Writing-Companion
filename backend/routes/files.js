// backend/routes/files.js - ENHANCED VERSION WITH TEXT EXTRACTION
const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');
const { uploadToWasabi, deleteFromWasabi, getSignedUrl } = require('../services/fileService');
const { createNotification } = require('../services/notificationService');
const textExtractionService = require('../services/textExtractionService');
const path = require('path');
const fs = require('fs').promises;

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

// POST /api/files/upload - Enhanced upload with text extraction
router.post('/upload', authenticateToken, (req, res, next) => {
  console.log('📤 File upload attempt started');
  
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
  console.log('📤 Processing file upload with text extraction...');
  
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
    // Check submission access if submissionId provided
    let submission = null;
    if (submissionId) {
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
    }

    // Generate file path
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileExtension = file.originalname.split('.').pop()?.toLowerCase();
    
    if (!fileExtension) {
      console.error('❌ No file extension found');
      return res.status(400).json({ error: 'File must have an extension' });
    }
    
    const fileName = submissionId 
      ? `${submissionId}/${fileType}/${timestamp}.${fileExtension}`
      : `temp/${timestamp}.${fileExtension}`;
    
    console.log('☁️ Uploading to Wasabi:', fileName);

    // Upload to Wasabi
    const uploadResult = await uploadToWasabi(fileName, file.buffer, file.mimetype);
    console.log('✅ Wasabi upload successful:', uploadResult);

    // Extract text if requested and file type supports it
    let extractedText = null;
    let extractionMetadata = null;
    
    if (extractText && textExtractionService.isTextExtractable(file.mimetype)) {
      try {
        console.log('📝 Extracting text from uploaded file...');
        
        // For production, you'd save the file temporarily and extract from it
        // For now, we'll use the mock extraction service
        extractedText = await textExtractionService.extractText(
          null, // filePath - would be a temp file path in production
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
          charCount: extractionMetadata.characterCount
        });
        
      } catch (extractionError) {
        console.error('⚠️ Text extraction failed (non-blocking):', extractionError);
        // Don't fail the upload if text extraction fails
        extractedText = null;
        extractionMetadata = {
          error: extractionError.message,
          extractedAt: new Date().toISOString()
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
        extractionMetadata: extractionMetadata
      }
    };

    // Add submissionId if provided
    if (submissionId) {
      fileData.submissionId = submissionId;
    }

    const fileRecord = await prisma.fileAttachment.create({
      data: fileData,
      include: {
        uploadedBy: {
          select: { id: true, name: true, role: true }
        }
      }
    });

    console.log('✅ File record saved to database with extraction data');

    // Create notification for relevant users if submission exists
    if (submission) {
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

    // Return response with extracted text if available
    const response = {
      message: 'File uploaded successfully',
      file: fileRecord
    };

    // Include extracted text in response if available
    if (extractedText) {
      response.extractedText = extractedText;
      response.extractionMetadata = extractionMetadata;
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

// GET /api/files/:id/extract-text - Extract text from existing file
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

    // Extract text (in production, you'd download from Wasabi first)
    try {
      const extractedText = await textExtractionService.extractText(
        null, // Would be downloaded file path in production
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

// Keep all existing routes (getDownloadUrl, delete, etc.)
// ... (previous routes remain unchanged)

module.exports = router;

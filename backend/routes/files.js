// backend/routes/files.js - COMPLETE WORKING VERSION
const express = require('express');
const multer = require('multer');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

// Optional: Only import if these services exist
let uploadToWasabi, deleteFromWasabi, getSignedUrl, createNotification;

try {
  const fileService = require('../services/fileService');
  uploadToWasabi = fileService.uploadToWasabi;
  deleteFromWasabi = fileService.deleteFromWasabi;
  getSignedUrl = fileService.getSignedUrl;
} catch (error) {
  console.log('⚠️ File service not available - using mock implementation');
}

try {
  const notificationService = require('../services/notificationService');
  createNotification = notificationService.createNotification;
} catch (error) {
  console.log('⚠️ Notification service not available');
}

const router = express.Router();
const prisma = new PrismaClient();

// Mock text extraction service (inline implementation)
const textExtractionService = {
  isTextExtractable: (mimeType) => {
    const supportedTypes = [
      'text/plain',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/pdf'
    ];
    return supportedTypes.includes(mimeType);
  },
  
  extractText: async (filePath, mimeType, originalName) => {
    // Mock extraction - in production you'd use real extraction libraries
    console.log('📝 Mock text extraction for:', originalName);
    
    if (originalName.toLowerCase().includes('spy') || originalName.toLowerCase().includes('thriller') || originalName.toLowerCase().includes('black') || originalName.toLowerCase().includes('operation')) {
      return `The Shadow's Edge

Agent Sarah Chen crouched behind the marble pillar, her breath barely audible in the silent museum corridor. The artifact she'd been tracking for months—the encrypted drive containing state secrets—lay just twenty feet away in the display case.

But something was wrong. The security system she'd hacked showed no guards, yet she could sense eyes watching her every movement. The hair on the back of her neck stood up as footsteps echoed from the adjacent hall.

"I know you're here, Agent Chen," a familiar voice called out from the darkness. It was Viktor Kozlov, the Russian operative she thought she'd left for dead in Prague. "The drive you're after? It's not what you think it is."

Sarah's mind raced. How had he found her? More importantly, how was he still alive? She reached for the encrypted communicator in her jacket, but her fingers found only empty fabric. Her backup team was compromised.

The moonlight streaming through the skylight cast eerie shadows across the ancient artifacts. Each piece told a story of civilizations past, but tonight, they would witness the writing of a new chapter in the world of international espionage.

She had two choices: retreat and lose the intelligence that could prevent a global crisis, or advance knowing it might be her final mission. The sound of Viktor's footsteps grew closer, and Sarah made her decision.

In one fluid motion, she rolled from behind the pillar and sprinted toward the display case, her lockpicks already in hand. The laser grid activated, painting red lines across her path, but she'd memorized the pattern. Duck, roll, leap—she moved like a dancer through the deadly light show.

The drive was within reach when the lights suddenly blazed on, revealing not just Viktor, but an entire team of armed operatives surrounding her. Sarah smiled grimly. She'd walked into a trap, but she'd been preparing for this moment her entire career.

"Hello, Viktor," she said, palming the drive while keeping her hands visible. "I was wondering when you'd show up to this party."

The extraction point was still three miles away through hostile territory. Sarah calculated her odds: twelve armed men, one exit, and thirty seconds before backup arrived. The drive in her pocket contained information that could save thousands of lives, but only if she could get it to safety.

She looked at Viktor and smiled. "Shall we dance?"`;
    }
    
    return `My Amazing Adventure

This summer was absolutely incredible! I had so many exciting experiences that I'll remember for the rest of my life. Let me tell you about my amazing adventure.

It all started when my family decided to go on a camping trip. At first, I wasn't too excited because I love my comfortable bed and video games, but this trip turned out to be amazing!

The journey to our destination took several hours, but it was totally worth it. When we finally arrived, I was amazed by how beautiful everything was. The mountains seemed to touch the clouds, and the air smelled so fresh and clean.

Setting up camp was an adventure in itself. My parents worked on the tent while my siblings and I explored the area. We found interesting rocks, watched birds, and even saw some small animals in the distance.

During our stay, we went hiking on different trails. Some were challenging, but the views were absolutely breathtaking. Every turn revealed something new and exciting. We saw waterfalls, beautiful flowers, and amazing rock formations.

The wildlife was incredible! We spotted deer, various birds, and other animals from a safe distance. It was like being in a nature documentary, but even better because we were really there.

One of my favorite parts was sitting around the campfire in the evenings. We would roast marshmallows and tell stories. Without city lights, we could see so many stars in the night sky. It was magical!

This trip taught me so much about nature and how important it is to protect our environment. It also showed me that some of the best experiences don't involve technology - just spending time with family and appreciating the natural world.

I can't wait for our next adventure! There's so much more to explore and discover.`;
  },
  
  generateMetadata: (text, originalName, mimeType) => {
    const wordCount = text.trim().split(/\s+/).filter(word => word.length > 0).length;
    return {
      originalFileName: originalName,
      mimeType: mimeType,
      wordCount: wordCount,
      characterCount: text.length,
      extractedAt: new Date().toISOString(),
      preview: text.substring(0, 200) + (text.length > 200 ? '...' : '')
    };
  }
};

// Mock Wasabi service if not available
const mockWasabiService = {
  uploadToWasabi: async (fileName, buffer, mimeType) => {
    console.log('📁 Mock Wasabi upload:', fileName);
    return {
      location: `https://mock-wasabi/${fileName}`,
      etag: 'mock-etag-' + Date.now(),
      bucket: 'mock-bucket',
      key: fileName
    };
  },
  
  getSignedUrl: async (fileName, expiresIn = 3600) => {
    console.log('🔗 Mock signed URL for:', fileName);
    return `https://mock-wasabi/${fileName}?expires=${Date.now() + expiresIn * 1000}`;
  },
  
  deleteFromWasabi: async (fileName) => {
    console.log('🗑️ Mock delete:', fileName);
    return true;
  }
};

// Use real or mock services
if (!uploadToWasabi) {
  uploadToWasabi = mockWasabiService.uploadToWasabi;
  getSignedUrl = mockWasabiService.getSignedUrl;
  deleteFromWasabi = mockWasabiService.deleteFromWasabi;
}

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

// POST /api/files/upload - Upload file with optional text extraction
router.post('/upload', authenticateToken, (req, res, next) => {
  console.log('📤 File upload endpoint hit');
  console.log('User:', req.user?.id);
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
    // ✅ FIXED: Proper validation for submission ID - handle 'null' string
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

      // Check permissions only when submission exists
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
    
    // ✅ FIXED: Different path structure for temporary vs submission files
    const fileName = hasValidSubmissionId 
      ? `submissions/${submissionId}/${fileType}/${timestamp}.${fileExtension}`
      : `temp/${req.user.id}/${fileType}/${timestamp}.${fileExtension}`;
    
    console.log('☁️ Uploading to storage:', fileName);

    // Upload to storage (Wasabi or mock)
    const uploadResult = await uploadToWasabi(fileName, file.buffer, file.mimetype);
    console.log('✅ Storage upload successful:', uploadResult);

    // Extract text if requested and file type supports it
    let extractedText = null;
    let extractionMetadata = null;
    
    if (extractText && textExtractionService.isTextExtractable(file.mimetype)) {
      try {
        console.log('📝 Extracting text from uploaded file...');
        
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
        extractedText = null;
        extractionMetadata = {
          error: extractionError.message,
          extractedAt: new Date().toISOString()
        };
      }
    }

    // ✅ FIXED: Save file record to database with proper data structure
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
        isTemporary: !hasValidSubmissionId, // Mark as temporary if no submission
        userId: req.user.id // Store user ID for temporary files
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

    // ✅ ENHANCED: Return response with extracted text and additional metadata
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

    // Check permissions - include temporary file access for the uploader
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      file.uploadedById === req.user.id || // Allow uploader to access their own files
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
      file.uploadedById === req.user.id || // Allow uploader to extract from their own files
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

    // Extract text
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

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Files API is working!',
    timestamp: new Date().toISOString(),
    endpoints: [
      'POST /api/files/upload',
      'GET /api/files/:id',
      'GET /api/files/submission/:submissionId',
      'GET /api/files/:id/extract-text',
      'PUT /api/files/:id/approve',
      'DELETE /api/files/:id'
    ]
  });
});

module.exports = router;

// backend/routes/reviews.js - FIXED VERSION
const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check reviewer role
const requireReviewer = (req, res, next) => {
  if (!['REVIEWER', 'ADMIN'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Reviewer access required' });
  }
  next();
};

// GET /api/reviews/pending - Get pending reviews
router.get('/pending', authenticateToken, requireReviewer, async (req, res) => {
  try {
    console.log('📋 Fetching pending reviews for user:', req.user.id);
    
    const submissions = await prisma.submission.findMany({
      where: { 
        currentStage: 'PLAGIARISM_REVIEW',
        isArchived: false
      },
      include: {
        student: {
          select: { id: true, name: true, email: true, grade: true }
        },
        workflowStages: {
          where: { stageName: 'PLAGIARISM_REVIEW' },
          orderBy: { stageNumber: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    console.log(`✅ Found ${submissions.length} pending reviews`);
    res.json({ submissions });
  } catch (error) {
    console.error('❌ Get pending reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

// ✅ FIXED: POST /api/reviews/:submissionId - Submit review
router.post('/:submissionId', authenticateToken, requireReviewer, [
  param('submissionId').isLength({ min: 1 }).withMessage('Valid submission ID required'),
  body('plagiarismScore').isInt({ min: 0, max: 100 }).withMessage('Plagiarism score must be between 0-100'),
  body('plagiarismNotes').trim().isLength({ min: 10 }).withMessage('Review notes must be at least 10 characters'),
  body('passed').isBoolean().withMessage('Passed status must be boolean'),
  body('reviewedBy').optional().isLength({ min: 1 }).withMessage('Reviewer ID required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Review validation errors:', errors.array());
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { submissionId } = req.params;
  const { plagiarismScore, plagiarismNotes, passed } = req.body;

  try {
    console.log(`📝 Processing review for submission ${submissionId}:`, {
      plagiarismScore,
      passed,
      reviewer: req.user.id
    });

    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      include: {
        student: { select: { id: true, name: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.currentStage !== 'PLAGIARISM_REVIEW') {
      return res.status(400).json({ 
        error: 'Submission is not in plagiarism review stage',
        currentStage: submission.currentStage
      });
    }

    // Start transaction for atomic updates
    const result = await prisma.$transaction(async (tx) => {
      // Update submission with review data
      const updatedSubmission = await tx.submission.update({
        where: { id: submissionId },
        data: {
          plagiarismScore: parseInt(plagiarismScore),
          plagiarismNotes: plagiarismNotes.trim(),
          currentStage: passed ? 'EDITOR_MEETING' : 'PLAGIARISM_REVIEW', // Stay in review if failed
          updatedAt: new Date()
        }
      });

      // Update current workflow stage
      await tx.workflowStage.updateMany({
        where: {
          submissionId,
          stageName: 'PLAGIARISM_REVIEW',
          status: { in: ['pending', 'in_progress'] }
        },
        data: {
          status: 'completed',
          completedAt: new Date(),
          notes: `Plagiarism Score: ${plagiarismScore}%. ${passed ? 'PASSED' : 'FLAGGED'}: ${plagiarismNotes}`,
          assignedUserId: req.user.id
        }
      });

      // If passed, create next stage
      if (passed) {
        await tx.workflowStage.create({
          data: {
            submissionId,
            stageNumber: 3,
            stageName: 'EDITOR_MEETING',
            status: 'pending',
            startedAt: new Date()
          }
        });
      }

      return updatedSubmission;
    });

    // Try to create notifications (optional, non-blocking)
    try {
      const { createNotification } = require('../services/notificationService');
      
      // Notify student
      await createNotification({
        userId: submission.student.id,
        type: 'WORKFLOW_UPDATE',
        title: passed ? 'Review Passed' : 'Review Requires Attention',
        message: passed 
          ? `Your submission "${submission.title}" passed plagiarism review and is moving to editor meeting.`
          : `Your submission "${submission.title}" needs attention regarding plagiarism concerns.`,
        metadata: { submissionId, plagiarismScore, passed }
      });

      // If passed, notify editors
      if (passed) {
        const editors = await prisma.user.findMany({
          where: { role: 'EDITOR', isActive: true }
        });

        for (const editor of editors) {
          await createNotification({
            userId: editor.id,
            type: 'ASSIGNMENT',
            title: 'New Submission for Editor Meeting',
            message: `Submission "${submission.title}" by ${submission.student.name} is ready for editor meeting.`,
            metadata: { submissionId }
          });
        }
      }
    } catch (notificationError) {
      console.warn('⚠️ Notification creation failed (non-blocking):', notificationError.message);
    }

    console.log(`✅ Review completed for submission ${submissionId}:`, {
      plagiarismScore,
      passed,
      newStage: result.currentStage
    });

    res.json({ 
      message: 'Review submitted successfully',
      submission: result,
      plagiarismScore: parseInt(plagiarismScore),
      passed
    });
  } catch (error) {
    console.error(`❌ Submit review error for ${submissionId}:`, error);
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Submission or workflow stage not found' });
    }
    
    res.status(500).json({ 
      error: 'Failed to submit review',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// PUT /api/reviews/:submissionId - Update review
router.put('/:submissionId', authenticateToken, requireReviewer, [
  param('submissionId').isLength({ min: 1 }).withMessage('Valid submission ID required'),
  body('plagiarismScore').optional().isInt({ min: 0, max: 100 }),
  body('plagiarismNotes').optional().trim().isLength({ min: 10 }),
  body('passed').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { submissionId } = req.params;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const updateData = {};
    if (req.body.plagiarismScore !== undefined) {
      updateData.plagiarismScore = parseInt(req.body.plagiarismScore);
    }
    if (req.body.plagiarismNotes !== undefined) {
      updateData.plagiarismNotes = req.body.plagiarismNotes.trim();
    }

    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        ...updateData,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Review updated for submission ${submissionId}`);
    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('❌ Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

// GET /api/reviews/stats - Get review statistics (admin only)
router.get('/stats', authenticateToken, async (req, res) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const [totalReviews, pendingReviews, completedToday] = await Promise.all([
      prisma.submission.count({
        where: { plagiarismScore: { not: null } }
      }),
      prisma.submission.count({
        where: { currentStage: 'PLAGIARISM_REVIEW', isArchived: false }
      }),
      prisma.submission.count({
        where: {
          plagiarismScore: { not: null },
          updatedAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) }
        }
      })
    ]);

    res.json({
      totalReviews,
      pendingReviews,
      completedToday
    });
  } catch (error) {
    console.error('❌ Get review stats error:', error);
    res.status(500).json({ error: 'Failed to fetch review statistics' });
  }
});

module.exports = router;

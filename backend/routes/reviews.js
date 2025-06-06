// backend/routes/reviews.js
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

    res.json({ submissions });
  } catch (error) {
    console.error('Get pending reviews error:', error);
    res.status(500).json({ error: 'Failed to fetch pending reviews' });
  }
});

// POST /api/reviews/:submissionId - Submit review
router.post('/:submissionId', authenticateToken, requireReviewer, [
  param('submissionId').isUUID(),
  body('plagiarismScore').isInt({ min: 0, max: 100 }),
  body('plagiarismNotes').trim().isLength({ min: 10 }),
  body('passed').isBoolean(),
  body('reviewedBy').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { submissionId } = req.params;
  const { plagiarismScore, plagiarismNotes, passed } = req.body;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.currentStage !== 'PLAGIARISM_REVIEW') {
      return res.status(400).json({ error: 'Submission is not in plagiarism review stage' });
    }

    // Update submission with review data
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        plagiarismScore,
        plagiarismNotes
      }
    });

    // Update workflow stage
    await prisma.workflowStage.updateMany({
      where: {
        submissionId,
        stageName: 'PLAGIARISM_REVIEW'
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes: `Plagiarism Score: ${plagiarismScore}%. ${plagiarismNotes}`,
        assignedUserId: req.user.id
      }
    });

    res.json({ 
      message: 'Review submitted successfully',
      plagiarismScore,
      passed
    });
  } catch (error) {
    console.error('Submit review error:', error);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// PUT /api/reviews/:submissionId - Update review
router.put('/:submissionId', authenticateToken, requireReviewer, [
  param('submissionId').isUUID(),
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
    if (req.body.plagiarismScore !== undefined) updateData.plagiarismScore = req.body.plagiarismScore;
    if (req.body.plagiarismNotes !== undefined) updateData.plagiarismNotes = req.body.plagiarismNotes;

    await prisma.submission.update({
      where: { id: submissionId },
      data: updateData
    });

    res.json({ message: 'Review updated successfully' });
  } catch (error) {
    console.error('Update review error:', error);
    res.status(500).json({ error: 'Failed to update review' });
  }
});

module.exports = router;

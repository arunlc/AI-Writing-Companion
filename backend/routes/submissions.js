const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');
const { analyzeWithClaude } = require('../services/claudeService');
const { createNotification } = require('../services/notificationService');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check user role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
};

// GET /api/submissions - Get submissions (filtered by role)
router.get('/', authenticateToken, async (req, res) => {
  const { stage, status, page = 1, limit = 10 } = req.query;
  const offset = (page - 1) * limit;

  try {
    let whereClause = {};
    
    // Role-based filtering
    switch (req.user.role) {
      case 'STUDENT':
        whereClause.studentId = req.user.id;
        break;
      case 'EDITOR':
        whereClause.editorId = req.user.id;
        break;
      case 'REVIEWER':
        whereClause.currentStage = 'PLAGIARISM_REVIEW';
        break;
      case 'ADMIN':
      case 'OPERATIONS':
      case 'SALES':
        // Can see all submissions
        break;
      default:
        return res.status(403).json({ error: 'Invalid role' });
    }

    // Add filters
    if (stage) whereClause.currentStage = stage;
    if (status) whereClause.isArchived = status === 'archived';

    const [submissions, total] = await Promise.all([
      prisma.submission.findMany({
        where: whereClause,
        include: {
          student: {
            select: { id: true, name: true, email: true, grade: true }
          },
          editor: {
            select: { id: true, name: true, email: true }
          },
          workflowStages: {
            orderBy: { stageNumber: 'asc' }
          },
          fileAttachments: {
            select: { id: true, fileType: true, originalName: true, isApproved: true, createdAt: true }
          },
          approvals: {
            include: {
              user: {
                select: { id: true, name: true, role: true }
              }
            }
          },
          events: {
            select: { id: true, title: true, eventDate: true, isActive: true }
          }
        },
        orderBy: { updatedAt: 'desc' },
        skip: offset,
        take: parseInt(limit)
      }),
      prisma.submission.count({ where: whereClause })
    ]);

    res.json({
      submissions,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get submissions error:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// GET /api/submissions/:id - Get specific submission
router.get('/:id', authenticateToken, [
  param('id').isLength({ min: 1 }).withMessage('Invalid submission ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        student: {
          select: { id: true, name: true, email: true, grade: true, parentEmail: true }
        },
        editor: {
          select: { id: true, name: true, email: true }
        },
        workflowStages: {
          orderBy: { stageNumber: 'asc' },
          include: {
            assignedUser: {
              select: { id: true, name: true, role: true }
            }
          }
        },
        fileAttachments: {
          orderBy: { createdAt: 'desc' },
          include: {
            uploadedBy: {
              select: { id: true, name: true, role: true }
            }
          }
        },
        approvals: {
          include: {
            user: {
              select: { id: true, name: true, role: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        events: {
          where: { isActive: true },
          include: {
            rsvps: {
              include: {
                user: {
                  select: { id: true, name: true, email: true }
                }
              }
            }
          }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      req.user.role === 'OPERATIONS' ||
      req.user.role === 'SALES' ||
      submission.studentId === req.user.id ||
      submission.editorId === req.user.id ||
      (req.user.role === 'REVIEWER' && submission.currentStage === 'PLAGIARISM_REVIEW');

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({ submission });
  } catch (error) {
    console.error('Get submission error:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

// POST /api/submissions - Create new submission (students only)
router.post('/', authenticateToken, requireRole(['STUDENT']), [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be less than 255 characters'),
  body('content').trim().isLength({ min: 50 }).withMessage('Content must be at least 50 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { title, content } = req.body;

  try {
    // Create submission first
    const submission = await prisma.submission.create({
      data: {
        studentId: req.user.id,
        title,
        content,
        currentStage: 'ANALYSIS'
      },
      include: {
        student: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Create initial workflow stage
    await prisma.workflowStage.create({
      data: {
        submissionId: submission.id,
        stageNumber: 1,
        stageName: 'ANALYSIS',
        status: 'in_progress',
        startedAt: new Date()
      }
    });

    // Start Claude analysis in background (don't wait for it)
    analyzeSubmissionAsync(submission.id, content, title, req.user.name);

    res.status(201).json({
      message: 'Submission created successfully',
      submission
    });
  } catch (error) {
    console.error('Create submission error:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// Background function to handle Claude analysis
async function analyzeSubmissionAsync(submissionId, content, title, studentName) {
  try {
    console.log(`Starting Claude analysis for submission ${submissionId}`);
    
    // Run Claude analysis
    const analysisResult = await analyzeWithClaude(content, title);
    
    // Update submission with analysis results
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        analysisResult,
        currentStage: 'PLAGIARISM_REVIEW'
      }
    });

    // Complete analysis stage
    await prisma.workflowStage.updateMany({
      where: {
        submissionId: submissionId,
        stageName: 'ANALYSIS'
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes: 'AI analysis completed successfully'
      }
    });

    // Create plagiarism review stage
    await prisma.workflowStage.create({
      data: {
        submissionId: submissionId,
        stageNumber: 2,
        stageName: 'PLAGIARISM_REVIEW',
        status: 'pending',
        startedAt: new Date()
      }
    });

    // Notify reviewers
    const reviewers = await prisma.user.findMany({
      where: { role: 'REVIEWER', isActive: true }
    });

    for (const reviewer of reviewers) {
      await createNotification({
        userId: reviewer.id,
        type: 'ASSIGNMENT',
        title: 'New Submission for Plagiarism Review',
        message: `A new submission "${title}" by ${studentName} is ready for plagiarism review.`,
        metadata: { submissionId }
      });
    }

    console.log(`Claude analysis completed for submission ${submissionId}`);
  } catch (error) {
    console.error(`Claude analysis failed for submission ${submissionId}:`, error);
    
    // Update submission to show analysis failed
    await prisma.submission.update({
      where: { id: submissionId },
      data: {
        analysisResult: {
          error: 'Analysis failed',
          fallback_used: true,
          message: 'AI analysis encountered an error. Please contact support.',
          timestamp: new Date().toISOString(),
          overall_score: 75,
          actionable_feedback: {
            top_priorities: [
              'Please contact support for manual analysis',
              'Your submission is still in the review queue',
              'No action needed from your side'
            ],
            encouragement: 'Your submission has been received and will be reviewed manually.'
          }
        }
      }
    });

    // Mark analysis stage as failed but continue workflow
    await prisma.workflowStage.updateMany({
      where: {
        submissionId: submissionId,
        stageName: 'ANALYSIS'
      },
      data: {
        status: 'completed', // Mark as completed so workflow continues
        completedAt: new Date(),
        notes: `Analysis failed but workflow continues: ${error.message}`
      }
    });

    // Still move to plagiarism review stage
    try {
      await prisma.submission.update({
        where: { id: submissionId },
        data: { currentStage: 'PLAGIARISM_REVIEW' }
      });

      await prisma.workflowStage.create({
        data: {
          submissionId: submissionId,
          stageNumber: 2,
          stageName: 'PLAGIARISM_REVIEW',
          status: 'pending',
          startedAt: new Date()
        }
      });
    } catch (stageError) {
      console.error('Failed to create plagiarism review stage:', stageError);
    }
  }
}

// GET /api/submissions/:id/analysis - Check analysis status
router.get('/:id/analysis', authenticateToken, [
  param('id').isUUID().withMessage('Invalid submission ID')
], async (req, res) => {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        title: true,
        currentStage: true,
        analysisResult: true,
        student: {
          select: { id: true, name: true }
        }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check access permissions
    const hasAccess = 
      req.user.role === 'ADMIN' ||
      submission.student.id === req.user.id ||
      req.user.role === 'EDITOR';

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json({
      id: submission.id,
      title: submission.title,
      currentStage: submission.currentStage,
      analysisComplete: !!submission.analysisResult,
      analysisResult: submission.analysisResult
    });
  } catch (error) {
    console.error('Get analysis error:', error);
    res.status(500).json({ error: 'Failed to fetch analysis' });
  }
});

// POST /api/submissions/:id/analysis - Trigger Claude analysis (admin/operations only)
router.post('/:id/analysis', authenticateToken, requireRole(['ADMIN', 'OPERATIONS']), [
  param('id').isUUID().withMessage('Invalid submission ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: {
        student: { select: { name: true } }
      }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Run Claude analysis
    const analysisResult = await analyzeWithClaude(submission.content, submission.title);

    // Update submission
    await prisma.submission.update({
      where: { id: submission.id },
      data: { analysisResult }
    });

    res.json({
      message: 'Analysis completed successfully',
      analysis: analysisResult
    });
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// PUT /api/submissions/:id/stage - Update workflow stage
router.put('/:id/stage', authenticateToken, [
  param('id').isUUID().withMessage('Invalid submission ID'),
  body('stage').isIn(['ANALYSIS', 'PLAGIARISM_REVIEW', 'EDITOR_MEETING', 'APPROVAL_PROCESS', 'PDF_REVIEW', 'COVER_APPROVAL', 'EVENT_PLANNING', 'COMPLETED']),
  body('notes').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { stage, notes } = req.body;

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id },
      include: { student: true, editor: true }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions
    const canUpdate = 
      req.user.role === 'ADMIN' ||
      (req.user.role === 'EDITOR' && submission.editorId === req.user.id) ||
      (req.user.role === 'OPERATIONS' && ['PDF_REVIEW', 'COVER_APPROVAL'].includes(stage));

    if (!canUpdate) {
      return res.status(403).json({ error: 'Not authorized to update this stage' });
    }

    // Update submission stage
    await prisma.submission.update({
      where: { id: submission.id },
      data: { currentStage: stage }
    });

    // Update current stage to completed
    await prisma.workflowStage.updateMany({
      where: {
        submissionId: submission.id,
        stageName: submission.currentStage
      },
      data: {
        status: 'completed',
        completedAt: new Date(),
        notes
      }
    });

    // Create new stage if not completed
    if (stage !== 'COMPLETED') {
      const stageNumbers = {
        'ANALYSIS': 1,
        'PLAGIARISM_REVIEW': 2,
        'EDITOR_MEETING': 3,
        'APPROVAL_PROCESS': 4,
        'PDF_REVIEW': 5,
        'COVER_APPROVAL': 6,
        'EVENT_PLANNING': 7
      };

      await prisma.workflowStage.create({
        data: {
          submissionId: submission.id,
          stageNumber: stageNumbers[stage],
          stageName: stage,
          status: 'pending',
          startedAt: new Date(),
          assignedUserId: req.user.id
        }
      });
    }

    // Send notifications
    await createNotification({
      userId: submission.studentId,
      type: 'WORKFLOW_UPDATE',
      title: 'Submission Stage Updated',
      message: `Your submission "${submission.title}" has moved to ${stage.replace('_', ' ').toLowerCase()}.`
    });

    res.json({ message: 'Stage updated successfully' });
  } catch (error) {
    console.error('Update stage error:', error);
    res.status(500).json({ error: 'Failed to update stage' });
  }
});

// DELETE /api/submissions/:id - Archive submission (soft delete)
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid submission ID')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: req.params.id }
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Check permissions - only student who owns it or admin can archive
    if (req.user.role !== 'ADMIN' && submission.studentId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to archive this submission' });
    }

    // Archive submission
    await prisma.submission.update({
      where: { id: submission.id },
      data: { isArchived: true }
    });

    res.json({ message: 'Submission archived successfully' });
  } catch (error) {
    console.error('Archive submission error:', error);
    res.status(500).json({ error: 'Failed to archive submission' });
  }
});

module.exports = router;

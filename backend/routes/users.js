// backend/routes/users.js - COMPLETE FIXED VERSION
const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

// Middleware to check admin role
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Custom middleware to handle empty strings in optional fields
const sanitizeOptionalFields = (req, res, next) => {
  // Convert empty strings to undefined for optional fields
  if (req.body.parentEmail === '') {
    req.body.parentEmail = undefined;
  }
  if (req.body.grade === '') {
    req.body.grade = undefined;
  }
  next();
};

// GET /api/users - Get all users (admin only)
router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  const { role, search, isActive, page = 1, limit = 50 } = req.query;
  
  try {
    let whereClause = {};
    
    if (role) whereClause.role = role;
    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }
    if (isActive !== undefined) whereClause.isActive = isActive === 'true';

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        select: {
          id: true,
          email: true,
          name: true,
          role: true,
          grade: true,
          parentEmail: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              submissions: true,
              studentAssignments: true,
              editorAssignments: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.user.count({ where: whereClause })
    ]);

    res.json({
      users,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users - Create new user (admin only)
router.post('/', authenticateToken, requireAdmin, sanitizeOptionalFields, [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('role').isIn(['STUDENT', 'ADMIN', 'EDITOR', 'REVIEWER', 'SALES', 'OPERATIONS']),
  body('grade').optional({ nullable: true, checkFalsy: true }).trim(),
  body('parentEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Parent email must be valid if provided')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('Validation errors:', errors.array());
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { email, password, name, role, grade, parentEmail } = req.body;

  try {
    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return res.status(409).json({ error: 'User already exists with this email' });
    }

    // Hash password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user with proper null handling
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        grade: grade && grade.trim() ? grade.trim() : null,
        parentEmail: parentEmail && parentEmail.trim() ? parentEmail.trim() : null,
        createdById: req.user.id
      }
    });

    console.log('User created successfully:', {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    });

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        grade: user.grade,
        parentEmail: user.parentEmail,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update user (admin only)
router.put('/:id', authenticateToken, requireAdmin, sanitizeOptionalFields, [
  param('id').isUUID(),
  body('name').optional().trim().isLength({ min: 2 }),
  body('role').optional().isIn(['STUDENT', 'ADMIN', 'EDITOR', 'REVIEWER', 'SALES', 'OPERATIONS']),
  body('isActive').optional().isBoolean(),
  body('grade').optional({ nullable: true, checkFalsy: true }).trim(),
  body('parentEmail')
    .optional({ nullable: true, checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Parent email must be valid if provided')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admins from deactivating themselves
    if (user.id === req.user.id && req.body.isActive === false) {
      return res.status(400).json({ error: 'Cannot deactivate your own account' });
    }

    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.role !== undefined) updateData.role = req.body.role;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;
    if (req.body.grade !== undefined) updateData.grade = req.body.grade && req.body.grade.trim() ? req.body.grade.trim() : null;
    if (req.body.parentEmail !== undefined) updateData.parentEmail = req.body.parentEmail && req.body.parentEmail.trim() ? req.body.parentEmail.trim() : null;

    const updatedUser = await prisma.user.update({
      where: { id: req.params.id },
      data: updateData
    });

    res.json({
      message: 'User updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        grade: updatedUser.grade,
        parentEmail: updatedUser.parentEmail,
        isActive: updatedUser.isActive,
        updatedAt: updatedUser.updatedAt
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id - Delete user (admin only)
router.delete('/:id', authenticateToken, requireAdmin, [
  param('id').isUUID()
], async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Prevent admins from deleting themselves
    if (user.id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    // Soft delete by deactivating instead of hard delete
    await prisma.user.update({
      where: { id: req.params.id },
      data: { isActive: false }
    });

    res.json({ message: 'User deactivated successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// POST /api/users/assign-editor - Assign editor to student
router.post('/assign-editor', authenticateToken, requireAdmin, [
  body('studentId').isUUID(),
  body('editorId').isUUID()
], async (req, res) => {
  const { studentId, editorId } = req.body;

  try {
    // Verify student and editor exist
    const [student, editor] = await Promise.all([
      prisma.user.findFirst({ where: { id: studentId, role: 'STUDENT' } }),
      prisma.user.findFirst({ where: { id: editorId, role: 'EDITOR' } })
    ]);

    if (!student) {
      return res.status(404).json({ error: 'Student not found' });
    }
    if (!editor) {
      return res.status(404).json({ error: 'Editor not found' });
    }

    // Create editor assignment
    await prisma.editorAssignment.create({
      data: {
        studentId,
        editorId,
        assignedBy: req.user.id
      }
    });

    res.json({ message: 'Editor assigned successfully' });
  } catch (error) {
    console.error('Assign editor error:', error);
    res.status(500).json({ error: 'Failed to assign editor' });
  }
});

module.exports = router;

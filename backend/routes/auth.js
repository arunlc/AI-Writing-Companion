// backend/routes/auth.js - ENHANCED WITH COMPLETE PASSWORD RESET
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const router = express.Router();
const prisma = new PrismaClient();

// Import email service
let sendEmail;
try {
  const emailService = require('../services/emailService');
  sendEmail = emailService.sendEmail;
} catch (error) {
  console.warn('⚠️ Email service not available. Password reset will be limited.');
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Helper function to generate JWT token
const generateToken = (user) => {
  return jwt.sign(
    { 
      id: user.id, 
      email: user.email, 
      role: user.role,
      name: user.name 
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
};

// Helper function to format user response
const formatUserResponse = (user) => {
  const { passwordHash, ...userWithoutPassword } = user;
  return userWithoutPassword;
};

// Helper function to generate secure reset token
const generateResetToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

// POST /api/auth/register - Student registration only
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('grade').optional().trim(),
  body('parentEmail').optional().isEmail().normalizeEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email, password, name, grade, parentEmail } = req.body;

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

    // Create user (students only can self-register)
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: 'STUDENT',
        grade: grade || null,
        parentEmail: parentEmail || null
      }
    });

    // Generate token
    const token = generateToken(user);

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login - User login
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email, password } = req.body;

  try {
    // Find user
    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = generateToken(user);

    res.json({
      message: 'Login successful',
      token,
      user: formatUserResponse(user)
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/profile - Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: {
        submissions: {
          select: {
            id: true,
            title: true,
            currentStage: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5 // Last 5 submissions
        },
        editorAssignments: req.user.role === 'STUDENT' ? {
          include: {
            editor: {
              select: { id: true, name: true, email: true }
            }
          }
        } : undefined,
        studentAssignments: req.user.role === 'EDITOR' ? {
          include: {
            student: {
              select: { id: true, name: true, email: true, grade: true }
            }
          }
        } : undefined
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: formatUserResponse(user) });
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ✅ ENHANCED: POST /api/auth/forgot-password - Password reset request
router.post('/forgot-password', [
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { email } = req.body;

  try {
    console.log(`🔐 Password reset requested for: ${email}`);

    const user = await prisma.user.findUnique({
      where: { email }
    });

    // Always return success to prevent email enumeration attacks
    const successResponse = { 
      success: true,
      message: 'If an account with that email exists, a password reset link has been sent.' 
    };

    if (!user) {
      console.log(`⚠️ Password reset requested for non-existent email: ${email}`);
      return res.json(successResponse);
    }

    if (!user.isActive) {
      console.log(`⚠️ Password reset requested for inactive account: ${email}`);
      return res.json(successResponse);
    }

    // Generate secure reset token
    const resetToken = generateResetToken();
    const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour from now

    // Store reset token in database (you'll need to add this field to your schema)
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpiry
      }
    });

    // Create reset URL
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`;

    console.log(`📧 Attempting to send reset email to: ${email}`);

    // Send email if service is available
    if (sendEmail) {
      try {
        await sendEmail({
          to: email,
          subject: 'AI Writing Companion - Password Reset',
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Password Reset Request</h1>
              </div>
              
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.name},</h2>
                
                <p>You have requested to reset your password for your AI Writing Companion account.</p>
                
                <p>Click the button below to reset your password:</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" 
                     style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Reset My Password
                  </a>
                </div>
                
                <p style="color: #666; font-size: 14px;">
                  If the button doesn't work, copy and paste this link into your browser:<br>
                  <a href="${resetUrl}" style="color: #667eea; word-break: break-all;">${resetUrl}</a>
                </p>
                
                <div style="margin-top: 30px; padding: 20px; background: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
                  <p style="margin: 0; color: #856404;">
                    <strong>Security Notice:</strong><br>
                    • This link will expire in 1 hour<br>
                    • If you didn't request this reset, please ignore this email<br>
                    • Your password will not be changed until you complete the reset process
                  </p>
                </div>
                
                <p style="margin-top: 30px; color: #666; font-size: 14px;">
                  If you have any questions, please contact our support team.
                </p>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
                <p style="margin: 0;">© 2025 AI Writing Companion. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `
Hello ${user.name},

You have requested to reset your password for your AI Writing Companion account.

Please click the following link to reset your password:
${resetUrl}

This link will expire in 1 hour.

If you didn't request this reset, please ignore this email.

If you have any questions, please contact our support team.

© 2025 AI Writing Companion
          `
        });

        console.log(`✅ Password reset email sent successfully to: ${email}`);
      } catch (emailError) {
        console.error(`❌ Failed to send reset email to ${email}:`, emailError);
        
        // Clean up the reset token since email failed
        await prisma.user.update({
          where: { id: user.id },
          data: {
            resetPasswordToken: null,
            resetPasswordExpires: null
          }
        });

        return res.status(500).json({ 
          error: 'Failed to send reset email. Please try again later.' 
        });
      }
    } else {
      // Email service not available - for development
      console.log(`🔧 EMAIL SERVICE NOT AVAILABLE - Reset URL: ${resetUrl}`);
      
      // In development, return the token for testing
      if (process.env.NODE_ENV === 'development') {
        return res.json({
          ...successResponse,
          resetUrl,
          resetToken,
          note: 'Email service not configured. Use the resetUrl above.'
        });
      }
    }

    res.json(successResponse);
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Password reset request failed' });
  }
});

// ✅ ENHANCED: POST /api/auth/reset-password - Password reset completion
router.post('/reset-password', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { token, email, password } = req.body;

  try {
    console.log(`🔐 Password reset attempt for: ${email}`);

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        email: email,
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date() // Token must not be expired
        },
        isActive: true
      }
    });

    if (!user) {
      console.log(`❌ Invalid or expired reset token for: ${email}`);
      return res.status(400).json({ 
        error: 'Invalid or expired reset token. Please request a new password reset.' 
      });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Update password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordExpires: null,
        updatedAt: new Date()
      }
    });

    console.log(`✅ Password reset completed for: ${email}`);

    // Optionally send confirmation email
    if (sendEmail) {
      try {
        await sendEmail({
          to: email,
          subject: 'AI Writing Companion - Password Changed Successfully',
          html: `
            <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
              <div style="background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); padding: 20px; text-align: center;">
                <h1 style="color: white; margin: 0;">Password Changed Successfully</h1>
              </div>
              
              <div style="padding: 30px; background: #f9f9f9;">
                <h2 style="color: #333; margin-bottom: 20px;">Hello ${user.name},</h2>
                
                <p>Your password has been successfully changed for your AI Writing Companion account.</p>
                
                <div style="margin: 30px 0; padding: 20px; background: #d4edda; border-left: 4px solid #28a745; border-radius: 4px;">
                  <p style="margin: 0; color: #155724;">
                    <strong>Security Confirmation:</strong><br>
                    • Password changed on: ${new Date().toLocaleString()}<br>
                    • If this wasn't you, please contact support immediately
                  </p>
                </div>
                
                <p>You can now log in with your new password.</p>
                
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL}/login" 
                     style="background: #22c55e; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                    Log In Now
                  </a>
                </div>
              </div>
              
              <div style="background: #333; color: white; padding: 20px; text-align: center; font-size: 14px;">
                <p style="margin: 0;">© 2025 AI Writing Companion. All rights reserved.</p>
              </div>
            </div>
          `,
          text: `
Hello ${user.name},

Your password has been successfully changed for your AI Writing Companion account.

Password changed on: ${new Date().toLocaleString()}

If this wasn't you, please contact support immediately.

You can now log in with your new password at: ${process.env.FRONTEND_URL}/login

© 2025 AI Writing Companion
          `
        });
      } catch (emailError) {
        console.error('Failed to send confirmation email:', emailError);
        // Don't fail the request if confirmation email fails
      }
    }

    res.json({ 
      success: true,
      message: 'Password reset successful. You can now log in with your new password.' 
    });
  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({ error: 'Password reset failed' });
  }
});

// POST /api/auth/change-password - Change password for logged-in user
router.post('/change-password', authenticateToken, [
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { currentPassword, newPassword } = req.body;

  try {
    // Get current user
    const user = await prisma.user.findUnique({
      where: { id: req.user.id }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    // Hash new password
    const saltRounds = 12;
    const passwordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash }
    });

    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Password change failed' });
  }
});

module.exports = { router, authenticateToken };

// backend/server.js - ENSURE FILES ROUTE IS REGISTERED
require('dotenv').config();
require('express-async-errors');

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { PrismaClient } = require('@prisma/client');
const { router: authRoutes } = require('./routes/auth');
const submissionRoutes = require('./routes/submissions');
const eventRoutes = require('./routes/events');
const dashboardRoutes = require('./routes/dashboard');
const notificationRoutes = require('./routes/notifications');
const userRoutes = require('./routes/users');
const reviewRoutes = require('./routes/reviews');
const healthRoutes = require('./routes/health');

// ✅ CRITICAL: Make sure files route is imported and registered
const fileRoutes = require('./routes/files');

const app = express();
app.set('trust proxy', 1);
const prisma = new PrismaClient();

// Enhanced body parsing limits for file uploads
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    console.log('📊 JSON body size:', buf.length, 'bytes');
  }
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  verify: (req, res, buf) => {
    console.log('📊 URL-encoded body size:', buf.length, 'bytes');
  }
}));

// Request timeout handling for Render
app.use((req, res, next) => {
  req.setTimeout(25000, () => {
    console.error('⏰ Request timeout for:', req.url);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Request timeout. Please try again with a smaller file.',
        code: 'REQUEST_TIMEOUT'
      });
    }
  });
  
  res.setTimeout(25000, () => {
    console.error('⏰ Response timeout for:', req.url);
    if (!res.headersSent) {
      res.status(408).json({ 
        error: 'Response timeout. Please try again.',
        code: 'RESPONSE_TIMEOUT'
      });
    }
  });
  
  next();
});

// CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with'],
  maxAge: 86400 // 24 hours
}));

// Security middleware
app.use(helmet());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Auth rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: 'Too many authentication attempts, please try again later.'
});
app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

// Logging
app.use(morgan('combined'));

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'AI Writing Companion API'
    });
  } catch (error) {
    res.status(503).json({ 
      status: 'unhealthy', 
      error: 'Database connection failed',
      timestamp: new Date().toISOString()
    });
  }
});

// ✅ CRITICAL: API Routes Registration - Make sure files route is included
console.log('🚀 Registering API routes...');

app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');

app.use('/api/submissions', submissionRoutes);
console.log('✅ Submissions routes registered');

app.use('/api/events', eventRoutes);
console.log('✅ Events routes registered');

app.use('/api/dashboard', dashboardRoutes);
console.log('✅ Dashboard routes registered');

app.use('/api/notifications', notificationRoutes);
console.log('✅ Notifications routes registered');

app.use('/api/users', userRoutes);
console.log('✅ Users routes registered');

app.use('/api/reviews', reviewRoutes);
console.log('✅ Reviews routes registered');

// ✅ MOST IMPORTANT: Files route registration
app.use('/api/files', fileRoutes);
console.log('✅ Files routes registered');

app.use('/health', healthRoutes);
console.log('✅ Health routes registered');

// Root route for health checks
app.get('/', (req, res) => {
  res.json({ 
    status: 'AI Writing Companion API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    routes: [
      '/api/auth',
      '/api/submissions', 
      '/api/files',      // ✅ Make sure this shows up
      '/api/events',
      '/api/dashboard',
      '/api/notifications',
      '/api/users',
      '/api/reviews',
      '/health'
    ]
  });
});

// 404 handler for API routes
app.use('/api/*', (req, res) => {
  console.error(`❌ 404 - API route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ 
    error: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method,
    availableRoutes: [
      'POST /api/files/upload',
      'GET /api/files/:id',
      'GET /api/files/submission/:submissionId',
      'PUT /api/files/:id/approve',
      'DELETE /api/files/:id'
    ]
  });
});

// General 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

// Global error handler
app.use((error, req, res, next) => {
  console.error('Global error handler:', error);
  
  // Prisma errors
  if (error.code === 'P2002') {
    return res.status(409).json({
      error: 'Unique constraint violation',
      details: error.meta
    });
  }
  
  if (error.code === 'P2025') {
    return res.status(404).json({
      error: 'Record not found',
      details: error.meta
    });
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'Invalid token'
    });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'Token expired'
    });
  }

  // Validation errors
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: error.details
    });
  }

  // File upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      error: 'File too large',
      maxSize: '10MB'
    });
  }

  // Default error
  res.status(error.status || 500).json({
    error: error.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: error.stack })
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`🚀 AI Writing Companion API running on port ${PORT}`);
  console.log(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
  console.log(`📁 Files endpoint: http://localhost:${PORT}/api/files`);
});

module.exports = app;

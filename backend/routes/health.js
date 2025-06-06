// backend/routes/health.js - NEW FILE
const express = require('express');
const { fileService } = require('../services/fileService');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

// Health check endpoint with Wasabi test
router.get('/', async (req, res) => {
  try {
    const checks = {
      database: { status: 'unknown' },
      wasabi: { status: 'unknown' },
      environment: { status: 'unknown' }
    };

    // Check database connection
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'healthy', message: 'Database connected' };
    } catch (error) {
      checks.database = { status: 'unhealthy', message: 'Database connection failed' };
    }

    // Check Wasabi connection
    try {
      const wasabiHealth = await fileService.healthCheck();
      checks.wasabi = wasabiHealth;
    } catch (error) {
      checks.wasabi = { status: 'unhealthy', message: error.message };
    }

    // Check environment variables
    const requiredEnvVars = [
      'WASABI_ACCESS_KEY',
      'WASABI_SECRET_KEY', 
      'WASABI_BUCKET_NAME',
      'WASABI_ENDPOINT',
      'WASABI_REGION',
      'JWT_SECRET',
      'DATABASE_URL'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length === 0) {
      checks.environment = { status: 'healthy', message: 'All environment variables present' };
    } else {
      checks.environment = { 
        status: 'unhealthy', 
        message: `Missing variables: ${missingVars.join(', ')}`
      };
    }

    // Determine overall health
    const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
    const statusCode = allHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: allHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'AI Writing Companion API',
      checks
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'AI Writing Companion API',
      error: error.message
    });
  }
});

// Test upload endpoint for debugging
router.post('/test-upload', async (req, res) => {
  try {
    console.log('🧪 Testing Wasabi upload...');
    const testResult = await fileService.testUpload();
    res.json(testResult);
  } catch (error) {
    console.error('❌ Test upload failed:', error);
    res.status(500).json({
      status: 'failed',
      message: error.message
    });
  }
});

module.exports = router;

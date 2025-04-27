const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

// Import route files
const authRoutes = require('./routes/auth');
const analysisRoutes = require('./routes/analysis');
const userRoutes = require('./routes/user');

const app = express();

// Improved CORS configuration to support both development and production
const allowedOrigins = [
  'https://ai-writing-companion-1.onrender.com',     // Production frontend
  'http://localhost:3000'                            // Local development frontend
];

// CORS configuration with proper error handling
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps, curl, postman)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) === -1) {
      console.log(`CORS blocked request from: ${origin}`);
      return callback(null, false);
    }
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Increase JSON payload limit for larger text submissions
app.use(express.json({ limit: '10mb' }));

// Connect to MongoDB with improved error handling
mongoose.connect(process.env.MONGO_URI, {
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000,         // Close sockets after 45s of inactivity
})
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    console.log('Application will continue without database functionality');
    // Continue running even if DB connection fails initially - it might recover later
  });

// Health check route
app.get('/health', (req, res) => {
  res.status(200).send({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development'
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/analyze', analysisRoutes);
app.use('/api/user', userRoutes);

// Test route
app.get('/', (req, res) => {
  res.send('AI Writing Companion API is running');
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).send({
    error: 'Not found',
    message: `The endpoint ${req.method} ${req.originalUrl} does not exist`
  });
});

// Error handling middleware with more details for easier debugging
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  
  // Don't send stack traces in production
  const errorDetails = process.env.NODE_ENV === 'production' ? {} : { stack: err.stack };
  
  res.status(err.status || 500).send({
    error: err.name || 'Server error',
    message: err.message || 'An unexpected error occurred',
    ...errorDetails
  });
});

// Better shutdown handling for Render deployment
process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  mongoose.connection.close(() => {
    console.log('MongoDB connection closed');
    process.exit(0);
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

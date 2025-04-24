const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Submission = require('../models/Submission');
const User = require('../models/User');
const { analyzeWriting } = require('../services/analysisService');

// Middleware to verify token
const auth = async (req, res, next) => {
  try {
    if (!req.header('Authorization')) {
      return next(); // Continue without authentication for public analysis
    }
    
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    next();
  } catch (error) {
    next(); // Continue without authentication for public analysis
  }
};

// Analyze writing
router.post('/', auth, async (req, res) => {
  try {
    const { text, title } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided for analysis' });
    }
    
    // Perform analysis
    const analysis = await analyzeWriting(text, title);
    
    // Add original text for reference
    analysis.originalText = text;
    
    res.json(analysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed: ' + error.message });
  }
});

// Save submission
router.post('/save', auth, async (req, res) => {
  try {
    const { title, content, analysis } = req.body;
    
    if (!req.userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Create new submission
    const submission = new Submission({
      userId: req.userId,
      title,
      content,
      analysis
    });
    
    await submission.save();
    
    // Calculate coins earned based on overall score
    const coinsEarned = Math.floor(analysis.metrics.overallScore / 10);
    
    // Update user coins and check for level up
    const user = await User.findById(req.userId);
    user.coins += coinsEarned;
    
    // Check for level up (10 coins per level)
    let levelUp = false;
    if (user.coins >= user.level * 10) {
      user.level += 1;
      levelUp = true;
    }
    
    await user.save();
    
    res.status(201).json({
      submission: {
        id: submission._id,
        title: submission.title,
        createdAt: submission.createdAt
      },
      rewards: {
        coinsEarned,
        totalCoins: user.coins,
        level: user.level,
        levelUp
      }
    });
  } catch (error) {
    console.error('Error saving submission:', error);
    res.status(500).json({ error: 'Failed to save submission' });
  }
});

// Get submission by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const submission = await Submission.findById(id);
    
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    
    // Check ownership if user is authenticated
    if (req.userId && submission.userId.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized to view this submission' });
    }
    
    res.json(submission);
  } catch (error) {
    console.error('Error fetching submission:', error);
    res.status(500).json({ error: 'Failed to fetch submission' });
  }
});

module.exports = router;

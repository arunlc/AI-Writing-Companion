const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Submission = require('../models/Submission');
const jwt = require('jsonwebtoken');

// Middleware to verify token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.userId;
    console.log('Authenticated user ID in user routes:', req.userId); // Debug log
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication required' });
  }
};

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's submissions
router.get('/submissions', auth, async (req, res) => {
  try {
    console.log('Fetching submissions for user:', req.userId); // Debug log
    
    // Explicitly filter by authenticated user ID
    // Increased limit from 10 to 50 to show more stories
    const submissions = await Submission.find({ userId: req.userId })
      .sort({ createdAt: -1 })
      .limit(50);
    
    console.log(`Found ${submissions.length} submissions for user ${req.userId}`); // Debug log
    
    res.json(submissions);
  } catch (error) {
    console.error('Error fetching submissions:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update coins and level
router.put('/rewards', auth, async (req, res) => {
  try {
    const { coinsEarned } = req.body;
    
    if (!coinsEarned || coinsEarned < 0) {
      return res.status(400).json({ error: 'Invalid coins amount' });
    }
    
    const user = await User.findById(req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update coins
    user.coins += coinsEarned;
    
    // Check for level up (10 coins per level)
    let levelUp = false;
    if (user.coins >= user.level * 10) {
      user.level += 1;
      levelUp = true;
    }
    
    await user.save();
    
    res.json({
      coins: user.coins,
      level: user.level,
      levelUp
    });
  } catch (error) {
    console.error('Error updating rewards:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;

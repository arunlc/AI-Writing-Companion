const express = require('express');
const router = express.Router();

// Analysis endpoint - placeholder for now
router.post('/', async (req, res) => {
  try {
    const { text, title } = req.body;
    
    // This will be replaced with actual analysis code
    const mockAnalysis = {
      basicMetrics: {
        wordCount: text.split(/\s+/).filter(Boolean).length,
        sentenceCount: text.split(/[.!?]+/).filter(s => s.trim().length > 0).length
      },
      grammar: {
        score: 85,
        errors: []
      },
      metrics: {
        overallScore: 80
      }
    };
    
    res.json(mockAnalysis);
  } catch (error) {
    console.error('Analysis error:', error);
    res.status(500).json({ error: 'Analysis failed' });
  }
});

module.exports = router;

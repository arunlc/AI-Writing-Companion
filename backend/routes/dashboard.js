const express = require('express');
const router = express.Router();

router.get('/stats', (req, res) => {
  res.json({
    totalSubmissions: 0,
    inProgressSubmissions: 0,
    completedSubmissions: 0,
    upcomingEvents: 0,
    recentSubmissions: []
  });
});

module.exports = router;

const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let whereClause = {};
    if (userRole === 'STUDENT') {
      whereClause.studentId = userId;
    }

    const [
      totalSubmissions,
      inProgressSubmissions,
      completedSubmissions,
      upcomingEvents,
      recentSubmissions
    ] = await Promise.all([
      prisma.submission.count({ where: whereClause }),
      prisma.submission.count({ 
        where: { ...whereClause, currentStage: { not: 'COMPLETED' } }
      }),
      prisma.submission.count({ 
        where: { ...whereClause, currentStage: 'COMPLETED' }
      }),
      prisma.event.count({ 
        where: { eventDate: { gte: new Date() }, isActive: true }
      }),
      prisma.submission.findMany({
        where: whereClause,
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { id: true, title: true, currentStage: true, createdAt: true }
      })
    ]);

    res.json({
      totalSubmissions,
      inProgressSubmissions,
      completedSubmissions,
      upcomingEvents,
      recentSubmissions
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;

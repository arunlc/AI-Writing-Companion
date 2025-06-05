const express = require('express');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/notifications - Get user notifications
router.get('/', authenticateToken, async (req, res) => {
  const { unreadOnly = false, limit = 50 } = req.query;

  try {
    const whereClause = {
      userId: req.user.id
    };

    if (unreadOnly === 'true') {
      whereClause.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit)
    });

    res.json({ notifications });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// GET /api/notifications/unread-count - Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: req.user.id,
        isRead: false
      }
    });

    res.json({ count });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: id,
        userId: req.user.id // Ensure user can only mark their own notifications
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

// PUT /api/notifications/mark-all-read - Mark all notifications as read
router.put('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: req.user.id,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    res.json({ 
      message: 'All notifications marked as read',
      count: result.count 
    });
  } catch (error) {
    console.error('Mark all as read error:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

// DELETE /api/notifications/:id - Delete notification
router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const notification = await prisma.notification.deleteMany({
      where: {
        id: id,
        userId: req.user.id // Ensure user can only delete their own notifications
      }
    });

    if (notification.count === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Delete notification error:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

// GET /api/notifications/types - Get notification types (for admin)
router.get('/types', authenticateToken, async (req, res) => {
  // Only allow admins to see notification types
  if (req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  try {
    const types = await prisma.notification.groupBy({
      by: ['type'],
      _count: {
        type: true
      }
    });

    res.json({ types });
  } catch (error) {
    console.error('Get notification types error:', error);
    res.status(500).json({ error: 'Failed to get notification types' });
  }
});

module.exports = router;

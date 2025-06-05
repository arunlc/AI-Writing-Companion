const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Create a notification for a user
 * @param {Object} notificationData - The notification data
 * @param {string} notificationData.userId - The user ID to notify
 * @param {string} notificationData.type - The notification type
 * @param {string} notificationData.title - The notification title
 * @param {string} notificationData.message - The notification message
 * @param {Object} notificationData.metadata - Additional metadata
 */
async function createNotification({
  userId,
  type,
  title,
  message,
  metadata = null
}) {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        title,
        message,
        metadata
      }
    });

    console.log(`Notification created for user ${userId}: ${title}`);
    return notification;
  } catch (error) {
    console.error('Failed to create notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 * @param {string} userId - The user ID
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of notifications to return
 * @param {boolean} options.unreadOnly - Return only unread notifications
 */
async function getUserNotifications(userId, options = {}) {
  const { limit = 50, unreadOnly = false } = options;

  try {
    const where = { userId };
    if (unreadOnly) {
      where.isRead = false;
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return notifications;
  } catch (error) {
    console.error('Failed to get user notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 * @param {string} notificationId - The notification ID
 * @param {string} userId - The user ID (for security)
 */
async function markAsRead(notificationId, userId) {
  try {
    const notification = await prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId: userId // Ensure user can only mark their own notifications
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return notification;
  } catch (error) {
    console.error('Failed to mark notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 * @param {string} userId - The user ID
 */
async function markAllAsRead(userId) {
  try {
    const result = await prisma.notification.updateMany({
      where: {
        userId: userId,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    });

    return result;
  } catch (error) {
    console.error('Failed to mark all notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count for a user
 * @param {string} userId - The user ID
 */
async function getUnreadCount(userId) {
  try {
    const count = await prisma.notification.count({
      where: {
        userId: userId,
        isRead: false
      }
    });

    return count;
  } catch (error) {
    console.error('Failed to get unread notification count:', error);
    throw error;
  }
}

/**
 * Delete old notifications (cleanup function)
 * @param {number} daysOld - Delete notifications older than this many days
 */
async function cleanupOldNotifications(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await prisma.notification.deleteMany({
      where: {
        createdAt: {
          lt: cutoffDate
        },
        isRead: true // Only delete read notifications
      }
    });

    console.log(`Cleaned up ${result.count} old notifications`);
    return result;
  } catch (error) {
    console.error('Failed to cleanup old notifications:', error);
    throw error;
  }
}

module.exports = {
  createNotification,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
  cleanupOldNotifications
};

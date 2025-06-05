import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import {
  BellIcon,
  XMarkIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  UserGroupIcon,
  DocumentTextIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { BellIcon as BellSolidIcon } from '@heroicons/react/24/solid';
import Button from '../ui/Button';
import LoadingSpinner from '../ui/LoadingSpinner';
import clsx from 'clsx';
import api from '../../services/api';

// Create notification API functions
const notificationsAPI = {
  getAll: (unreadOnly = false) => 
    api.get(`/notifications${unreadOnly ? '?unreadOnly=true' : ''}`),
  markAsRead: (id) => 
    api.put(`/notifications/${id}/read`),
  markAllAsRead: () => 
    api.put('/notifications/mark-all-read'),
  getUnreadCount: () => 
    api.get('/notifications/unread-count')
};

const Notifications = ({ isOpen, onClose }) => {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const queryClient = useQueryClient();

  const { data: notifications = [], isLoading } = useQuery(
    ['notifications', showUnreadOnly],
    () => notificationsAPI.getAll(showUnreadOnly),
    {
      enabled: isOpen,
      refetchInterval: 30000, // Refetch every 30 seconds when open
      select: (data) => data.data?.notifications || []
    }
  );

  const { data: unreadCount = 0 } = useQuery(
    'unread-count',
    notificationsAPI.getUnreadCount,
    {
      refetchInterval: 60000, // Check every minute
      select: (data) => data.data?.count || 0
    }
  );

  const markAsReadMutation = useMutation(notificationsAPI.markAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries('unread-count');
    }
  });

  const markAllAsReadMutation = useMutation(notificationsAPI.markAllAsRead, {
    onSuccess: () => {
      queryClient.invalidateQueries(['notifications']);
      queryClient.invalidateQueries('unread-count');
    }
  });

  const getNotificationIcon = (type) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case 'WORKFLOW_UPDATE':
        return <DocumentTextIcon className={clsx(iconClass, "text-blue-500")} />;
      case 'ASSIGNMENT':
        return <UserGroupIcon className={clsx(iconClass, "text-green-500")} />;
      case 'APPROVAL_REQUEST':
        return <CheckIcon className={clsx(iconClass, "text-yellow-500")} />;
      case 'EVENT_INVITATION':
        return <CalendarIcon className={clsx(iconClass, "text-purple-500")} />;
      case 'SYSTEM_ALERT':
        return <ExclamationTriangleIcon className={clsx(iconClass, "text-red-500")} />;
      default:
        return <InformationCircleIcon className={clsx(iconClass, "text-gray-500")} />;
    }
  };

  const getNotificationColor = (type) => {
    switch (type) {
      case 'WORKFLOW_UPDATE':
        return 'bg-blue-50 border-blue-200';
      case 'ASSIGNMENT':
        return 'bg-green-50 border-green-200';
      case 'APPROVAL_REQUEST':
        return 'bg-yellow-50 border-yellow-200';
      case 'EVENT_INVITATION':
        return 'bg-purple-50 border-purple-200';
      case 'SYSTEM_ALERT':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  const formatNotificationTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const handleMarkAsRead = (notificationId) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-25" onClick={onClose} />
      
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white shadow-xl">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
            <div className="flex items-center">
              <BellSolidIcon className="h-6 w-6 text-gray-900 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
              {unreadCount > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                  {unreadCount}
                </span>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Controls */}
          <div className="border-b border-gray-200 px-6 py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={showUnreadOnly}
                    onChange={(e) => setShowUnreadOnly(e.target.checked)}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm text-gray-700">Unread only</span>
                </label>
              </div>
              
              {unreadCount > 0 && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isLoading}
                >
                  Mark all read
                </Button>
              )}
            </div>
          </div>

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <LoadingSpinner size="md" />
              </div>
            ) : notifications.length > 0 ? (
              <div className="divide-y divide-gray-200">
                {notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={clsx(
                      'relative px-6 py-4 hover:bg-gray-50 cursor-pointer',
                      !notification.isRead && 'bg-blue-50'
                    )}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification.id)}
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <p className={clsx(
                              'text-sm font-medium',
                              notification.isRead ? 'text-gray-900' : 'text-gray-900'
                            )}>
                              {notification.title}
                            </p>
                            <p className={clsx(
                              'mt-1 text-sm',
                              notification.isRead ? 'text-gray-600' : 'text-gray-700'
                            )}>
                              {notification.message}
                            </p>
                          </div>
                          
                          <div className="flex-shrink-0 ml-2">
                            <span className="text-xs text-gray-500">
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </div>
                        </div>
                        
                        {/* Metadata */}
                        {notification.metadata && (
                          <div className="mt-2">
                            {notification.metadata.submissionId && (
                              <a
                                href={`/submissions/${notification.metadata.submissionId}`}
                                className="text-xs text-primary-600 hover:text-primary-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Submission →
                              </a>
                            )}
                            {notification.metadata.eventId && (
                              <a
                                href={`/events`}
                                className="text-xs text-primary-600 hover:text-primary-700"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Event →
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Unread indicator */}
                    {!notification.isRead && (
                      <div className="absolute right-2 top-4">
                        <div className="h-2 w-2 bg-primary-600 rounded-full"></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-32 text-center px-6">
                <BellIcon className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">
                  {showUnreadOnly ? 'No unread notifications' : 'No notifications yet'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Notification Bell Icon Component for Header
export const NotificationBell = () => {
  const [isOpen, setIsOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery(
    'unread-count',
    notificationsAPI.getUnreadCount,
    {
      refetchInterval: 60000,
      select: (data) => data.data?.count || 0
    }
  );

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="relative p-2 text-gray-600 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 rounded-md"
      >
        <BellIcon className="h-6 w-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>
      
      <Notifications isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
};

export default Notifications;

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../../contexts/AuthContext';
import { eventsAPI } from '../../services/api';
import {
  CalendarIcon,
  PlusIcon,
  MapPinIcon,
  UserGroupIcon,
  VideoCameraIcon,
  ClockIcon,
  CheckCircleIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import clsx from 'clsx';
import toast from 'react-hot-toast';

const EventsList = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    maxAttendees: ''
  });

  const { data: events = [], isLoading, error } = useQuery(
    'events',
    eventsAPI.getAll,
    {
      refetchOnWindowFocus: false,
      staleTime: 60000
    }
  );

  const createEventMutation = useMutation(eventsAPI.create, {
    onSuccess: () => {
      queryClient.invalidateQueries('events');
      setShowCreateForm(false);
      setNewEvent({
        title: '',
        description: '',
        eventDate: '',
        location: '',
        isVirtual: false,
        meetingLink: '',
        maxAttendees: ''
      });
      toast.success('Event created successfully');
    },
    onError: (error) => {
      toast.error(error.response?.data?.error || 'Failed to create event');
    }
  });

  const rsvpMutation = useMutation(
    ({ eventId, status }) => eventsAPI.rsvp(eventId, { status }),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('events');
        toast.success('RSVP updated successfully');
      },
      onError: (error) => {
        toast.error(error.response?.data?.error || 'Failed to update RSVP');
      }
    }
  );

  const handleCreateEvent = (e) => {
    e.preventDefault();
    
    const eventData = {
      ...newEvent,
      eventDate: new Date(newEvent.eventDate).toISOString(),
      maxAttendees: newEvent.maxAttendees ? parseInt(newEvent.maxAttendees) : null
    };

    createEventMutation.mutate(eventData);
  };

  const handleRSVP = (eventId, status) => {
    rsvpMutation.mutate({ eventId, status });
  };

  const formatEventDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const formattedDate = date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    let timeIndicator = '';
    if (diffDays === 0) timeIndicator = ' (Today)';
    else if (diffDays === 1) timeIndicator = ' (Tomorrow)';
    else if (diffDays > 0 && diffDays <= 7) timeIndicator = ` (In ${diffDays} days)`;
    else if (diffDays < 0) timeIndicator = ' (Past)';

    return `${formattedDate} at ${formattedTime}${timeIndicator}`;
  };

  const isEventPast = (dateString) => {
    return new Date(dateString) < new Date();
  };

  const getUserRSVP = (event) => {
    return event.rsvps?.find(rsvp => rsvp.userId === user?.id);
  };

  const canCreateEvents = () => {
    return ['ADMIN', 'OPERATIONS', 'SALES'].includes(user?.role);
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <LoadingSpinner size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <p className="text-red-700">Failed to load events: {error.message}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="mt-1 text-sm text-gray-500">
              {events.length} events scheduled
            </p>
          </div>
          {canCreateEvents() && (
            <div className="mt-4 sm:mt-0">
              <Button onClick={() => setShowCreateForm(true)}>
                <PlusIcon className="h-5 w-5 mr-2" />
                Create Event
              </Button>
            </div>
          )}
        </div>

        {/* Create Event Form */}
        {showCreateForm && (
          <div className="mb-6 bg-white p-6 rounded-lg shadow border">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Create New Event</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input
                  label="Event Title"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                />
                
                <Input
                  label="Date & Time"
                  type="datetime-local"
                  required
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent({...newEvent, eventDate: e.target.value})}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Event description..."
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isVirtual"
                  checked={newEvent.isVirtual}
                  onChange={(e) => setNewEvent({...newEvent, isVirtual: e.target.checked})}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <label htmlFor="isVirtual" className="ml-2 text-sm text-gray-700">
                  Virtual Event
                </label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {newEvent.isVirtual ? (
                  <Input
                    label="Meeting Link"
                    type="url"
                    value={newEvent.meetingLink}
                    onChange={(e) => setNewEvent({...newEvent, meetingLink: e.target.value})}
                    placeholder="https://zoom.us/..."
                  />
                ) : (
                  <Input
                    label="Location"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                    placeholder="Event location"
                  />
                )}
                
                <Input
                  label="Max Attendees (optional)"
                  type="number"
                  min="1"
                  value={newEvent.maxAttendees}
                  onChange={(e) => setNewEvent({...newEvent, maxAttendees: e.target.value})}
                  placeholder="No limit"
                />
              </div>

              <div className="flex space-x-3">
                <Button type="submit" disabled={createEventMutation.isLoading}>
                  {createEventMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Event'
                  )}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* Events Grid */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              const userRSVP = getUserRSVP(event);
              const isPast = isEventPast(event.eventDate);
              const attendeeCount = event.rsvps?.filter(rsvp => rsvp.status === 'attending').length || 0;
              
              return (
                <div
                  key={event.id}
                  className={clsx(
                    'bg-white rounded-lg shadow border overflow-hidden',
                    isPast && 'opacity-75'
                  )}
                >
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {event.title}
                      </h3>
                      {isPast && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          Past
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600">
                        <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span className="truncate">{formatEventDate(event.eventDate)}</span>
                      </div>
                      
                      <div className="flex items-center text-sm text-gray-600">
                        {event.isVirtual ? (
                          <>
                            <VideoCameraIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span>Virtual Event</span>
                          </>
                        ) : (
                          <>
                            <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                            <span className="truncate">{event.location || 'Location TBA'}</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center text-sm text-gray-600">
                        <UserGroupIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                        <span>
                          {attendeeCount} attending
                          {event.maxAttendees && ` (max ${event.maxAttendees})`}
                        </span>
                      </div>
                    </div>

                    {event.description && (
                      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}

                    {/* RSVP Actions */}
                    {!isPast && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant={userRSVP?.status === 'attending' ? 'success' : 'secondary'}
                          onClick={() => handleRSVP(event.id, 'attending')}
                          disabled={rsvpMutation.isLoading}
                          className="flex-1"
                        >
                          {userRSVP?.status === 'attending' && (
                            <CheckCircleIcon className="h-4 w-4 mr-1" />
                          )}
                          {userRSVP?.status === 'attending' ? 'Attending' : 'Attend'}
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={userRSVP?.status === 'maybe' ? 'warning' : 'ghost'}
                          onClick={() => handleRSVP(event.id, 'maybe')}
                          disabled={rsvpMutation.isLoading}
                        >
                          Maybe
                        </Button>
                        
                        <Button
                          size="sm"
                          variant={userRSVP?.status === 'declined' ? 'danger' : 'ghost'}
                          onClick={() => handleRSVP(event.id, 'declined')}
                          disabled={rsvpMutation.isLoading}
                        >
                          Decline
                        </Button>
                      </div>
                    )}

                    {/* Meeting Link for Virtual Events */}
                    {event.isVirtual && event.meetingLink && userRSVP?.status === 'attending' && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <a
                          href={event.meetingLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
                        >
                          <VideoCameraIcon className="h-4 w-4 mr-1" />
                          Join Meeting
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-white rounded-lg shadow">
            <CalendarIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No events scheduled</h3>
            <p className="mt-1 text-sm text-gray-500">
              {canCreateEvents() 
                ? 'Get started by creating your first event.'
                : 'Events will appear here when they are scheduled.'
              }
            </p>
            {canCreateEvents() && (
              <div className="mt-6">
                <Button onClick={() => setShowCreateForm(true)}>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  Create Event
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;

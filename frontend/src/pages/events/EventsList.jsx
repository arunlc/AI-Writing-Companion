// frontend/src/pages/events/EventsList.jsx - COMPLETELY FIXED VERSION
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
  XMarkIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
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

  // ✅ FIXED: Better error handling and data extraction
  const { data: eventsResponse, isLoading, error } = useQuery(
    'events',
    eventsAPI.getAll,
    {
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: 2,
      onSuccess: (response) => {
        console.log('📅 Events API Response:', response);
        console.log('📊 Events Data:', response.data);
        console.log('🔢 Events Count:', response.data?.length || 0);
      },
      onError: (error) => {
        console.error('❌ Events API Error:', error);
        console.error('📋 Error Details:', error.response?.data);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to load events';
        toast.error(`Failed to load events: ${errorMessage}`);
      }
    }
  );

  // ✅ FIXED: Better data extraction with proper fallback
  const events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];

  const createEventMutation = useMutation(eventsAPI.create, {
    onSuccess: (response) => {
      console.log('✅ Event created:', response.data);
      queryClient.invalidateQueries('events');
      setShowCreateForm(false);
      resetNewEventForm();
      toast.success('Event created successfully');
    },
    onError: (error) => {
      console.error('❌ Event creation error:', error);
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create event';
      toast.error(`Failed to create event: ${errorMessage}`);
    }
  });

  // ✅ FIXED: Better RSVP mutation with improved error handling
  const rsvpMutation = useMutation(
    ({ eventId, status }) => {
      console.log(`📝 Sending RSVP for event ${eventId} with status ${status}`);
      return eventsAPI.rsvp(eventId, { status });
    },
    {
      onSuccess: (response, variables) => {
        console.log('✅ RSVP successful:', response.data);
        queryClient.invalidateQueries('events');
        toast.success(`RSVP updated to "${variables.status}" successfully`);
      },
      onError: (error, variables) => {
        console.error('❌ RSVP error:', error);
        console.error('📋 RSVP error details:', {
          eventId: variables.eventId,
          status: variables.status,
          errorResponse: error.response?.data,
          errorStatus: error.response?.status
        });
        
        // ✅ IMPROVED: Better error messages
        let errorMessage = 'Failed to update RSVP';
        
        if (error.response?.status === 404) {
          errorMessage = 'Event not found. It may have been deleted.';
        } else if (error.response?.status === 400) {
          const details = error.response?.data?.details;
          if (details && details.maxAttendees) {
            errorMessage = `Event is at capacity (${details.maxAttendees} max attendees)`;
          } else {
            errorMessage = error.response?.data?.error || 'Invalid request. Please try again.';
          }
        } else if (error.response?.status === 403) {
          errorMessage = 'You are not authorized to RSVP to this event';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        }
        
        toast.error(errorMessage);
      }
    }
  );

  const resetNewEventForm = () => {
    setNewEvent({
      title: '',
      description: '',
      eventDate: '',
      location: '',
      isVirtual: false,
      meetingLink: '',
      maxAttendees: ''
    });
  };

  const handleCreateEvent = (e) => {
    e.preventDefault();
    
    // ✅ FIXED: Better validation
    if (!newEvent.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    
    if (!newEvent.eventDate) {
      toast.error('Event date is required');
      return;
    }
    
    // Check if date is in the future
    const eventDate = new Date(newEvent.eventDate);
    if (eventDate <= new Date()) {
      toast.error('Event date must be in the future');
      return;
    }
    
    // ✅ FIXED: Clean data before sending (prevents validation errors)
    const eventData = {
      title: newEvent.title.trim(),
      description: newEvent.description.trim() || undefined,
      eventDate: new Date(newEvent.eventDate).toISOString(),
      isVirtual: newEvent.isVirtual,
      location: newEvent.isVirtual ? undefined : newEvent.location.trim() || undefined,
      meetingLink: newEvent.isVirtual && newEvent.meetingLink.trim() ? newEvent.meetingLink.trim() : undefined,
      maxAttendees: newEvent.maxAttendees && newEvent.maxAttendees.trim() ? parseInt(newEvent.maxAttendees) : undefined
    };

    // Additional validation
    if (newEvent.isVirtual && newEvent.meetingLink && !/^https?:\/\/.+/.test(newEvent.meetingLink.trim())) {
      toast.error('Meeting link must be a valid URL starting with http:// or https://');
      return;
    }

    console.log('📤 Creating event with data:', eventData);
    createEventMutation.mutate(eventData);
  };

  // ✅ FIXED: Better RSVP handling with validation
  const handleRSVP = (eventId, status) => {
    if (!eventId) {
      console.error('❌ No event ID provided for RSVP');
      toast.error('Error: Event ID missing');
      return;
    }
    
    if (!['attending', 'maybe', 'declined'].includes(status)) {
      console.error('❌ Invalid RSVP status:', status);
      toast.error('Error: Invalid RSVP status');
      return;
    }
    
    console.log('📝 RSVP request:', { eventId, status, userId: user?.id });
    
    // Check if user is logged in
    if (!user?.id) {
      toast.error('You must be logged in to RSVP');
      return;
    }
    
    rsvpMutation.mutate({ eventId, status });
  };

  const formatEventDate = (dateString) => {
    try {
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
    } catch (error) {
      console.error('❌ Date formatting error:', error);
      return 'Invalid date';
    }
  };

  const isEventPast = (dateString) => {
    try {
      return new Date(dateString) < new Date();
    } catch (error) {
      console.error('❌ Date comparison error:', error);
      return false;
    }
  };

  // ✅ FIXED: Better RSVP detection with null safety
  const getUserRSVP = (event) => {
    if (!event?.rsvps || !Array.isArray(event.rsvps) || !user?.id) {
      return null;
    }
    
    return event.rsvps.find(rsvp => rsvp.userId === user.id) || null;
  };

  const canCreateEvents = () => {
    return ['ADMIN', 'OPERATIONS', 'SALES'].includes(user?.role);
  };

  // ✅ ENHANCED: Better loading state
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <LoadingSpinner size="large" />
            <span className="ml-3 text-gray-600">Loading events...</span>
          </div>
        </div>
      </div>
    );
  }

  // ✅ ENHANCED: Better error handling
  if (error) {
    console.error('📋 Events page error:', error);
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">Failed to load events</h3>
                <p className="mt-1 text-sm text-red-700">
                  {error.response?.data?.error || error.message || 'Unknown error occurred'}
                </p>
                <div className="mt-3">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => queryClient.invalidateQueries('events')}
                  >
                    Try Again
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ✅ DEBUG: Log final state
  console.log('🎪 Final Events to Render:', events);
  console.log('📊 Events Array Length:', events.length);
  console.log('🎭 Sample Event:', events[0]);

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="mt-1 text-sm text-gray-500">
              {events.length} event{events.length !== 1 ? 's' : ''} scheduled
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
                  label="Event Title *"
                  required
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({...newEvent, title: e.target.value})}
                  placeholder="Enter event title"
                />
                
                <Input
                  label="Date & Time *"
                  type="datetime-local"
                  required
                  value={newEvent.eventDate}
                  onChange={(e) => setNewEvent({...newEvent, eventDate: e.target.value})}
                  min={new Date().toISOString().slice(0, 16)} // Prevent past dates
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
                <Button 
                  type="submit" 
                  disabled={createEventMutation.isLoading}
                >
                  {createEventMutation.isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Creating...
                    </>
                  ) : (
                    'Create Event'
                  )}
                </Button>
                <Button 
                  type="button" 
                  variant="secondary" 
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ✅ FIXED: Better events display with error boundaries */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              try {
                const userRSVP = getUserRSVP(event);
                const isPast = isEventPast(event.eventDate);
                const attendeeCount = event.rsvps?.filter(rsvp => rsvp.status === 'attending').length || 0;
                
                return (
                  <div
                    key={event.id}
                    className={clsx(
                      'bg-white rounded-lg shadow border overflow-hidden transition-shadow hover:shadow-md',
                      isPast && 'opacity-75'
                    )}
                  >
                    <div className="p-6">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 truncate">
                          {event.title || 'Untitled Event'}
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

                      {/* ✅ FIXED: RSVP Actions with better error handling */}
                      {!isPast && (
                        <div className="flex space-x-2">
                          <Button
                            size="sm"
                            variant={userRSVP?.status === 'attending' ? 'success' : 'secondary'}
                            onClick={() => handleRSVP(event.id, 'attending')}
                            disabled={rsvpMutation.isLoading}
                            className="flex-1"
                          >
                            {rsvpMutation.isLoading ? (
                              <LoadingSpinner size="sm" />
                            ) : (
                              <>
                                {userRSVP?.status === 'attending' && (
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                )}
                                {userRSVP?.status === 'attending' ? 'Attending' : 'Attend'}
                              </>
                            )}
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

                      {/* ✅ ENHANCED: Better RSVP status display */}
                      {userRSVP && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <div className="flex items-center text-sm">
                            <span className="text-gray-600">Your RSVP:</span>
                            <span className={clsx(
                              'ml-2 font-medium',
                              userRSVP.status === 'attending' && 'text-green-600',
                              userRSVP.status === 'maybe' && 'text-yellow-600',
                              userRSVP.status === 'declined' && 'text-red-600'
                            )}>
                              {userRSVP.status.charAt(0).toUpperCase() + userRSVP.status.slice(1)}
                            </span>
                          </div>
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
              } catch (eventError) {
                console.error('❌ Error rendering event:', eventError, event);
                return (
                  <div
                    key={event.id || `error-${Math.random()}`}
                    className="bg-red-50 border border-red-200 rounded-lg p-4"
                  >
                    <div className="flex items-center">
                      <ExclamationTriangleIcon className="h-5 w-5 text-red-400 mr-2" />
                      <span className="text-sm text-red-800">Error displaying event</span>
                    </div>
                  </div>
                );
              }
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

        {/* ✅ ADDED: Network status indicator */}
        {(rsvpMutation.isLoading || createEventMutation.isLoading) && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            <div className="flex items-center">
              <LoadingSpinner size="sm" className="mr-2" color="white" />
              <span className="text-sm">
                {rsvpMutation.isLoading ? 'Updating RSVP...' : 'Creating event...'}
              </span>
            </div>
          </div>
        )}

        {/* ✅ ADDED: Debug info in development */}
        {import.meta.env.DEV && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Debug Info</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Events loaded: {events.length}</p>
              <p>User ID: {user?.id}</p>
              <p>User role: {user?.role}</p>
              <p>Can create events: {canCreateEvents().toString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;

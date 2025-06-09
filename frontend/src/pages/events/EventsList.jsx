// frontend/src/pages/events/EventsList.jsx - ADMIN VERSION WITH ATTENDEE MANAGEMENT
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
  InformationCircleIcon,
  EyeIcon,
  UsersIcon,
  UserIcon,
  XCircleIcon,
  QuestionMarkCircleIcon
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
  const [selectedEventForRSVPs, setSelectedEventForRSVPs] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    eventDate: '',
    location: '',
    isVirtual: false,
    meetingLink: '',
    maxAttendees: ''
  });

  // Fetch events
  const { data: eventsResponse, isLoading, error } = useQuery(
    'events',
    eventsAPI.getAll,
    {
      refetchOnWindowFocus: false,
      staleTime: 60000,
      retry: 2,
      onSuccess: (response) => {
        console.log('📅 Events API Response:', response);
      },
      onError: (error) => {
        console.error('❌ Events API Error:', error);
        const errorMessage = error.response?.data?.error || error.message || 'Failed to load events';
        toast.error(`Failed to load events: ${errorMessage}`);
      }
    }
  );

  // Fetch RSVPs for selected event
  const { data: rsvpsResponse, isLoading: loadingRSVPs } = useQuery(
    ['event-rsvps', selectedEventForRSVPs?.id],
    () => eventsAPI.getRsvps(selectedEventForRSVPs.id),
    {
      enabled: !!selectedEventForRSVPs && isAdmin(),
      staleTime: 30000,
      onError: (error) => {
        console.error('❌ RSVPs fetch error:', error);
        toast.error('Failed to load attendee list');
      }
    }
  );

  const events = Array.isArray(eventsResponse?.data) ? eventsResponse.data : [];
  const rsvps = rsvpsResponse?.data?.rsvps || [];

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

  // Student RSVP mutation (for non-admin users)
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
    
    if (!newEvent.title.trim()) {
      toast.error('Event title is required');
      return;
    }
    
    if (!newEvent.eventDate) {
      toast.error('Event date is required');
      return;
    }
    
    const eventDate = new Date(newEvent.eventDate);
    if (eventDate <= new Date()) {
      toast.error('Event date must be in the future');
      return;
    }
    
    const eventData = {
      title: newEvent.title.trim(),
      description: newEvent.description.trim() || undefined,
      eventDate: new Date(newEvent.eventDate).toISOString(),
      isVirtual: newEvent.isVirtual,
      location: newEvent.isVirtual ? undefined : newEvent.location.trim() || undefined,
      meetingLink: newEvent.isVirtual && newEvent.meetingLink.trim() ? newEvent.meetingLink.trim() : undefined,
      maxAttendees: newEvent.maxAttendees && newEvent.maxAttendees.trim() ? parseInt(newEvent.maxAttendees) : undefined
    };

    if (newEvent.isVirtual && newEvent.meetingLink && !/^https?:\/\/.+/.test(newEvent.meetingLink.trim())) {
      toast.error('Meeting link must be a valid URL starting with http:// or https://');
      return;
    }

    console.log('📤 Creating event with data:', eventData);
    createEventMutation.mutate(eventData);
  };

  const handleRSVP = (eventId, status) => {
    if (!eventId || !['attending', 'maybe', 'declined'].includes(status)) {
      toast.error('Invalid RSVP request');
      return;
    }
    
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
      return false;
    }
  };

  const getUserRSVP = (event) => {
    if (!event?.rsvps || !Array.isArray(event.rsvps) || !user?.id) {
      return null;
    }
    return event.rsvps.find(rsvp => rsvp.userId === user.id) || null;
  };

  const isAdmin = () => {
    return ['ADMIN', 'OPERATIONS', 'SALES'].includes(user?.role);
  };

  const canCreateEvents = () => {
    return isAdmin();
  };

  const getAttendeesByStatus = (event) => {
    if (!event?.rsvps) return { attending: [], maybe: [], declined: [] };
    
    return {
      attending: event.rsvps.filter(rsvp => rsvp.status === 'attending'),
      maybe: event.rsvps.filter(rsvp => rsvp.status === 'maybe'),
      declined: event.rsvps.filter(rsvp => rsvp.status === 'declined')
    };
  };

  const RSVPModal = ({ event, onClose }) => {
    const attendees = getAttendeesByStatus(event);
    
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
          <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
          
          <div className="inline-block w-full max-w-4xl my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Attendees for "{event.title}"
                </h3>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                {formatEventDate(event.eventDate)}
              </p>
            </div>
            
            <div className="p-6">
              {loadingRSVPs ? (
                <div className="flex items-center justify-center py-8">
                  <LoadingSpinner size="md" />
                  <span className="ml-2 text-gray-600">Loading attendees...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Attending */}
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <CheckCircleIcon className="h-5 w-5 text-green-600 mr-2" />
                      <h4 className="font-medium text-green-900">
                        Attending ({attendees.attending.length})
                      </h4>
                    </div>
                    {attendees.attending.length > 0 ? (
                      <div className="space-y-2">
                        {attendees.attending.map((rsvp) => (
                          <div key={rsvp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {rsvp.user?.name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {rsvp.user?.email}
                              </div>
                              {rsvp.attendeeCount > 1 && (
                                <div className="text-xs text-green-600">
                                  +{rsvp.attendeeCount - 1} guest{rsvp.attendeeCount > 2 ? 's' : ''}
                                </div>
                              )}
                            </div>
                            <UserIcon className="h-4 w-4 text-green-600" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No one attending yet</p>
                    )}
                  </div>

                  {/* Maybe */}
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <QuestionMarkCircleIcon className="h-5 w-5 text-yellow-600 mr-2" />
                      <h4 className="font-medium text-yellow-900">
                        Maybe ({attendees.maybe.length})
                      </h4>
                    </div>
                    {attendees.maybe.length > 0 ? (
                      <div className="space-y-2">
                        {attendees.maybe.map((rsvp) => (
                          <div key={rsvp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {rsvp.user?.name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {rsvp.user?.email}
                              </div>
                            </div>
                            <UserIcon className="h-4 w-4 text-yellow-600" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No maybes</p>
                    )}
                  </div>

                  {/* Declined */}
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center mb-3">
                      <XCircleIcon className="h-5 w-5 text-red-600 mr-2" />
                      <h4 className="font-medium text-red-900">
                        Declined ({attendees.declined.length})
                      </h4>
                    </div>
                    {attendees.declined.length > 0 ? (
                      <div className="space-y-2">
                        {attendees.declined.map((rsvp) => (
                          <div key={rsvp.id} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {rsvp.user?.name || 'Unknown User'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {rsvp.user?.email}
                              </div>
                            </div>
                            <UserIcon className="h-4 w-4 text-red-600" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No declines</p>
                    )}
                  </div>
                </div>
              )}
              
              {/* Summary */}
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-medium text-gray-900 mb-2">Summary</h5>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Total RSVPs:</span>
                    <span className="ml-2 font-medium">{rsvps.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Attending:</span>
                    <span className="ml-2 font-medium text-green-600">{attendees.attending.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Maybe:</span>
                    <span className="ml-2 font-medium text-yellow-600">{attendees.maybe.length}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">Declined:</span>
                    <span className="ml-2 font-medium text-red-600">{attendees.declined.length}</span>
                  </div>
                </div>
                {event.maxAttendees && (
                  <div className="mt-2 text-sm">
                    <span className="text-gray-600">Capacity:</span>
                    <span className="ml-2 font-medium">
                      {attendees.attending.reduce((sum, rsvp) => sum + (rsvp.attendeeCount || 1), 0)} / {event.maxAttendees}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

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

  if (error) {
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

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Events</h1>
            <p className="mt-1 text-sm text-gray-500">
              {events.length} event{events.length !== 1 ? 's' : ''} scheduled
              {isAdmin() && ' • Admin View'}
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

        {/* Create Event Form - Same as before */}
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
                  min={new Date().toISOString().slice(0, 16)}
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

        {/* Events Display */}
        {events.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event) => {
              try {
                const userRSVP = getUserRSVP(event);
                const isPast = isEventPast(event.eventDate);
                const attendees = getAttendeesByStatus(event);
                const totalAttending = attendees.attending.reduce((sum, rsvp) => sum + (rsvp.attendeeCount || 1), 0);
                
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
                            {totalAttending} attending
                            {event.maxAttendees && ` (max ${event.maxAttendees})`}
                          </span>
                        </div>
                      </div>

                      {event.description && (
                        <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                          {event.description}
                        </p>
                      )}

                      {/* Admin View: Show attendee management */}
                      {isAdmin() ? (
                        <div className="space-y-3">
                          {/* Quick stats */}
                          <div className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 p-2 rounded">
                            <span>{attendees.attending.length} attending</span>
                            <span>{attendees.maybe.length} maybe</span>
                            <span>{attendees.declined.length} declined</span>
                          </div>
                          
                          {/* View attendees button */}
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => setSelectedEventForRSVPs(event)}
                            className="w-full"
                          >
                            <UsersIcon className="h-4 w-4 mr-2" />
                            View Attendees ({event.rsvps?.length || 0} RSVPs)
                          </Button>
                        </div>
                      ) : (
                        /* Student View: Show RSVP buttons */
                        !isPast && (
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
                        )
                      )}

                      {/* Student RSVP status display */}
                      {!isAdmin() && userRSVP && (
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

                      {/* Meeting Link for Virtual Events (for attendees) */}
                      {event.isVirtual && event.meetingLink && (
                        (isAdmin() || userRSVP?.status === 'attending')
                      ) && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <a
                            href={event.meetingLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center"
                          >
                            <VideoCameraIcon className="h-4 w-4 mr-1" />
                            {isAdmin() ? 'Meeting Link' : 'Join Meeting'}
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

        {/* RSVP Details Modal */}
        {selectedEventForRSVPs && (
          <RSVPModal 
            event={selectedEventForRSVPs} 
            onClose={() => setSelectedEventForRSVPs(null)} 
          />
        )}

        {/* Loading indicator */}
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

        {/* Admin help text */}
        {isAdmin() && events.length > 0 && (
          <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Admin Features</h4>
            <div className="text-sm text-blue-800 space-y-1">
              <p>• <strong>View Attendees:</strong> Click "View Attendees" to see who's attending, maybe, or declined</p>
              <p>• <strong>Event Management:</strong> Create, edit, and manage all events</p>
              <p>• <strong>RSVP Tracking:</strong> Monitor attendance and capacity in real-time</p>
              <p>• <strong>Contact Information:</strong> Access attendee email addresses for communication</p>
            </div>
          </div>
        )}

        {/* Debug info in development */}
        {import.meta.env.DEV && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Debug Info</h4>
            <div className="text-xs text-gray-600 space-y-1">
              <p>Events loaded: {events.length}</p>
              <p>User ID: {user?.id}</p>
              <p>User role: {user?.role}</p>
              <p>Is Admin: {isAdmin().toString()}</p>
              <p>Can create events: {canCreateEvents().toString()}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;

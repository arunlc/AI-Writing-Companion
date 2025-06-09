// backend/routes/events.js - COMPLETELY FIXED VERSION
const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

// Custom middleware to handle empty strings and null values in optional fields
const sanitizeEventFields = (req, res, next) => {
  // Convert empty strings to undefined for optional fields
  if (req.body.meetingLink === '') {
    req.body.meetingLink = undefined;
  }
  if (req.body.location === '') {
    req.body.location = undefined;
  }
  if (req.body.description === '') {
    req.body.description = undefined;
  }
  // Convert null or empty string to undefined for maxAttendees
  if (req.body.maxAttendees === null || req.body.maxAttendees === '') {
    req.body.maxAttendees = undefined;
  }
  next();
};

// GET /api/events - Get all events
router.get('/', authenticateToken, async (req, res) => {
  try {
    console.log('📅 Fetching all events for user:', req.user.id);
    
    const events = await prisma.event.findMany({
      where: { isActive: true },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      },
      orderBy: { eventDate: 'asc' }
    });

    console.log(`✅ Found ${events.length} events`);
    res.json(events);
  } catch (error) {
    console.error('❌ Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events - Create new event
router.post('/', authenticateToken, sanitizeEventFields, [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required'),
  body('description').optional({ nullable: true, checkFalsy: true }).trim(),
  body('eventDate').isISO8601().withMessage('Valid event date is required'),
  body('location').optional({ nullable: true, checkFalsy: true }).trim(),
  body('isVirtual').isBoolean().withMessage('isVirtual must be boolean'),
  body('meetingLink')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('Meeting link must be valid URL if provided'),
  body('maxAttendees')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Max attendees must be positive number if provided')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ Event validation errors:', errors.array());
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  // Check permissions
  if (!['ADMIN', 'OPERATIONS', 'SALES'].includes(req.user.role)) {
    return res.status(403).json({ error: 'Not authorized to create events' });
  }

  const { title, description, eventDate, location, isVirtual, meetingLink, maxAttendees } = req.body;

  try {
    const event = await prisma.event.create({
      data: {
        title,
        description: description && description.trim() ? description.trim() : null,
        eventDate: new Date(eventDate),
        location: location && location.trim() ? location.trim() : null,
        isVirtual,
        meetingLink: meetingLink && meetingLink.trim() ? meetingLink.trim() : null,
        maxAttendees: maxAttendees ? parseInt(maxAttendees) : null,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        rsvps: true
      }
    });

    console.log('✅ Event created successfully:', {
      id: event.id,
      title: event.title,
      eventDate: event.eventDate,
      isVirtual: event.isVirtual
    });

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('❌ Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// ✅ FIXED: POST /api/events/:id/rsvp - RSVP to event
router.post('/:id/rsvp', authenticateToken, [
  param('id').notEmpty().withMessage('Event ID is required'),
  body('status').isIn(['attending', 'maybe', 'declined']).withMessage('Invalid RSVP status'),
  body('attendeeCount').optional().isInt({ min: 1 }).withMessage('Attendee count must be positive'),
  body('dietaryReqs').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.error('❌ RSVP validation errors:', errors.array());
    return res.status(400).json({ 
      error: 'Validation failed', 
      details: errors.array() 
    });
  }

  const { id } = req.params;
  const { status, attendeeCount = 1, dietaryReqs, notes } = req.body;

  console.log(`📝 Processing RSVP for event ${id} by user ${req.user.id}:`, {
    status,
    attendeeCount,
    dietaryReqs,
    notes
  });

  try {
    // ✅ FIXED: Check if event exists with better error handling
    const event = await prisma.event.findUnique({
      where: { id },
      include: { 
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true }
            }
          }
        }
      }
    });

    if (!event) {
      console.error(`❌ Event not found: ${id}`);
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.isActive) {
      console.error(`❌ Event is not active: ${id}`);
      return res.status(400).json({ error: 'Event is not active' });
    }

    // Check if event is in the past
    if (new Date(event.eventDate) < new Date()) {
      console.error(`❌ Event is in the past: ${id}`);
      return res.status(400).json({ error: 'Cannot RSVP to past events' });
    }

    // ✅ FIXED: Check max attendees if status is attending
    if (status === 'attending' && event.maxAttendees) {
      const currentAttendees = event.rsvps
        .filter(rsvp => rsvp.status === 'attending')
        .reduce((sum, rsvp) => sum + (rsvp.attendeeCount || 1), 0);
      
      const requestedCount = parseInt(attendeeCount) || 1;
      
      // Check if user already has an RSVP and subtract their current count
      const existingRsvp = event.rsvps.find(rsvp => rsvp.userId === req.user.id);
      const existingCount = existingRsvp && existingRsvp.status === 'attending' 
        ? existingRsvp.attendeeCount || 1 
        : 0;
      
      const newTotal = currentAttendees - existingCount + requestedCount;
      
      if (newTotal > event.maxAttendees) {
        console.error(`❌ Event at capacity: ${newTotal} > ${event.maxAttendees}`);
        return res.status(400).json({ 
          error: 'Event is at maximum capacity',
          details: {
            maxAttendees: event.maxAttendees,
            currentAttendees: currentAttendees - existingCount,
            requestedCount
          }
        });
      }
    }

    // ✅ FIXED: Upsert RSVP with proper constraint name
    console.log(`📝 Creating/updating RSVP for user ${req.user.id} to event ${id}`);
    
    const rsvp = await prisma.eventRsvp.upsert({
      where: {
        eventId_userId: {  // ✅ FIXED: Use the correct unique constraint name
          eventId: id,
          userId: req.user.id
        }
      },
      update: {
        status,
        attendeeCount: parseInt(attendeeCount) || 1,
        dietaryReqs: dietaryReqs && dietaryReqs.trim() ? dietaryReqs.trim() : null,
        notes: notes && notes.trim() ? notes.trim() : null,
        updatedAt: new Date()
      },
      create: {
        eventId: id,
        userId: req.user.id,
        status,
        attendeeCount: parseInt(attendeeCount) || 1,
        dietaryReqs: dietaryReqs && dietaryReqs.trim() ? dietaryReqs.trim() : null,
        notes: notes && notes.trim() ? notes.trim() : null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        },
        event: {
          select: { id: true, title: true }
        }
      }
    });

    console.log('✅ RSVP created/updated successfully:', {
      rsvpId: rsvp.id,
      userId: rsvp.userId,
      eventId: rsvp.eventId,
      status: rsvp.status
    });

    res.json({
      message: 'RSVP updated successfully',
      rsvp
    });
  } catch (error) {
    console.error('❌ RSVP error:', error);
    
    // ✅ IMPROVED: Better error handling
    if (error.code === 'P2002') {
      // Unique constraint violation
      return res.status(409).json({ 
        error: 'RSVP already exists for this user and event',
        details: 'Please try refreshing the page'
      });
    }
    
    if (error.code === 'P2025') {
      // Record not found
      return res.status(404).json({ 
        error: 'Event not found or user not found'
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to update RSVP',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// GET /api/events/:id/rsvps - Get event RSVPs
router.get('/:id/rsvps', authenticateToken, [
  param('id').notEmpty().withMessage('Event ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id },
      include: {
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true }
            }
          },
          orderBy: { rsvpAt: 'desc' }
        }
      }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Only allow event creator or admin to see all RSVPs
    if (req.user.role !== 'ADMIN' && event.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to view RSVPs' });
    }

    res.json({ rsvps: event.rsvps });
  } catch (error) {
    console.error('❌ Get RSVPs error:', error);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', authenticateToken, sanitizeEventFields, [
  param('id').notEmpty().withMessage('Event ID is required'),
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional({ nullable: true, checkFalsy: true }).trim(),
  body('eventDate').optional().isISO8601(),
  body('location').optional({ nullable: true, checkFalsy: true }).trim(),
  body('isVirtual').optional().isBoolean(),
  body('meetingLink')
    .optional({ nullable: true, checkFalsy: true })
    .isURL()
    .withMessage('Meeting link must be valid URL if provided'),
  body('maxAttendees')
    .optional({ nullable: true, checkFalsy: true })
    .isInt({ min: 1 })
    .withMessage('Max attendees must be positive number if provided')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN' && event.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to update this event' });
    }

    const updateData = {};
    const { title, description, eventDate, location, isVirtual, meetingLink, maxAttendees } = req.body;

    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description && description.trim() ? description.trim() : null;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (location !== undefined) updateData.location = location && location.trim() ? location.trim() : null;
    if (isVirtual !== undefined) updateData.isVirtual = isVirtual;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink && meetingLink.trim() ? meetingLink.trim() : null;
    if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees ? parseInt(maxAttendees) : null;

    const updatedEvent = await prisma.event.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        rsvps: {
          include: {
            user: {
              select: { id: true, name: true, email: true }
            }
          }
        }
      }
    });

    res.json({
      message: 'Event updated successfully',
      event: updatedEvent
    });
  } catch (error) {
    console.error('❌ Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - Delete/deactivate event
router.delete('/:id', authenticateToken, [
  param('id').notEmpty().withMessage('Event ID is required')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { id } = req.params;

  try {
    const event = await prisma.event.findUnique({
      where: { id }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Check permissions
    if (req.user.role !== 'ADMIN' && event.createdById !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to delete this event' });
    }

    // Soft delete by setting isActive to false
    await prisma.event.update({
      where: { id },
      data: { isActive: false }
    });

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('❌ Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;

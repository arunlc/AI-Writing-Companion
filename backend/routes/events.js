const express = require('express');
const { body, validationResult, param } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('./auth');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/events - Get all events
router.get('/', authenticateToken, async (req, res) => {
  try {
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

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// POST /api/events - Create new event
router.post('/', authenticateToken, [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required'),
  body('description').optional().trim(),
  body('eventDate').isISO8601().withMessage('Valid event date is required'),
  body('location').optional().trim(),
  body('isVirtual').isBoolean().withMessage('isVirtual must be boolean'),
  body('meetingLink').optional().isURL().withMessage('Meeting link must be valid URL'),
  body('maxAttendees').optional().isInt({ min: 1 }).withMessage('Max attendees must be positive number')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
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
        description: description || null,
        eventDate: new Date(eventDate),
        location: location || null,
        isVirtual,
        meetingLink: meetingLink || null,
        maxAttendees: maxAttendees || null,
        createdById: req.user.id
      },
      include: {
        createdBy: {
          select: { id: true, name: true, role: true }
        },
        rsvps: true
      }
    });

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// POST /api/events/:id/rsvp - RSVP to event
router.post('/:id/rsvp', authenticateToken, [
  param('id').isUUID().withMessage('Invalid event ID'),
  body('status').isIn(['attending', 'maybe', 'declined']).withMessage('Invalid RSVP status'),
  body('attendeeCount').optional().isInt({ min: 1 }).withMessage('Attendee count must be positive'),
  body('dietaryReqs').optional().trim(),
  body('notes').optional().trim()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ error: 'Validation failed', details: errors.array() });
  }

  const { id } = req.params;
  const { status, attendeeCount = 1, dietaryReqs, notes } = req.body;

  try {
    // Check if event exists
    const event = await prisma.event.findUnique({
      where: { id },
      include: { rsvps: true }
    });

    if (!event) {
      return res.status(404).json({ error: 'Event not found' });
    }

    if (!event.isActive) {
      return res.status(400).json({ error: 'Event is not active' });
    }

    // Check if event is in the past
    if (new Date(event.eventDate) < new Date()) {
      return res.status(400).json({ error: 'Cannot RSVP to past events' });
    }

    // Check max attendees if status is attending
    if (status === 'attending' && event.maxAttendees) {
      const currentAttendees = event.rsvps.filter(rsvp => rsvp.status === 'attending')
        .reduce((sum, rsvp) => sum + rsvp.attendeeCount, 0);
      
      if (currentAttendees + attendeeCount > event.maxAttendees) {
        return res.status(400).json({ error: 'Event is at maximum capacity' });
      }
    }

    // Upsert RSVP
    const rsvp = await prisma.eventRsvp.upsert({
      where: {
        eventId_userId: {
          eventId: id,
          userId: req.user.id
        }
      },
      update: {
        status,
        attendeeCount,
        dietaryReqs: dietaryReqs || null,
        notes: notes || null,
        updatedAt: new Date()
      },
      create: {
        eventId: id,
        userId: req.user.id,
        status,
        attendeeCount,
        dietaryReqs: dietaryReqs || null,
        notes: notes || null
      },
      include: {
        user: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    res.json({
      message: 'RSVP updated successfully',
      rsvp
    });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ error: 'Failed to update RSVP' });
  }
});

// GET /api/events/:id/rsvps - Get event RSVPs
router.get('/:id/rsvps', authenticateToken, [
  param('id').isUUID().withMessage('Invalid event ID')
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
    console.error('Get RSVPs error:', error);
    res.status(500).json({ error: 'Failed to fetch RSVPs' });
  }
});

// PUT /api/events/:id - Update event
router.put('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid event ID'),
  body('title').optional().trim().isLength({ min: 1, max: 255 }),
  body('description').optional().trim(),
  body('eventDate').optional().isISO8601(),
  body('location').optional().trim(),
  body('isVirtual').optional().isBoolean(),
  body('meetingLink').optional().isURL(),
  body('maxAttendees').optional().isInt({ min: 1 })
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
    if (description !== undefined) updateData.description = description || null;
    if (eventDate !== undefined) updateData.eventDate = new Date(eventDate);
    if (location !== undefined) updateData.location = location || null;
    if (isVirtual !== undefined) updateData.isVirtual = isVirtual;
    if (meetingLink !== undefined) updateData.meetingLink = meetingLink || null;
    if (maxAttendees !== undefined) updateData.maxAttendees = maxAttendees || null;

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
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// DELETE /api/events/:id - Delete/deactivate event
router.delete('/:id', authenticateToken, [
  param('id').isUUID().withMessage('Invalid event ID')
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
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

module.exports = router;

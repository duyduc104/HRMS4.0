const express = require('express');
const router = express.Router();
const scheduledEventController = require('../controllers/scheduledEventController');
const googleCalendarController = require('../controllers/googleCalendarController');
const authMiddleware = require('../middleware/authMiddleware');

// Google Calendar OAuth Routes
router.get('/google/auth-url', authMiddleware, googleCalendarController.getAuthUrl);
router.get('/google/callback', googleCalendarController.googleCallback); // Không dùng authMiddleware vì được redirect từ Google

router.get('/', authMiddleware, scheduledEventController.getEvents);
router.post('/email', authMiddleware, scheduledEventController.scheduleEmail);
router.post('/meeting', authMiddleware, scheduledEventController.scheduleMeeting);
router.put('/:id', authMiddleware, scheduledEventController.updateEvent);
router.delete('/:id', authMiddleware, scheduledEventController.deleteEvent);

module.exports = router;

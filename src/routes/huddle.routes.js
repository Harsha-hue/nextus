const express = require('express');
const router = express.Router();

const huddleController = require('../controllers/huddle.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All huddle routes require authentication
router.use(authenticate);

// Create a new huddle
router.post('/', huddleController.createHuddle);

// Get active huddle in a channel
router.get('/channel/:channelId', huddleController.getChannelHuddle);

// Get huddle by ID
router.get('/:id', huddleController.getHuddle);

// Join a huddle
router.post('/:id/join', huddleController.joinHuddle);

// Leave a huddle
router.post('/:id/leave', huddleController.leaveHuddle);

// End a huddle
router.post('/:id/end', huddleController.endHuddle);

// Update participant status
router.patch('/:id/status', huddleController.updateStatus);

module.exports = router;

const express = require('express');
const router = express.Router();

const userController = require('../controllers/user.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
    updateProfileValidator,
    updateStatusValidator,
    updatePresenceValidator,
    userIdValidator,
} = require('../validators/user.validator');

// All user routes require authentication
router.use(authenticate);

// Current user routes
router.get('/me', userController.getMe);
router.patch('/me', updateProfileValidator, validate, userController.updateMe);
router.patch('/me/status', updateStatusValidator, validate, userController.updateStatus);
router.patch('/me/presence', updatePresenceValidator, validate, userController.updatePresence);

// Search
router.get('/search', userController.searchUsers);

// Other user routes
router.get('/:id', userIdValidator, validate, userController.getUser);

module.exports = router;

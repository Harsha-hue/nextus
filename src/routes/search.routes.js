const express = require('express');
const router = express.Router();

const searchController = require('../controllers/search.controller');
const { authenticate } = require('../middleware/auth.middleware');

// All search routes require authentication
router.use(authenticate);

// Global search
router.get('/', searchController.globalSearch);

// Search messages
router.get('/messages', searchController.searchMessages);

// Search channels
router.get('/channels', searchController.searchChannels);

// Search users
router.get('/users', searchController.searchUsers);

// Search files
router.get('/files', searchController.searchFiles);

module.exports = router;

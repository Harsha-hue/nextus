const express = require('express');
const router = express.Router();

// Import all route modules
const authRoutes = require('./auth.routes');
const workspaceRoutes = require('./workspace.routes');
const channelRoutes = require('./channel.routes');
const messageRoutes = require('./message.routes');
const userRoutes = require('./user.routes');
const fileRoutes = require('./file.routes');
const searchRoutes = require('./search.routes');
const notificationRoutes = require('./notification.routes');
const huddleRoutes = require('./huddle.routes');

// Health check endpoint
router.get('/health', (req, res) => {
    res.json({
        success: true,
        message: 'Nextus API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
    });
});

// Mount routes
router.use('/auth', authRoutes);
router.use('/workspaces', workspaceRoutes);
router.use('/channels', channelRoutes);
router.use('/messages', messageRoutes);
router.use('/users', userRoutes);
router.use('/files', fileRoutes);
router.use('/search', searchRoutes);
router.use('/notifications', notificationRoutes);
router.use('/huddles', huddleRoutes);

module.exports = router;

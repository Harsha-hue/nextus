const express = require('express');
const router = express.Router();

const channelController = require('../controllers/channel.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { workspaceAccess, channelAccess, adminAccess } = require('../middleware/workspace-access.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
    createChannelValidator,
    updateChannelValidator,
    addChannelMemberValidator,
    channelIdValidator,
} = require('../validators/channel.validator');

// All channel routes require authentication
router.use(authenticate);

// Workspace channel routes
router.get('/workspace/:workspaceId/channels', workspaceAccess, channelController.getChannels);
router.post('/workspace/:workspaceId/channels', workspaceAccess, createChannelValidator, validate, channelController.createChannel);

// Individual channel routes
router.get('/:id', channelIdValidator, validate, channelAccess, channelController.getChannel);
router.patch('/:id', channelIdValidator, validate, channelAccess, updateChannelValidator, validate, channelController.updateChannel);
router.delete('/:id', channelIdValidator, validate, channelAccess, channelController.deleteChannel);

// Archive/unarchive
router.post('/:id/archive', channelIdValidator, validate, channelAccess, channelController.archiveChannel);
router.post('/:id/unarchive', channelIdValidator, validate, channelAccess, channelController.unarchiveChannel);

// Member management (for private channels)
router.get('/:id/members', channelIdValidator, validate, channelAccess, channelController.getMembers);
router.post('/:id/members', channelIdValidator, validate, channelAccess, addChannelMemberValidator, validate, channelController.addMember);
router.delete('/:id/members/:userId', channelIdValidator, validate, channelAccess, channelController.removeMember);

module.exports = router;

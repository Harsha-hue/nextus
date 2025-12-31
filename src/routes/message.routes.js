const express = require('express');
const router = express.Router();

const messageController = require('../controllers/message.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { channelAccess } = require('../middleware/workspace-access.middleware');
const { messageLimiter } = require('../middleware/rate-limit.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
    sendMessageValidator,
    updateMessageValidator,
    messageIdValidator,
    getMessagesValidator,
    addReactionValidator,
    removeReactionValidator,
    threadMessageValidator,
} = require('../validators/message.validator');

// All message routes require authentication
router.use(authenticate);

// Channel message routes
router.get('/channel/:channelId/messages', channelAccess, getMessagesValidator, validate, messageController.getMessages);
router.post('/channel/:channelId/messages', channelAccess, messageLimiter, sendMessageValidator, validate, messageController.sendMessage);
router.get('/channel/:channelId/pins', channelAccess, messageController.getPinnedMessages);

// Individual message routes
router.get('/:id', messageIdValidator, validate, messageController.getMessage);
router.patch('/:id', updateMessageValidator, validate, messageController.updateMessage);
router.delete('/:id', messageIdValidator, validate, messageController.deleteMessage);

// Reactions
router.post('/:id/reactions', addReactionValidator, validate, messageController.addReaction);
router.delete('/:id/reactions/:emoji', removeReactionValidator, validate, messageController.removeReaction);

// Threads
router.get('/:id/threads', messageIdValidator, validate, messageController.getThreadMessages);
router.post('/:id/threads', threadMessageValidator, validate, messageController.replyToMessage);

// Pin/unpin
router.post('/:id/pin', messageIdValidator, validate, messageController.pinMessage);
router.delete('/:id/pin', messageIdValidator, validate, messageController.unpinMessage);

// DM (Direct Message) routes
router.get('/workspace/:workspaceId/dms', messageController.getDmConversations);
router.post('/workspace/:workspaceId/dms', messageController.createDmConversation);
router.get('/dm/:conversationId', messageController.getDmMessages);
router.post('/dm/:conversationId', messageLimiter, messageController.sendDmMessage);

module.exports = router;


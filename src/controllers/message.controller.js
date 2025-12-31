const messageService = require('../services/message.service');
const { success } = require('../utils/response.utils');

/**
 * Send message
 * POST /api/v1/channels/:channelId/messages
 */
const sendMessage = async (req, res, next) => {
    try {
        const message = await messageService.sendMessage(
            { ...req.body, workspaceId: req.channel?.workspace_id },
            req.params.channelId,
            req.user
        );
        res.status(201).json(success(message, 'Message sent successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get messages
 * GET /api/v1/channels/:channelId/messages
 */
const getMessages = async (req, res, next) => {
    try {
        const { limit, before, after } = req.query;
        const messages = await messageService.getMessages(req.params.channelId, {
            limit: parseInt(limit) || 50,
            before,
            after,
        });
        res.json(success(messages, 'Messages retrieved successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get message by ID
 * GET /api/v1/messages/:id
 */
const getMessage = async (req, res, next) => {
    try {
        const message = await messageService.getMessageById(req.params.id);
        res.json(success(message, 'Message retrieved successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Update message
 * PATCH /api/v1/messages/:id
 */
const updateMessage = async (req, res, next) => {
    try {
        const { content } = req.body;
        const message = await messageService.updateMessage(req.params.id, content, req.userId);
        res.json(success(message, 'Message updated successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Delete message
 * DELETE /api/v1/messages/:id
 */
const deleteMessage = async (req, res, next) => {
    try {
        await messageService.deleteMessage(req.params.id, req.userId);
        res.json(success(null, 'Message deleted successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Add reaction to message
 * POST /api/v1/messages/:id/reactions
 */
const addReaction = async (req, res, next) => {
    try {
        const { emoji } = req.body;
        const message = await messageService.addReaction(req.params.id, emoji, req.userId);
        res.status(201).json(success(message, 'Reaction added'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Remove reaction from message
 * DELETE /api/v1/messages/:id/reactions/:emoji
 */
const removeReaction = async (req, res, next) => {
    try {
        const message = await messageService.removeReaction(
            req.params.id,
            decodeURIComponent(req.params.emoji),
            req.userId
        );
        res.json(success(message, 'Reaction removed'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get thread messages
 * GET /api/v1/messages/:id/threads
 */
const getThreadMessages = async (req, res, next) => {
    try {
        const { limit } = req.query;
        const messages = await messageService.getThreadMessages(req.params.id, {
            limit: parseInt(limit) || 50,
        });
        res.json(success(messages, 'Thread messages retrieved successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Reply to message (create thread message)
 * POST /api/v1/messages/:id/threads
 */
const replyToMessage = async (req, res, next) => {
    try {
        // Get parent message to get channel ID
        const parentMessage = await messageService.getMessageById(req.params.id);

        const message = await messageService.sendMessage(
            { ...req.body, replyToId: req.params.id, workspaceId: parentMessage.workspaceId },
            parentMessage.channelId,
            req.user
        );
        res.status(201).json(success(message, 'Reply sent successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Pin message
 * POST /api/v1/messages/:id/pin
 */
const pinMessage = async (req, res, next) => {
    try {
        const message = await messageService.pinMessage(req.params.id);
        res.json(success(message, 'Message pinned successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Unpin message
 * DELETE /api/v1/messages/:id/pin
 */
const unpinMessage = async (req, res, next) => {
    try {
        const message = await messageService.unpinMessage(req.params.id);
        res.json(success(message, 'Message unpinned successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get pinned messages
 * GET /api/v1/channels/:channelId/pins
 */
const getPinnedMessages = async (req, res, next) => {
    try {
        const messages = await messageService.getPinnedMessages(req.params.channelId);
        res.json(success(messages, 'Pinned messages retrieved successfully'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get DM conversations for a workspace
 * GET /api/v1/messages/workspace/:workspaceId/dms
 */
const getDmConversations = async (req, res, next) => {
    try {
        const conversations = await messageService.getDmConversations(
            req.params.workspaceId,
            req.userId
        );
        res.json(success(conversations, 'DM conversations retrieved'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Create or get DM conversation
 * POST /api/v1/messages/workspace/:workspaceId/dms
 */
const createDmConversation = async (req, res, next) => {
    try {
        const { user_id } = req.body;
        const conversation = await messageService.getOrCreateDmConversation(
            req.params.workspaceId,
            req.userId,
            user_id
        );
        res.status(201).json(success(conversation, 'DM conversation created'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Get DM messages
 * GET /api/v1/messages/dm/:conversationId
 */
const getDmMessages = async (req, res, next) => {
    try {
        const { limit, before } = req.query;
        const messages = await messageService.getDmMessages(
            req.params.conversationId,
            req.userId,
            {
                limit: parseInt(limit) || 50,
                before,
            }
        );
        res.json(success(messages, 'DM messages retrieved'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

/**
 * Send DM message
 * POST /api/v1/messages/dm/:conversationId
 */
const sendDmMessage = async (req, res, next) => {
    try {
        const { content } = req.body;
        const message = await messageService.sendDmMessage(
            req.params.conversationId,
            req.userId,
            content
        );
        res.status(201).json(success(message, 'DM sent'));
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                success: false,
                error: error.message,
            });
        }
        next(error);
    }
};

module.exports = {
    sendMessage,
    getMessages,
    getMessage,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    getThreadMessages,
    replyToMessage,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    getDmConversations,
    createDmConversation,
    getDmMessages,
    sendDmMessage,
};


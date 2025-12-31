const channelService = require('../services/channel.service');
const { success } = require('../utils/response.utils');

/**
 * Create channel
 * POST /api/v1/workspaces/:workspaceId/channels
 */
const createChannel = async (req, res, next) => {
    try {
        const channel = await channelService.createChannel(
            req.body,
            req.params.workspaceId,
            req.userId
        );
        res.status(201).json(success(channel, 'Channel created successfully'));
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
 * Get workspace channels
 * GET /api/v1/workspaces/:workspaceId/channels
 */
const getChannels = async (req, res, next) => {
    try {
        const channels = await channelService.getWorkspaceChannels(
            req.params.workspaceId,
            req.userId
        );
        res.json(success(channels, 'Channels retrieved successfully'));
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
 * Get channel by ID
 * GET /api/v1/channels/:id
 */
const getChannel = async (req, res, next) => {
    try {
        const channel = await channelService.getChannelById(req.params.id);
        res.json(success(channel, 'Channel retrieved successfully'));
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
 * Update channel
 * PATCH /api/v1/channels/:id
 */
const updateChannel = async (req, res, next) => {
    try {
        const channel = await channelService.updateChannel(req.params.id, req.body);
        res.json(success(channel, 'Channel updated successfully'));
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
 * Delete channel
 * DELETE /api/v1/channels/:id
 */
const deleteChannel = async (req, res, next) => {
    try {
        await channelService.deleteChannel(req.params.id);
        res.json(success(null, 'Channel deleted successfully'));
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
 * Archive channel
 * POST /api/v1/channels/:id/archive
 */
const archiveChannel = async (req, res, next) => {
    try {
        const channel = await channelService.archiveChannel(req.params.id);
        res.json(success(channel, 'Channel archived successfully'));
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
 * Unarchive channel
 * POST /api/v1/channels/:id/unarchive
 */
const unarchiveChannel = async (req, res, next) => {
    try {
        const channel = await channelService.unarchiveChannel(req.params.id);
        res.json(success(channel, 'Channel unarchived successfully'));
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
 * Get channel members
 * GET /api/v1/channels/:id/members
 */
const getMembers = async (req, res, next) => {
    try {
        const members = await channelService.getChannelMembers(req.params.id);
        res.json(success(members, 'Channel members retrieved successfully'));
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
 * Add member to channel
 * POST /api/v1/channels/:id/members
 */
const addMember = async (req, res, next) => {
    try {
        const { userId, role } = req.body;
        const member = await channelService.addChannelMember(req.params.id, userId, role);
        res.status(201).json(success(member, 'Member added to channel'));
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
 * Remove member from channel
 * DELETE /api/v1/channels/:id/members/:userId
 */
const removeMember = async (req, res, next) => {
    try {
        await channelService.removeChannelMember(req.params.id, req.params.userId);
        res.json(success(null, 'Member removed from channel'));
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
    createChannel,
    getChannels,
    getChannel,
    updateChannel,
    deleteChannel,
    archiveChannel,
    unarchiveChannel,
    getMembers,
    addMember,
    removeMember,
};

const huddleService = require('../services/huddle.service');
const { success } = require('../utils/response.utils');

/**
 * Create a new huddle
 * POST /api/v1/huddles
 */
const createHuddle = async (req, res, next) => {
    try {
        const { channelId, workspaceId, type } = req.body;

        if (!channelId || !workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Channel ID and Workspace ID are required',
            });
        }

        // Check if there's already an active huddle in the channel
        const existingHuddle = await huddleService.getChannelHuddle(channelId);
        if (existingHuddle) {
            return res.status(400).json({
                success: false,
                error: 'There is already an active huddle in this channel',
                data: existingHuddle,
            });
        }

        const huddle = await huddleService.createHuddle({
            channelId,
            workspaceId,
            creatorId: req.userId,
            type: type || 'audio',
        });

        res.status(201).json(success(huddle, 'Huddle created successfully'));
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
 * Get huddle by ID
 * GET /api/v1/huddles/:id
 */
const getHuddle = async (req, res, next) => {
    try {
        const huddle = await huddleService.getChannelHuddle(req.params.id);

        if (!huddle) {
            return res.status(404).json({
                success: false,
                error: 'Huddle not found',
            });
        }

        res.json(success(huddle, 'Huddle retrieved successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Get active huddle in a channel
 * GET /api/v1/huddles/channel/:channelId
 */
const getChannelHuddle = async (req, res, next) => {
    try {
        const huddle = await huddleService.getChannelHuddle(req.params.channelId);
        res.json(success(huddle, huddle ? 'Huddle found' : 'No active huddle'));
    } catch (error) {
        next(error);
    }
};

/**
 * Join a huddle
 * POST /api/v1/huddles/:id/join
 */
const joinHuddle = async (req, res, next) => {
    try {
        const huddle = await huddleService.joinHuddle(req.params.id, req.userId);
        res.json(success(huddle, 'Joined huddle successfully'));
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
 * Leave a huddle
 * POST /api/v1/huddles/:id/leave
 */
const leaveHuddle = async (req, res, next) => {
    try {
        await huddleService.leaveHuddle(req.params.id, req.userId);
        res.json(success(null, 'Left huddle successfully'));
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
 * End a huddle
 * POST /api/v1/huddles/:id/end
 */
const endHuddle = async (req, res, next) => {
    try {
        await huddleService.endHuddle(req.params.id);
        res.json(success(null, 'Huddle ended successfully'));
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
 * Update participant status (mute, video, etc.)
 * PATCH /api/v1/huddles/:id/status
 */
const updateStatus = async (req, res, next) => {
    try {
        const { isMuted, isVideoOff, isScreenSharing } = req.body;

        const huddle = await huddleService.updateParticipantStatus(
            req.params.id,
            req.userId,
            { isMuted, isVideoOff, isScreenSharing }
        );

        res.json(success(huddle, 'Status updated successfully'));
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
    createHuddle,
    getHuddle,
    getChannelHuddle,
    joinHuddle,
    leaveHuddle,
    endHuddle,
    updateStatus,
};

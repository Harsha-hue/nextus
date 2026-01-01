const userService = require('../services/user.service');
const { success } = require('../utils/response.utils');

/**
 * Get current user profile
 * GET /api/v1/users/me
 */
const getMe = async (req, res, next) => {
    try {
        const user = await userService.getUserProfile(req.userId);
        res.json(success(user, 'Profile retrieved successfully'));
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
 * Update current user profile
 * PATCH /api/v1/users/me
 */
const updateMe = async (req, res, next) => {
    try {
        const user = await userService.updateUserProfile(req.userId, req.body);
        res.json(success(user, 'Profile updated successfully'));
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
 * Update current user status
 * PATCH /api/v1/users/me/status
 */
const updateStatus = async (req, res, next) => {
    try {
        const user = await userService.updateUserStatus(req.userId, req.body);
        res.json(success(user, 'Status updated successfully'));
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
 * Update current user presence
 * PATCH /api/v1/users/me/presence
 */
const updatePresence = async (req, res, next) => {
    try {
        const { status } = req.body;
        const user = await userService.updateUserPresence(req.userId, status);
        res.json(success(user, 'Presence updated successfully'));
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
 * Get user by ID
 * GET /api/v1/users/:id
 */
const getUser = async (req, res, next) => {
    try {
        const user = await userService.getUserById(req.params.id);
        res.json(success(user, 'User retrieved successfully'));
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
 * Search users
 * GET /api/v1/users/search
 */
const searchUsers = async (req, res, next) => {
    try {
        const { q, workspaceId, limit } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters',
            });
        }

        const users = await userService.searchUsers(q, workspaceId, parseInt(limit) || 20);
        res.json(success(users, 'Users retrieved successfully'));
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
 * Save FCM token for push notifications
 * POST /api/v1/users/fcm-token
 */
const saveFcmToken = async (req, res, next) => {
    try {
        const { fcmToken, platform } = req.body;

        if (!fcmToken) {
            return res.status(400).json({
                success: false,
                error: 'FCM token is required',
            });
        }

        await userService.saveFcmToken(req.userId, fcmToken, platform);
        res.json(success(null, 'FCM token saved successfully'));
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
 * Delete FCM token (on logout)
 * DELETE /api/v1/users/fcm-token
 */
const deleteFcmToken = async (req, res, next) => {
    try {
        const { fcmToken } = req.body;
        await userService.deleteFcmToken(req.userId, fcmToken);
        res.json(success(null, 'FCM token deleted successfully'));
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
    getMe,
    updateMe,
    updateStatus,
    updatePresence,
    getUser,
    searchUsers,
    saveFcmToken,
    deleteFcmToken,
};


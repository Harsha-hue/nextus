const searchService = require('../services/search.service');
const { success } = require('../utils/response.utils');

/**
 * Search messages
 * GET /api/v1/search/messages
 */
const searchMessages = async (req, res, next) => {
    try {
        const { q, workspaceId, channelId, userId, limit, before, after } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters',
            });
        }

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required',
            });
        }

        const results = await searchService.searchMessages(workspaceId, q, {
            limit: parseInt(limit) || 20,
            channelId,
            userId,
            before,
            after,
        });

        res.json(success(results, 'Search completed'));
    } catch (error) {
        next(error);
    }
};

/**
 * Search channels
 * GET /api/v1/search/channels
 */
const searchChannels = async (req, res, next) => {
    try {
        const { q, workspaceId } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters',
            });
        }

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required',
            });
        }

        const results = await searchService.searchChannels(workspaceId, q, req.userId);
        res.json(success(results, 'Search completed'));
    } catch (error) {
        next(error);
    }
};

/**
 * Search users
 * GET /api/v1/search/users
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

        const results = await searchService.searchUsers(
            workspaceId,
            q,
            parseInt(limit) || 20
        );
        res.json(success(results, 'Search completed'));
    } catch (error) {
        next(error);
    }
};

/**
 * Search files
 * GET /api/v1/search/files
 */
const searchFiles = async (req, res, next) => {
    try {
        const { q, workspaceId, fileType, channelId, limit } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters',
            });
        }

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required',
            });
        }

        const results = await searchService.searchFiles(workspaceId, q, {
            limit: parseInt(limit) || 20,
            fileType,
            channelId,
        });
        res.json(success(results, 'Search completed'));
    } catch (error) {
        next(error);
    }
};

/**
 * Global search
 * GET /api/v1/search
 */
const globalSearch = async (req, res, next) => {
    try {
        const { q, workspaceId, types, limit } = req.query;

        if (!q || q.length < 2) {
            return res.status(400).json({
                success: false,
                error: 'Search query must be at least 2 characters',
            });
        }

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required',
            });
        }

        const searchTypes = types ? types.split(',') : undefined;

        const results = await searchService.globalSearch(
            workspaceId,
            q,
            req.userId,
            {
                types: searchTypes,
                limit: parseInt(limit) || 10,
            }
        );
        res.json(success(results, 'Search completed'));
    } catch (error) {
        next(error);
    }
};

module.exports = {
    searchMessages,
    searchChannels,
    searchUsers,
    searchFiles,
    globalSearch,
};

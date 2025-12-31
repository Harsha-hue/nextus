const fileService = require('../services/file.service');
const { success, paginated, parsePagination } = require('../utils/response.utils');

/**
 * Upload file(s)
 * POST /api/v1/files/upload
 */
const uploadFile = async (req, res, next) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: 'No file provided',
            });
        }

        const { workspaceId, channelId, dmGroupId } = req.body;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required',
            });
        }

        const file = await fileService.uploadFile(
            req.file.buffer,
            req.file.originalname,
            req.file.mimetype,
            {
                workspaceId,
                channelId,
                dmGroupId,
                uploaderId: req.userId,
            }
        );

        res.status(201).json(success(file, 'File uploaded successfully'));
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
 * Get file by ID
 * GET /api/v1/files/:id
 */
const getFile = async (req, res, next) => {
    try {
        const file = await fileService.getFileById(req.params.id);
        res.json(success(file, 'File retrieved successfully'));
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
 * Get files for a channel
 * GET /api/v1/files/channel/:channelId
 */
const getChannelFiles = async (req, res, next) => {
    try {
        const pagination = parsePagination(req.query);
        const result = await fileService.getChannelFiles(req.params.channelId, pagination);

        res.json(paginated(result.files, {
            page: result.page,
            limit: result.limit,
            total: result.total,
        }, 'Files retrieved successfully'));
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
 * Get files for a workspace
 * GET /api/v1/files/workspace/:workspaceId
 */
const getWorkspaceFiles = async (req, res, next) => {
    try {
        const pagination = parsePagination(req.query);
        const { fileType } = req.query;

        const result = await fileService.getWorkspaceFiles(req.params.workspaceId, {
            ...pagination,
            fileType,
        });

        res.json(paginated(result.files, {
            page: result.page,
            limit: result.limit,
            total: result.total,
        }, 'Files retrieved successfully'));
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
 * Delete a file
 * DELETE /api/v1/files/:id
 */
const deleteFile = async (req, res, next) => {
    try {
        await fileService.deleteFile(req.params.id, req.userId);
        res.json(success(null, 'File deleted successfully'));
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
 * Get file download URL
 * GET /api/v1/files/:id/download
 */
const getDownloadUrl = async (req, res, next) => {
    try {
        const url = await fileService.getDownloadUrl(req.params.id);
        res.json(success({ url }, 'Download URL generated'));
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
    uploadFile,
    getFile,
    getChannelFiles,
    getWorkspaceFiles,
    deleteFile,
    getDownloadUrl,
};

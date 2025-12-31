const workspaceService = require('../services/workspace.service');
const { success, paginated, parsePagination } = require('../utils/response.utils');

/**
 * Create workspace
 * POST /api/v1/workspaces
 */
const createWorkspace = async (req, res, next) => {
    try {
        const workspace = await workspaceService.createWorkspace(req.body, req.userId);
        res.status(201).json(success(workspace, 'Workspace created successfully'));
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
 * Get user's workspaces
 * GET /api/v1/workspaces
 */
const getWorkspaces = async (req, res, next) => {
    try {
        const workspaces = await workspaceService.getUserWorkspaces(req.userId);
        res.json(success(workspaces, 'Workspaces retrieved successfully'));
    } catch (error) {
        next(error);
    }
};

/**
 * Get workspace by ID
 * GET /api/v1/workspaces/:id
 */
const getWorkspace = async (req, res, next) => {
    try {
        const workspace = await workspaceService.getWorkspaceById(req.params.id);
        res.json(success(workspace, 'Workspace retrieved successfully'));
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
 * Update workspace
 * PATCH /api/v1/workspaces/:id
 */
const updateWorkspace = async (req, res, next) => {
    try {
        const workspace = await workspaceService.updateWorkspace(req.params.id, req.body);
        res.json(success(workspace, 'Workspace updated successfully'));
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
 * Delete workspace
 * DELETE /api/v1/workspaces/:id
 */
const deleteWorkspace = async (req, res, next) => {
    try {
        await workspaceService.deleteWorkspace(req.params.id);
        res.json(success(null, 'Workspace deleted successfully'));
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
 * Get workspace members
 * GET /api/v1/workspaces/:id/members
 */
const getMembers = async (req, res, next) => {
    try {
        const pagination = parsePagination(req.query);
        const result = await workspaceService.getWorkspaceMembers(req.params.id, pagination);
        res.json(paginated(result.members, {
            page: result.page,
            limit: result.limit,
            total: result.total,
        }, 'Members retrieved successfully'));
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
 * Invite member to workspace
 * POST /api/v1/workspaces/:id/members
 */
const inviteMember = async (req, res, next) => {
    try {
        const result = await workspaceService.inviteMember(req.params.id, req.body, req.userId);
        res.status(201).json(success(result, 'Member invited successfully'));
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
 * Remove member from workspace
 * DELETE /api/v1/workspaces/:id/members/:userId
 */
const removeMember = async (req, res, next) => {
    try {
        await workspaceService.removeMember(req.params.id, req.params.userId);
        res.json(success(null, 'Member removed successfully'));
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
 * Update member role
 * PATCH /api/v1/workspaces/:id/members/:userId
 */
const updateMemberRole = async (req, res, next) => {
    try {
        const { role } = req.body;
        const member = await workspaceService.updateMemberRole(req.params.id, req.params.userId, role);
        res.json(success(member, 'Member role updated successfully'));
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
    createWorkspace,
    getWorkspaces,
    getWorkspace,
    updateWorkspace,
    deleteWorkspace,
    getMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
};

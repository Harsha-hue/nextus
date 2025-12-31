const express = require('express');
const router = express.Router();

const workspaceController = require('../controllers/workspace.controller');
const { authenticate } = require('../middleware/auth.middleware');
const { workspaceAccess, adminAccess, ownerAccess } = require('../middleware/workspace-access.middleware');
const { validate } = require('../middleware/validation.middleware');
const {
    createWorkspaceValidator,
    updateWorkspaceValidator,
    inviteMemberValidator,
    updateMemberRoleValidator,
} = require('../validators/workspace.validator');

// All workspace routes require authentication
router.use(authenticate);

// Workspace CRUD
router.get('/', workspaceController.getWorkspaces);
router.post('/', createWorkspaceValidator, validate, workspaceController.createWorkspace);
router.get('/:id', workspaceController.getWorkspace);
router.patch('/:id', workspaceAccess, adminAccess, updateWorkspaceValidator, validate, workspaceController.updateWorkspace);
router.delete('/:id', workspaceAccess, ownerAccess, workspaceController.deleteWorkspace);

// Member management
router.get('/:id/members', workspaceAccess, workspaceController.getMembers);
router.post('/:id/members', workspaceAccess, adminAccess, inviteMemberValidator, validate, workspaceController.inviteMember);
router.patch('/:id/members/:userId', workspaceAccess, adminAccess, updateMemberRoleValidator, validate, workspaceController.updateMemberRole);
router.delete('/:id/members/:userId', workspaceAccess, adminAccess, workspaceController.removeMember);

module.exports = router;

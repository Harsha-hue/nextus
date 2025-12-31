const { body, param } = require('express-validator');

const createWorkspaceValidator = [
    body('name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Workspace name must be between 2 and 100 characters')
        .trim(),
    body('slug')
        .optional()
        .isLength({ min: 2, max: 50 })
        .withMessage('Slug must be between 2 and 50 characters')
        .matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
        .withMessage('Slug must be lowercase with hyphens only'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters')
        .trim(),
];

const updateWorkspaceValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid workspace ID'),
    body('name')
        .optional()
        .isLength({ min: 2, max: 100 })
        .withMessage('Workspace name must be between 2 and 100 characters')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters')
        .trim(),
    body('avatarUrl')
        .optional()
        .isURL()
        .withMessage('Avatar URL must be a valid URL'),
];

const inviteMemberValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid workspace ID'),
    body('email')
        .isEmail()
        .withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('role')
        .optional()
        .isIn(['admin', 'member', 'guest'])
        .withMessage('Role must be admin, member, or guest'),
];

const updateMemberRoleValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid workspace ID'),
    param('userId')
        .isUUID()
        .withMessage('Invalid user ID'),
    body('role')
        .isIn(['admin', 'member', 'guest'])
        .withMessage('Role must be admin, member, or guest'),
];

module.exports = {
    createWorkspaceValidator,
    updateWorkspaceValidator,
    inviteMemberValidator,
    updateMemberRoleValidator,
};

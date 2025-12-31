const { body, param } = require('express-validator');

const createChannelValidator = [
    body('name')
        .isLength({ min: 1, max: 80 })
        .withMessage('Channel name must be between 1 and 80 characters')
        .matches(/^[a-z0-9-_]+$/)
        .withMessage('Channel name can only contain lowercase letters, numbers, hyphens, and underscores')
        .trim(),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters')
        .trim(),
    body('topic')
        .optional()
        .isLength({ max: 250 })
        .withMessage('Topic cannot exceed 250 characters')
        .trim(),
    body('isPrivate')
        .optional()
        .isBoolean()
        .withMessage('isPrivate must be a boolean'),
    body('parentChannelId')
        .optional()
        .isUUID()
        .withMessage('Parent channel ID must be a valid UUID'),
];

const updateChannelValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid channel ID'),
    body('name')
        .optional()
        .isLength({ min: 1, max: 80 })
        .withMessage('Channel name must be between 1 and 80 characters')
        .matches(/^[a-z0-9-_]+$/)
        .withMessage('Channel name can only contain lowercase letters, numbers, hyphens, and underscores'),
    body('description')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Description cannot exceed 500 characters'),
    body('topic')
        .optional()
        .isLength({ max: 250 })
        .withMessage('Topic cannot exceed 250 characters'),
];

const addChannelMemberValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid channel ID'),
    body('userId')
        .isUUID()
        .withMessage('User ID must be a valid UUID'),
    body('role')
        .optional()
        .isIn(['admin', 'member'])
        .withMessage('Role must be admin or member'),
];

const channelIdValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid channel ID'),
];

module.exports = {
    createChannelValidator,
    updateChannelValidator,
    addChannelMemberValidator,
    channelIdValidator,
};

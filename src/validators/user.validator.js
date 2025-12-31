const { body, param } = require('express-validator');

const updateProfileValidator = [
    body('fullName')
        .optional()
        .isLength({ max: 255 })
        .withMessage('Full name cannot exceed 255 characters')
        .trim(),
    body('username')
        .optional()
        .isLength({ min: 3, max: 30 })
        .withMessage('Username must be between 3 and 30 characters')
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username can only contain letters, numbers, and underscores'),
    body('bio')
        .optional()
        .isLength({ max: 500 })
        .withMessage('Bio cannot exceed 500 characters')
        .trim(),
    body('title')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Title cannot exceed 100 characters')
        .trim(),
    body('pronouns')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Pronouns cannot exceed 50 characters')
        .trim(),
    body('timezone')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Timezone cannot exceed 50 characters'),
    body('phone')
        .optional()
        .isMobilePhone()
        .withMessage('Please provide a valid phone number'),
];

const updateStatusValidator = [
    body('status')
        .isIn(['online', 'away', 'dnd', 'offline'])
        .withMessage('Status must be online, away, dnd, or offline'),
    body('customStatus')
        .optional()
        .isLength({ max: 100 })
        .withMessage('Custom status cannot exceed 100 characters')
        .trim(),
    body('customStatusEmoji')
        .optional()
        .isLength({ max: 50 })
        .withMessage('Status emoji cannot exceed 50 characters'),
    body('statusExpiry')
        .optional()
        .isISO8601()
        .withMessage('Status expiry must be a valid date'),
];

const updatePresenceValidator = [
    body('status')
        .isIn(['online', 'away', 'dnd', 'offline'])
        .withMessage('Presence status must be online, away, dnd, or offline'),
];

const userIdValidator = [
    param('id')
        .isUUID()
        .withMessage('Invalid user ID'),
];

module.exports = {
    updateProfileValidator,
    updateStatusValidator,
    updatePresenceValidator,
    userIdValidator,
};

const { body, param, query } = require('express-validator');

const sendMessageValidator = [
    body('content')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message content must be between 1 and 10000 characters')
        .trim(),
    body('replyToId')
        .optional()
        .isString()
        .withMessage('Reply to ID must be a string'),
    body('fileIds')
        .optional()
        .isArray()
        .withMessage('File IDs must be an array'),
    body('mentions')
        .optional()
        .isArray()
        .withMessage('Mentions must be an array'),
];

const updateMessageValidator = [
    param('id')
        .isString()
        .withMessage('Invalid message ID'),
    body('content')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message content must be between 1 and 10000 characters')
        .trim(),
];

const messageIdValidator = [
    param('id')
        .isString()
        .withMessage('Invalid message ID'),
];

const getMessagesValidator = [
    query('limit')
        .optional()
        .isInt({ min: 1, max: 100 })
        .withMessage('Limit must be between 1 and 100'),
    query('before')
        .optional()
        .isString()
        .withMessage('Before cursor must be a string'),
    query('after')
        .optional()
        .isString()
        .withMessage('After cursor must be a string'),
];

const addReactionValidator = [
    param('id')
        .isString()
        .withMessage('Invalid message ID'),
    body('emoji')
        .notEmpty()
        .withMessage('Emoji is required')
        .isLength({ max: 50 })
        .withMessage('Emoji cannot exceed 50 characters'),
];

const removeReactionValidator = [
    param('id')
        .isString()
        .withMessage('Invalid message ID'),
    param('emoji')
        .notEmpty()
        .withMessage('Emoji is required'),
];

const threadMessageValidator = [
    param('id')
        .isString()
        .withMessage('Invalid parent message ID'),
    body('content')
        .isLength({ min: 1, max: 10000 })
        .withMessage('Message content must be between 1 and 10000 characters')
        .trim(),
];

module.exports = {
    sendMessageValidator,
    updateMessageValidator,
    messageIdValidator,
    getMessagesValidator,
    addReactionValidator,
    removeReactionValidator,
    threadMessageValidator,
};

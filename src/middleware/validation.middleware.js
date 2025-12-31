const { validationResult } = require('express-validator');

/**
 * Validation middleware
 * Checks for validation errors from express-validator
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        const formattedErrors = errors.array().map((error) => ({
            field: error.path,
            message: error.msg,
        }));

        return res.status(400).json({
            success: false,
            error: 'Validation failed',
            details: formattedErrors,
        });
    }

    next();
};

module.exports = {
    validate,
};

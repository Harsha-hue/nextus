const winston = require('winston');
const config = require('../config/environment');

// Create logger
const logger = winston.createLogger({
    level: config.nodeEnv === 'production' ? 'info' : 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            ),
        }),
    ],
});

/**
 * Error handler middleware
 */
const errorHandler = (err, req, res, next) => {
    // Log the error
    logger.error('Error:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
        userId: req.userId,
    });

    // Handle specific error types
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            success: false,
            error: 'Validation Error',
            details: err.message,
        });
    }

    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            success: false,
            error: 'Unauthorized',
        });
    }

    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
            success: false,
            error: 'File too large',
        });
    }

    if (err.code === '23505') {
        // PostgreSQL unique violation
        return res.status(409).json({
            success: false,
            error: 'Resource already exists',
        });
    }

    if (err.code === '23503') {
        // PostgreSQL foreign key violation
        return res.status(400).json({
            success: false,
            error: 'Invalid reference',
        });
    }

    // Default error response
    const statusCode = err.statusCode || 500;
    const message = config.nodeEnv === 'production' && statusCode === 500
        ? 'Internal server error'
        : err.message;

    res.status(statusCode).json({
        success: false,
        error: message,
        ...(config.nodeEnv !== 'production' && { stack: err.stack }),
    });
};

/**
 * Not found handler
 */
const notFoundHandler = (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Resource not found',
        path: req.path,
    });
};

module.exports = {
    errorHandler,
    notFoundHandler,
    logger,
};

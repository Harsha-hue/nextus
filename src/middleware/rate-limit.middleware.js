const rateLimit = require('express-rate-limit');
const config = require('../config/environment');

/**
 * General API rate limiter
 */
const apiLimiter = rateLimit({
    windowMs: config.rateLimit.windowMs,
    max: config.rateLimit.max,
    message: {
        success: false,
        error: 'Too many requests, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Stricter rate limiter for authentication endpoints
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // 10 attempts per window
    message: {
        success: false,
        error: 'Too many authentication attempts, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for file uploads
 */
const uploadLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // 50 uploads per hour
    message: {
        success: false,
        error: 'Upload limit reached, please try again later.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

/**
 * Rate limiter for message sending
 */
const messageLimiter = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 60, // 60 messages per minute
    message: {
        success: false,
        error: 'Message rate limit reached, please slow down.',
    },
    standardHeaders: true,
    legacyHeaders: false,
});

module.exports = {
    apiLimiter,
    authLimiter,
    uploadLimiter,
    messageLimiter,
};

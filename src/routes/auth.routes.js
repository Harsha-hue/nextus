const express = require('express');
const router = express.Router();

const authController = require('../controllers/auth.controller');
const { validate } = require('../middleware/validation.middleware');
const { authLimiter } = require('../middleware/rate-limit.middleware');
const {
    registerValidator,
    loginValidator,
    forgotPasswordValidator,
    resetPasswordValidator,
    refreshTokenValidator,
    googleAuthValidator,
} = require('../validators/auth.validator');

// Public routes (no auth required)
router.post('/register', authLimiter, registerValidator, validate, authController.register);
router.post('/login', authLimiter, loginValidator, validate, authController.login);
router.post('/refresh', refreshTokenValidator, validate, authController.refresh);
router.post('/forgot-password', authLimiter, forgotPasswordValidator, validate, authController.forgotPassword);
router.post('/reset-password', resetPasswordValidator, validate, authController.resetPassword);
router.get('/verify-email/:token', authController.verifyEmail);
router.post('/google', googleAuthValidator, validate, authController.googleAuth);

// Passwordless authentication (Slack-like)
router.post('/send-code', authLimiter, authController.sendCode);
router.post('/verify-code', authLimiter, authController.verifyCode);

// Authenticated routes
const { authenticate } = require('../middleware/auth.middleware');
router.post('/logout', authenticate, authController.logout);

module.exports = router;

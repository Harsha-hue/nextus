const authService = require('../services/auth.service');
const { success } = require('../utils/response.utils');

/**
 * Register new user
 * POST /api/v1/auth/register
 */
const register = async (req, res, next) => {
    try {
        const result = await authService.register(req.body);
        res.status(201).json(success(result, 'Registration successful'));
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
 * Login user
 * POST /api/v1/auth/login
 */
const login = async (req, res, next) => {
    try {
        const result = await authService.login(req.body);
        res.json(success(result, 'Login successful'));
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
 * Logout user
 * POST /api/v1/auth/logout
 */
const logout = async (req, res) => {
    // JWT is stateless, so we just return success
    // In production, you might want to blacklist the token
    res.json(success(null, 'Logout successful'));
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
const refresh = async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        const result = await authService.refreshToken(refreshToken);
        res.json(success(result, 'Token refreshed successfully'));
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
 * Request password reset
 * POST /api/v1/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
    try {
        const { email } = req.body;
        await authService.forgotPassword(email);
        res.json(success(null, 'If the email exists, a password reset link has been sent'));
    } catch (error) {
        next(error);
    }
};

/**
 * Reset password with token
 * POST /api/v1/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
    try {
        await authService.resetPassword(req.body);
        res.json(success(null, 'Password reset successful'));
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
 * Verify email
 * GET /api/v1/auth/verify-email/:token
 */
const verifyEmail = async (req, res, next) => {
    try {
        const { token } = req.params;
        await authService.verifyEmail(token);
        res.json(success(null, 'Email verified successfully'));
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
 * Google Sign-In
 * POST /api/v1/auth/google
 */
const googleAuth = async (req, res, next) => {
    try {
        const { idToken } = req.body;
        const result = await authService.googleAuth(idToken);
        res.json(success(result, 'Google authentication successful'));
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
 * Send magic code for passwordless login
 * POST /api/v1/auth/send-code
 */
const sendCode = async (req, res, next) => {
    try {
        const { email } = req.body;
        await authService.sendMagicCode(email);
        res.json(success(null, 'Verification code sent to your email'));
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
 * Verify magic code and login
 * POST /api/v1/auth/verify-code
 */
const verifyCode = async (req, res, next) => {
    try {
        const { email, code } = req.body;
        const result = await authService.verifyMagicCode(email, code);
        res.json(success(result, 'Login successful'));
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
    register,
    login,
    logout,
    refresh,
    forgotPassword,
    resetPassword,
    verifyEmail,
    googleAuth,
    sendCode,
    verifyCode,
};

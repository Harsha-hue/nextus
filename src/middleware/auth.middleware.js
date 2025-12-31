const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { supabase } = require('../config/supabase');

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
const authenticate = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                success: false,
                error: 'Access denied. No token provided.',
            });
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);

            // Get user from database
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();

            if (error || !user) {
                return res.status(401).json({
                    success: false,
                    error: 'Invalid token. User not found.',
                });
            }

            if (!user.is_active) {
                return res.status(401).json({
                    success: false,
                    error: 'Account is deactivated.',
                });
            }

            req.user = user;
            req.userId = user.id;
            next();
        } catch (jwtError) {
            if (jwtError.name === 'TokenExpiredError') {
                return res.status(401).json({
                    success: false,
                    error: 'Token expired. Please refresh your token.',
                    code: 'TOKEN_EXPIRED',
                });
            }

            return res.status(401).json({
                success: false,
                error: 'Invalid token.',
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error.',
        });
    }
};

/**
 * Optional authentication middleware
 * Attaches user if token is valid, but doesn't require authentication
 */
const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            req.user = null;
            req.userId = null;
            return next();
        }

        const token = authHeader.split(' ')[1];

        try {
            const decoded = jwt.verify(token, config.jwt.secret);

            const { data: user } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();

            req.user = user || null;
            req.userId = user?.id || null;
        } catch {
            req.user = null;
            req.userId = null;
        }

        next();
    } catch (error) {
        req.user = null;
        req.userId = null;
        next();
    }
};

module.exports = {
    authenticate,
    optionalAuth,
};

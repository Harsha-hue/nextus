const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { supabase } = require('../config/supabase');
const { generateTokenPair, verifyToken } = require('../utils/jwt.utils');
const emailService = require('./email.service');

/**
 * Register a new user
 * @param {Object} userData - User registration data
 * @returns {Object} User and tokens
 */
const register = async ({ email, password, username, fullName }) => {
    // Check if email already exists
    const { data: existingEmail } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingEmail) {
        throw { statusCode: 409, message: 'Email already registered' };
    }

    // Check if username already exists
    const { data: existingUsername } = await supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single();

    if (existingUsername) {
        throw { statusCode: 409, message: 'Username already taken' };
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const { data: user, error } = await supabase
        .from('users')
        .insert({
            email,
            password_hash: passwordHash,
            username,
            full_name: fullName || null,
            status: 'offline',
            is_active: true,
            email_verified: false,
        })
        .select()
        .single();

    if (error) {
        console.error('Register error:', error);
        throw { statusCode: 500, message: 'Failed to create user' };
    }

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Remove sensitive data
    delete user.password_hash;

    return { user, ...tokens };
};

/**
 * Login user
 * @param {Object} credentials - Login credentials
 * @returns {Object} User and tokens
 */
const login = async ({ email, password }) => {
    // Get user by email
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();

    if (error || !user) {
        throw { statusCode: 401, message: 'Invalid email or password' };
    }

    if (!user.is_active) {
        throw { statusCode: 401, message: 'Account is deactivated' };
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
        throw { statusCode: 401, message: 'Invalid email or password' };
    }

    // Update last seen
    await supabase
        .from('users')
        .update({ last_seen_at: new Date().toISOString() })
        .eq('id', user.id);

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Remove sensitive data
    delete user.password_hash;

    return { user, ...tokens };
};

/**
 * Refresh access token
 * @param {string} refreshToken - Refresh token
 * @returns {Object} New tokens
 */
const refreshToken = async (refreshToken) => {
    try {
        const decoded = verifyToken(refreshToken);

        // Get user
        const { data: user, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', decoded.userId)
            .single();

        if (error || !user || !user.is_active) {
            throw { statusCode: 401, message: 'Invalid refresh token' };
        }

        // Generate new tokens
        const tokens = generateTokenPair(user);

        return tokens;
    } catch (error) {
        throw { statusCode: 401, message: 'Invalid refresh token' };
    }
};

/**
 * Request password reset
 * @param {string} email - User email
 * @returns {Object} Success status
 */
const forgotPassword = async (email) => {
    // Get user by email
    const { data: user } = await supabase
        .from('users')
        .select('id, email')
        .eq('email', email)
        .single();

    // Don't reveal if email exists
    if (!user) {
        return { success: true };
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetTokenExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour

    // Store reset token
    await supabase
        .from('users')
        .update({
            reset_token: resetTokenHash,
            reset_token_expiry: resetTokenExpiry,
        })
        .eq('id', user.id);

    // TODO: Send email with reset link
    // For now, just return success
    console.log(`Password reset token for ${email}: ${resetToken}`);

    return { success: true };
};

/**
 * Reset password with token
 * @param {Object} data - Reset data
 * @returns {Object} Success status
 */
const resetPassword = async ({ token, password }) => {
    // Hash the provided token
    const resetTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('reset_token', resetTokenHash)
        .gt('reset_token_expiry', new Date().toISOString())
        .single();

    if (error || !user) {
        throw { statusCode: 400, message: 'Invalid or expired reset token' };
    }

    // Hash new password
    const passwordHash = await bcrypt.hash(password, 12);

    // Update password and clear reset token
    await supabase
        .from('users')
        .update({
            password_hash: passwordHash,
            reset_token: null,
            reset_token_expiry: null,
        })
        .eq('id', user.id);

    return { success: true };
};

/**
 * Verify email with token
 * @param {string} token - Verification token
 * @returns {Object} Success status
 */
const verifyEmail = async (token) => {
    // Hash the provided token
    const verificationTokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find user with valid token
    const { data: user, error } = await supabase
        .from('users')
        .select('id')
        .eq('verification_token', verificationTokenHash)
        .single();

    if (error || !user) {
        throw { statusCode: 400, message: 'Invalid verification token' };
    }

    // Update email verified status
    await supabase
        .from('users')
        .update({
            email_verified: true,
            verification_token: null,
        })
        .eq('id', user.id);

    return { success: true };
};

/**
 * Google Sign-In authentication
 * @param {string} idToken - Google ID token
 * @returns {Object} User and tokens
 */
const googleAuth = async (idToken) => {
    // TODO: Verify Google ID token with Firebase Admin
    // For now, this is a placeholder

    throw { statusCode: 501, message: 'Google authentication not implemented yet' };
};

/**
 * Send magic code for passwordless login
 * @param {string} email - User email
 * @returns {Object} Success status
 */
const sendMagicCode = async (email) => {
    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Check if user exists
    const { data: existingUser } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single();

    if (existingUser) {
        // Update existing user with code
        await supabase
            .from('users')
            .update({
                magic_code: code,
                magic_code_expiry: codeExpiry,
            })
            .eq('id', existingUser.id);
    } else {
        // Create new user with code (will complete profile later)
        const username = email.split('@')[0] + '_' + Date.now().toString(36);
        await supabase
            .from('users')
            .insert({
                email,
                username,
                magic_code: code,
                magic_code_expiry: codeExpiry,
                status: 'offline',
                is_active: true,
                email_verified: false,
            });
    }

    // Send verification code email
    try {
        await emailService.sendVerificationCode(email, code);
    } catch (emailError) {
        console.error('Failed to send email:', emailError);
        // Continue anyway - code is still logged for development
    }

    // Also log for development debugging
    console.log(`🔐 Magic code for ${email}: ${code}`);

    return { success: true };
};

/**
 * Verify magic code and login
 * @param {string} email - User email
 * @param {string} code - Magic code
 * @returns {Object} User and tokens
 */
const verifyMagicCode = async (email, code) => {
    // Find user with valid code
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .eq('magic_code', code)
        .gt('magic_code_expiry', new Date().toISOString())
        .single();

    if (error || !user) {
        throw { statusCode: 401, message: 'Invalid or expired verification code' };
    }

    // Clear magic code and update last seen
    await supabase
        .from('users')
        .update({
            magic_code: null,
            magic_code_expiry: null,
            email_verified: true,
            last_seen_at: new Date().toISOString(),
        })
        .eq('id', user.id);

    // Generate tokens
    const tokens = generateTokenPair(user);

    // Remove sensitive data
    delete user.password_hash;
    delete user.magic_code;
    delete user.magic_code_expiry;

    return { user, ...tokens };
};

module.exports = {
    register,
    login,
    refreshToken,
    forgotPassword,
    resetPassword,
    verifyEmail,
    googleAuth,
    sendMagicCode,
    verifyMagicCode,
};

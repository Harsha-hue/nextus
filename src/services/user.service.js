const { supabase } = require('../config/supabase');

/**
 * Get user profile
 * @param {string} userId - User ID
 * @returns {Object} User profile
 */
const getUserProfile = async (userId) => {
    const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        throw { statusCode: 404, message: 'User not found' };
    }

    // Remove sensitive data
    delete user.password_hash;
    delete user.reset_token;
    delete user.reset_token_expiry;
    delete user.verification_token;

    return user;
};

/**
 * Update user profile
 * @param {string} userId - User ID
 * @param {Object} updateData - Update data
 * @returns {Object} Updated user
 */
const updateUserProfile = async (userId, updateData) => {
    const {
        fullName,
        username,
        bio,
        title,
        pronouns,
        timezone,
        phone,
        avatarUrl,
    } = updateData;

    // Check if username is taken (if changing)
    if (username) {
        const { data: existing } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .neq('id', userId)
            .single();

        if (existing) {
            throw { statusCode: 409, message: 'Username already taken' };
        }
    }

    const updateFields = {};
    if (fullName !== undefined) updateFields.full_name = fullName;
    if (username) updateFields.username = username;
    if (bio !== undefined) updateFields.bio = bio;
    if (title !== undefined) updateFields.title = title;
    if (pronouns !== undefined) updateFields.pronouns = pronouns;
    if (timezone) updateFields.timezone = timezone;
    if (phone !== undefined) updateFields.phone = phone;
    if (avatarUrl !== undefined) updateFields.avatar_url = avatarUrl;
    updateFields.updated_at = new Date().toISOString();

    const { data: user, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Update user profile error:', error);
        throw { statusCode: 500, message: 'Failed to update profile' };
    }

    // Remove sensitive data
    delete user.password_hash;
    delete user.reset_token;
    delete user.reset_token_expiry;
    delete user.verification_token;

    return user;
};

/**
 * Update user status
 * @param {string} userId - User ID
 * @param {Object} statusData - Status data
 * @returns {Object} Updated user
 */
const updateUserStatus = async (userId, statusData) => {
    const { status, customStatus, customStatusEmoji, statusExpiry } = statusData;

    const updateFields = {
        status,
        custom_status: customStatus || null,
        custom_status_emoji: customStatusEmoji || null,
        status_expiry: statusExpiry || null,
        updated_at: new Date().toISOString(),
    };

    const { data: user, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Update user status error:', error);
        throw { statusCode: 500, message: 'Failed to update status' };
    }

    // Remove sensitive data
    delete user.password_hash;

    return user;
};

/**
 * Update user presence (online/away/offline)
 * @param {string} userId - User ID
 * @param {string} status - Presence status
 * @returns {Object} Updated user
 */
const updateUserPresence = async (userId, status) => {
    const updateFields = {
        status,
        last_seen_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
    };

    const { data: user, error } = await supabase
        .from('users')
        .update(updateFields)
        .eq('id', userId)
        .select()
        .single();

    if (error) {
        console.error('Update user presence error:', error);
        throw { statusCode: 500, message: 'Failed to update presence' };
    }

    // Remove sensitive data
    delete user.password_hash;

    return user;
};

/**
 * Get user by ID (public profile)
 * @param {string} userId - User ID
 * @returns {Object} User public profile
 */
const getUserById = async (userId) => {
    const { data: user, error } = await supabase
        .from('users')
        .select(`
      id,
      username,
      full_name,
      avatar_url,
      status,
      custom_status,
      custom_status_emoji,
      bio,
      title,
      pronouns,
      timezone,
      last_seen_at
    `)
        .eq('id', userId)
        .single();

    if (error) {
        throw { statusCode: 404, message: 'User not found' };
    }

    return user;
};

/**
 * Search users
 * @param {string} query - Search query
 * @param {string} workspaceId - Optional workspace to search within
 * @param {number} limit - Result limit
 * @returns {Array} List of users
 */
const searchUsers = async (query, workspaceId = null, limit = 20) => {
    let baseQuery = supabase
        .from('users')
        .select(`
      id,
      username,
      full_name,
      avatar_url,
      status
    `)
        .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
        .eq('is_active', true)
        .limit(limit);

    if (workspaceId) {
        // Filter to workspace members only
        const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspaceId)
            .eq('is_active', true);

        const userIds = members?.map((m) => m.user_id) || [];
        baseQuery = baseQuery.in('id', userIds);
    }

    const { data: users, error } = await baseQuery;

    if (error) {
        console.error('Search users error:', error);
        throw { statusCode: 500, message: 'Failed to search users' };
    }

    return users;
};

/**
 * Save FCM token for push notifications
 * @param {string} userId - User ID
 * @param {string} token - FCM token
 * @param {string} platform - Device platform (android/ios)
 */
const saveFcmToken = async (userId, token, platform = 'android') => {
    // Check if token already exists
    const { data: existing } = await supabase
        .from('user_fcm_tokens')
        .select('id')
        .eq('user_id', userId)
        .eq('token', token)
        .single();

    if (existing) {
        // Update last used
        await supabase
            .from('user_fcm_tokens')
            .update({ last_used_at: new Date().toISOString() })
            .eq('id', existing.id);
        return;
    }

    // Insert new token
    await supabase.from('user_fcm_tokens').insert({
        user_id: userId,
        token,
        platform,
        created_at: new Date().toISOString(),
        last_used_at: new Date().toISOString(),
    });
};

/**
 * Delete FCM token (on logout)
 * @param {string} userId - User ID
 * @param {string} token - FCM token (optional - deletes all if not provided)
 */
const deleteFcmToken = async (userId, token = null) => {
    let query = supabase
        .from('user_fcm_tokens')
        .delete()
        .eq('user_id', userId);

    if (token) {
        query = query.eq('token', token);
    }

    await query;
};

/**
 * Get user's FCM tokens for sending push notifications
 * @param {string} userId - User ID
 * @returns {Array} FCM tokens
 */
const getUserFcmTokens = async (userId) => {
    const { data } = await supabase
        .from('user_fcm_tokens')
        .select('token')
        .eq('user_id', userId);

    return data?.map((t) => t.token) || [];
};

module.exports = {
    getUserProfile,
    updateUserProfile,
    updateUserStatus,
    updateUserPresence,
    getUserById,
    searchUsers,
    saveFcmToken,
    deleteFcmToken,
    getUserFcmTokens,
};


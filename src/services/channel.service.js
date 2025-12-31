const { supabase } = require('../config/supabase');

/**
 * Create a new channel
 * @param {Object} channelData - Channel data
 * @param {string} workspaceId - Workspace ID
 * @param {string} creatorId - Creator user ID
 * @returns {Object} Created channel
 */
const createChannel = async (channelData, workspaceId, creatorId) => {
    const { name, description, topic, isPrivate, parentChannelId } = channelData;

    // Check if channel name already exists in workspace
    const { data: existing } = await supabase
        .from('channels')
        .select('id')
        .eq('workspace_id', workspaceId)
        .eq('name', name.toLowerCase())
        .single();

    if (existing) {
        throw { statusCode: 409, message: 'Channel name already exists in this workspace' };
    }

    // Create channel
    const { data: channel, error } = await supabase
        .from('channels')
        .insert({
            workspace_id: workspaceId,
            name: name.toLowerCase(),
            description: description || null,
            topic: topic || null,
            is_private: isPrivate || false,
            is_archived: false,
            parent_channel_id: parentChannelId || null,
            creator_id: creatorId,
            settings: {},
        })
        .select()
        .single();

    if (error) {
        console.error('Create channel error:', error);
        throw { statusCode: 500, message: 'Failed to create channel' };
    }

    // If private, add creator as member
    if (isPrivate) {
        await supabase
            .from('channel_members')
            .insert({
                channel_id: channel.id,
                user_id: creatorId,
                role: 'admin',
            });
    }

    return channel;
};

/**
 * Get channels for a workspace
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID (to check private channel access)
 * @returns {Array} List of channels
 */
const getWorkspaceChannels = async (workspaceId, userId) => {
    // Get public channels
    const { data: publicChannels, error: publicError } = await supabase
        .from('channels')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_private', false)
        .eq('is_archived', false)
        .order('name', { ascending: true });

    if (publicError) {
        console.error('Get public channels error:', publicError);
        throw { statusCode: 500, message: 'Failed to get channels' };
    }

    // Get private channels user is a member of
    const { data: privateMemberships, error: privateError } = await supabase
        .from('channel_members')
        .select(`
      channels (*)
    `)
        .eq('user_id', userId);

    if (privateError) {
        console.error('Get private channels error:', privateError);
    }

    const privateChannels = (privateMemberships || [])
        .map((m) => m.channels)
        .filter((c) => c && c.is_private && !c.is_archived && c.workspace_id === workspaceId);

    // Combine and organize by parent
    const allChannels = [...publicChannels, ...privateChannels];

    // Build hierarchy
    const channelMap = new Map();
    const rootChannels = [];

    allChannels.forEach((channel) => {
        channelMap.set(channel.id, { ...channel, children: [] });
    });

    allChannels.forEach((channel) => {
        if (channel.parent_channel_id && channelMap.has(channel.parent_channel_id)) {
            channelMap.get(channel.parent_channel_id).children.push(channelMap.get(channel.id));
        } else {
            rootChannels.push(channelMap.get(channel.id));
        }
    });

    return rootChannels;
};

/**
 * Get channel by ID
 * @param {string} channelId - Channel ID
 * @returns {Object} Channel details
 */
const getChannelById = async (channelId) => {
    const { data: channel, error } = await supabase
        .from('channels')
        .select('*')
        .eq('id', channelId)
        .single();

    if (error) {
        throw { statusCode: 404, message: 'Channel not found' };
    }

    // Get member count for private channels
    if (channel.is_private) {
        const { count } = await supabase
            .from('channel_members')
            .select('id', { count: 'exact' })
            .eq('channel_id', channelId);

        channel.memberCount = count;
    }

    return channel;
};

/**
 * Update channel
 * @param {string} channelId - Channel ID
 * @param {Object} updateData - Update data
 * @returns {Object} Updated channel
 */
const updateChannel = async (channelId, updateData) => {
    const { name, description, topic, settings } = updateData;

    const updateFields = {};
    if (name) updateFields.name = name.toLowerCase();
    if (description !== undefined) updateFields.description = description;
    if (topic !== undefined) updateFields.topic = topic;
    if (settings) updateFields.settings = settings;
    updateFields.updated_at = new Date().toISOString();

    const { data: channel, error } = await supabase
        .from('channels')
        .update(updateFields)
        .eq('id', channelId)
        .select()
        .single();

    if (error) {
        console.error('Update channel error:', error);
        throw { statusCode: 500, message: 'Failed to update channel' };
    }

    return channel;
};

/**
 * Delete channel
 * @param {string} channelId - Channel ID
 * @returns {boolean} Success status
 */
const deleteChannel = async (channelId) => {
    const { data: channel } = await supabase
        .from('channels')
        .select('name')
        .eq('id', channelId)
        .single();

    if (channel?.name === 'general') {
        throw { statusCode: 400, message: 'Cannot delete the general channel' };
    }

    const { error } = await supabase
        .from('channels')
        .delete()
        .eq('id', channelId);

    if (error) {
        console.error('Delete channel error:', error);
        throw { statusCode: 500, message: 'Failed to delete channel' };
    }

    return true;
};

/**
 * Archive channel
 * @param {string} channelId - Channel ID
 * @returns {Object} Archived channel
 */
const archiveChannel = async (channelId) => {
    const { data: channel, error } = await supabase
        .from('channels')
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq('id', channelId)
        .select()
        .single();

    if (error) {
        console.error('Archive channel error:', error);
        throw { statusCode: 500, message: 'Failed to archive channel' };
    }

    return channel;
};

/**
 * Unarchive channel
 * @param {string} channelId - Channel ID
 * @returns {Object} Unarchived channel
 */
const unarchiveChannel = async (channelId) => {
    const { data: channel, error } = await supabase
        .from('channels')
        .update({ is_archived: false, updated_at: new Date().toISOString() })
        .eq('id', channelId)
        .select()
        .single();

    if (error) {
        console.error('Unarchive channel error:', error);
        throw { statusCode: 500, message: 'Failed to unarchive channel' };
    }

    return channel;
};

/**
 * Get channel members
 * @param {string} channelId - Channel ID
 * @returns {Array} List of members
 */
const getChannelMembers = async (channelId) => {
    const { data: members, error } = await supabase
        .from('channel_members')
        .select(`
      id,
      role,
      joined_at,
      users (
        id,
        email,
        username,
        full_name,
        avatar_url,
        status
      )
    `)
        .eq('channel_id', channelId);

    if (error) {
        console.error('Get channel members error:', error);
        throw { statusCode: 500, message: 'Failed to get channel members' };
    }

    return members.map((m) => ({
        ...m.users,
        role: m.role,
        joinedAt: m.joined_at,
    }));
};

/**
 * Add member to channel
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @param {string} role - Member role
 * @returns {Object} Added member
 */
const addChannelMember = async (channelId, userId, role = 'member') => {
    // Check if already a member
    const { data: existing } = await supabase
        .from('channel_members')
        .select('id')
        .eq('channel_id', channelId)
        .eq('user_id', userId)
        .single();

    if (existing) {
        throw { statusCode: 409, message: 'User is already a member of this channel' };
    }

    const { data: member, error } = await supabase
        .from('channel_members')
        .insert({
            channel_id: channelId,
            user_id: userId,
            role,
        })
        .select()
        .single();

    if (error) {
        console.error('Add channel member error:', error);
        throw { statusCode: 500, message: 'Failed to add member' };
    }

    return member;
};

/**
 * Remove member from channel
 * @param {string} channelId - Channel ID
 * @param {string} userId - User ID
 * @returns {boolean} Success status
 */
const removeChannelMember = async (channelId, userId) => {
    const { error } = await supabase
        .from('channel_members')
        .delete()
        .eq('channel_id', channelId)
        .eq('user_id', userId);

    if (error) {
        console.error('Remove channel member error:', error);
        throw { statusCode: 500, message: 'Failed to remove member' };
    }

    return true;
};

module.exports = {
    createChannel,
    getWorkspaceChannels,
    getChannelById,
    updateChannel,
    deleteChannel,
    archiveChannel,
    unarchiveChannel,
    getChannelMembers,
    addChannelMember,
    removeChannelMember,
};

const { supabase } = require('../config/supabase');
const { generateUniqueSlug, isValidSlug } = require('../utils/slug.utils');

/**
 * Create a new workspace
 * @param {Object} workspaceData - Workspace data
 * @param {string} userId - Creator user ID
 * @returns {Object} Created workspace
 */
const createWorkspace = async (workspaceData, userId) => {
    const { name, slug, description } = workspaceData;

    // Generate or validate slug
    let workspaceSlug = slug;
    if (slug) {
        // Check if slug is already taken
        const { data: existing } = await supabase
            .from('workspaces')
            .select('id')
            .eq('slug', slug)
            .single();

        if (existing) {
            throw { statusCode: 409, message: 'Workspace slug already taken' };
        }
    } else {
        workspaceSlug = generateUniqueSlug(name);
    }

    // Create workspace
    const { data: workspace, error } = await supabase
        .from('workspaces')
        .insert({
            name,
            slug: workspaceSlug,
            description: description || null,
            owner_id: userId,
            is_active: true,
            plan_type: 'free',
            storage_quota_gb: 5,
            storage_used_gb: 0,
            member_limit: 10,
            settings: {},
        })
        .select()
        .single();

    if (error) {
        console.error('Create workspace error:', error);
        throw { statusCode: 500, message: 'Failed to create workspace' };
    }

    // Add creator as owner member
    const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
            workspace_id: workspace.id,
            user_id: userId,
            role: 'owner',
            is_active: true,
        });

    if (memberError) {
        console.error('Add workspace member error:', memberError);
        // Rollback workspace creation
        await supabase.from('workspaces').delete().eq('id', workspace.id);
        throw { statusCode: 500, message: 'Failed to create workspace' };
    }

    // Create default #general channel
    await supabase
        .from('channels')
        .insert({
            workspace_id: workspace.id,
            name: 'general',
            description: 'General discussions for the team',
            is_private: false,
            creator_id: userId,
        });

    return workspace;
};

/**
 * Get workspaces for a user
 * @param {string} userId - User ID
 * @returns {Array} List of workspaces
 */
const getUserWorkspaces = async (userId) => {
    const { data: memberships, error } = await supabase
        .from('workspace_members')
        .select(`
      role,
      joined_at,
      workspaces (
        id,
        name,
        slug,
        avatar_url,
        description,
        owner_id,
        plan_type,
        created_at
      )
    `)
        .eq('user_id', userId)
        .eq('is_active', true);

    if (error) {
        console.error('Get user workspaces error:', error);
        throw { statusCode: 500, message: 'Failed to get workspaces' };
    }

    return memberships.map((m) => ({
        ...m.workspaces,
        role: m.role,
        joinedAt: m.joined_at,
    }));
};

/**
 * Get workspace by ID
 * @param {string} workspaceId - Workspace ID
 * @returns {Object} Workspace details
 */
const getWorkspaceById = async (workspaceId) => {
    const { data: workspace, error } = await supabase
        .from('workspaces')
        .select('*')
        .eq('id', workspaceId)
        .single();

    if (error) {
        throw { statusCode: 404, message: 'Workspace not found' };
    }

    // Get member count
    const { count } = await supabase
        .from('workspace_members')
        .select('id', { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true);

    return { ...workspace, memberCount: count };
};

/**
 * Update workspace
 * @param {string} workspaceId - Workspace ID
 * @param {Object} updateData - Update data
 * @returns {Object} Updated workspace
 */
const updateWorkspace = async (workspaceId, updateData) => {
    const { name, description, avatarUrl, settings } = updateData;

    const updateFields = {};
    if (name) updateFields.name = name;
    if (description !== undefined) updateFields.description = description;
    if (avatarUrl !== undefined) updateFields.avatar_url = avatarUrl;
    if (settings) updateFields.settings = settings;
    updateFields.updated_at = new Date().toISOString();

    const { data: workspace, error } = await supabase
        .from('workspaces')
        .update(updateFields)
        .eq('id', workspaceId)
        .select()
        .single();

    if (error) {
        console.error('Update workspace error:', error);
        throw { statusCode: 500, message: 'Failed to update workspace' };
    }

    return workspace;
};

/**
 * Delete workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {boolean} Success status
 */
const deleteWorkspace = async (workspaceId) => {
    const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', workspaceId);

    if (error) {
        console.error('Delete workspace error:', error);
        throw { statusCode: 500, message: 'Failed to delete workspace' };
    }

    return true;
};

/**
 * Get workspace members
 * @param {string} workspaceId - Workspace ID
 * @param {Object} options - Query options
 * @returns {Array} List of members
 */
const getWorkspaceMembers = async (workspaceId, { page = 1, limit = 50 }) => {
    const offset = (page - 1) * limit;

    const { data: members, error, count } = await supabase
        .from('workspace_members')
        .select(`
      id,
      role,
      title,
      joined_at,
      is_active,
      users (
        id,
        email,
        username,
        full_name,
        avatar_url,
        status,
        custom_status,
        last_seen_at
      )
    `, { count: 'exact' })
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('joined_at', { ascending: true })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Get workspace members error:', error);
        throw { statusCode: 500, message: 'Failed to get members' };
    }

    return {
        members: members.map((m) => ({
            ...m.users,
            role: m.role,
            title: m.title,
            joinedAt: m.joined_at,
        })),
        total: count,
        page,
        limit,
    };
};

/**
 * Invite member to workspace
 * @param {string} workspaceId - Workspace ID
 * @param {Object} inviteData - Invite data
 * @param {string} invitedBy - Inviter user ID
 * @returns {Object} Invite result
 */
const inviteMember = async (workspaceId, { email, role = 'member' }, invitedBy) => {
    // Find user by email
    const { data: user } = await supabase
        .from('users')
        .select('id, email, username')
        .eq('email', email)
        .single();

    if (!user) {
        // TODO: Send invite email for non-registered users
        throw { statusCode: 404, message: 'User not found. Invite link will be sent via email.' };
    }

    // Check if already a member
    const { data: existing } = await supabase
        .from('workspace_members')
        .select('id, is_active')
        .eq('workspace_id', workspaceId)
        .eq('user_id', user.id)
        .single();

    if (existing) {
        if (existing.is_active) {
            throw { statusCode: 409, message: 'User is already a member of this workspace' };
        }
        // Reactivate member
        await supabase
            .from('workspace_members')
            .update({
                is_active: true,
                role,
                joined_at: new Date().toISOString(),
            })
            .eq('id', existing.id);

        return { user, reactivated: true };
    }

    // Add new member
    const { error } = await supabase
        .from('workspace_members')
        .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            role,
            invited_by: invitedBy,
            is_active: true,
        });

    if (error) {
        console.error('Invite member error:', error);
        throw { statusCode: 500, message: 'Failed to invite member' };
    }

    return { user, invited: true };
};

/**
 * Remove member from workspace
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID to remove
 * @returns {boolean} Success status
 */
const removeMember = async (workspaceId, userId) => {
    // Check if user is the owner
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    if (workspace?.owner_id === userId) {
        throw { statusCode: 400, message: 'Cannot remove workspace owner' };
    }

    const { error } = await supabase
        .from('workspace_members')
        .update({ is_active: false })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId);

    if (error) {
        console.error('Remove member error:', error);
        throw { statusCode: 500, message: 'Failed to remove member' };
    }

    return true;
};

/**
 * Update member role
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - User ID
 * @param {string} role - New role
 * @returns {Object} Updated member
 */
const updateMemberRole = async (workspaceId, userId, role) => {
    // Cannot change owner role
    const { data: workspace } = await supabase
        .from('workspaces')
        .select('owner_id')
        .eq('id', workspaceId)
        .single();

    if (workspace?.owner_id === userId) {
        throw { statusCode: 400, message: 'Cannot change owner role' };
    }

    const { data: member, error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('workspace_id', workspaceId)
        .eq('user_id', userId)
        .select()
        .single();

    if (error) {
        console.error('Update member role error:', error);
        throw { statusCode: 500, message: 'Failed to update member role' };
    }

    return member;
};

module.exports = {
    createWorkspace,
    getUserWorkspaces,
    getWorkspaceById,
    updateWorkspace,
    deleteWorkspace,
    getWorkspaceMembers,
    inviteMember,
    removeMember,
    updateMemberRole,
};

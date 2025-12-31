const { supabase } = require('../config/supabase');

/**
 * Workspace access middleware
 * Verifies user has access to the specified workspace
 */
const workspaceAccess = async (req, res, next) => {
    try {
        const workspaceId = req.params.workspaceId || req.body.workspaceId || req.query.workspaceId;

        if (!workspaceId) {
            return res.status(400).json({
                success: false,
                error: 'Workspace ID is required',
            });
        }

        // Check if user is a member of the workspace
        const { data: membership, error } = await supabase
            .from('workspace_members')
            .select('*, workspaces(*)')
            .eq('workspace_id', workspaceId)
            .eq('user_id', req.userId)
            .eq('is_active', true)
            .single();

        if (error || !membership) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You are not a member of this workspace.',
            });
        }

        // Attach workspace and role to request
        req.workspace = membership.workspaces;
        req.workspaceRole = membership.role;
        req.workspaceMembership = membership;

        next();
    } catch (error) {
        console.error('Workspace access middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error.',
        });
    }
};

/**
 * Admin access middleware
 * Verifies user has admin or owner role in the workspace
 */
const adminAccess = async (req, res, next) => {
    if (!['owner', 'admin'].includes(req.workspaceRole)) {
        return res.status(403).json({
            success: false,
            error: 'Admin access required.',
        });
    }
    next();
};

/**
 * Owner access middleware
 * Verifies user is the owner of the workspace
 */
const ownerAccess = async (req, res, next) => {
    if (req.workspaceRole !== 'owner') {
        return res.status(403).json({
            success: false,
            error: 'Owner access required.',
        });
    }
    next();
};

/**
 * Channel access middleware
 * Verifies user has access to the specified channel
 */
const channelAccess = async (req, res, next) => {
    try {
        const channelId = req.params.channelId || req.body.channelId;

        if (!channelId) {
            return res.status(400).json({
                success: false,
                error: 'Channel ID is required',
            });
        }

        // Get channel info
        const { data: channel, error: channelError } = await supabase
            .from('channels')
            .select('*')
            .eq('id', channelId)
            .single();

        if (channelError || !channel) {
            return res.status(404).json({
                success: false,
                error: 'Channel not found.',
            });
        }

        // For public channels, just check workspace membership
        if (!channel.is_private) {
            // Verify workspace access
            const { data: workspaceMember } = await supabase
                .from('workspace_members')
                .select('*')
                .eq('workspace_id', channel.workspace_id)
                .eq('user_id', req.userId)
                .eq('is_active', true)
                .single();

            if (!workspaceMember) {
                return res.status(403).json({
                    success: false,
                    error: 'Access denied.',
                });
            }

            req.channel = channel;
            return next();
        }

        // For private channels, check channel membership
        const { data: channelMember, error: memberError } = await supabase
            .from('channel_members')
            .select('*')
            .eq('channel_id', channelId)
            .eq('user_id', req.userId)
            .single();

        if (memberError || !channelMember) {
            return res.status(403).json({
                success: false,
                error: 'Access denied. You are not a member of this private channel.',
            });
        }

        req.channel = channel;
        req.channelMembership = channelMember;
        next();
    } catch (error) {
        console.error('Channel access middleware error:', error);
        return res.status(500).json({
            success: false,
            error: 'Internal server error.',
        });
    }
};

module.exports = {
    workspaceAccess,
    adminAccess,
    ownerAccess,
    channelAccess,
};

const { supabase } = require('../config/supabase');
const { sendPushNotification } = require('../config/firebase');
const { getIO } = require('../config/socket');

/**
 * Notification Service - Handles push notifications and in-app notifications
 */
class NotificationService {
    /**
     * Create an in-app notification
     * @param {Object} notificationData - Notification data
     * @returns {Object} Created notification
     */
    async createNotification(notificationData) {
        const {
            userId,
            workspaceId,
            type,
            title,
            body,
            data = {},
        } = notificationData;

        const notification = {
            user_id: userId,
            workspace_id: workspaceId,
            type,
            title,
            body,
            data,
            is_read: false,
            created_at: new Date(),
        };

        const { data: created, error } = await supabase
            .from('notifications')
            .insert(notification)
            .select()
            .single();

        if (error) {
            console.error('Create notification error:', error);
            throw { statusCode: 500, message: 'Failed to create notification' };
        }

        // Send real-time notification via WebSocket
        try {
            const io = getIO();
            io.to(`user:${userId}`).emit('notification:new', created);
        } catch (e) {
            console.log('WebSocket notification error:', e.message);
        }

        return created;
    }

    /**
     * Get user notifications
     * @param {string} userId - User ID
     * @param {Object} options - Filter options
     * @returns {Array} Notifications
     */
    async getUserNotifications(userId, options = {}) {
        const { page = 1, limit = 20, unreadOnly = false } = options;
        const offset = (page - 1) * limit;

        let query = supabase
            .from('notifications')
            .select('*', { count: 'exact' })
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (unreadOnly) {
            query = query.eq('is_read', false);
        }

        const { data, error, count } = await query.range(offset, offset + limit - 1);

        if (error) {
            throw { statusCode: 500, message: 'Failed to fetch notifications' };
        }

        return {
            notifications: data || [],
            total: count,
            page,
            limit,
            unreadCount: unreadOnly ? count : await this.getUnreadCount(userId),
        };
    }

    /**
     * Get unread notification count
     * @param {string} userId - User ID
     * @returns {number} Unread count
     */
    async getUnreadCount(userId) {
        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) return 0;
        return count;
    }

    /**
     * Mark notification as read
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     */
    async markAsRead(notificationId, userId) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) {
            throw { statusCode: 500, message: 'Failed to update notification' };
        }

        return { success: true };
    }

    /**
     * Mark all notifications as read
     * @param {string} userId - User ID
     */
    async markAllAsRead(userId) {
        const { error } = await supabase
            .from('notifications')
            .update({ is_read: true, read_at: new Date() })
            .eq('user_id', userId)
            .eq('is_read', false);

        if (error) {
            throw { statusCode: 500, message: 'Failed to update notifications' };
        }

        return { success: true };
    }

    /**
     * Delete a notification
     * @param {string} notificationId - Notification ID
     * @param {string} userId - User ID
     */
    async deleteNotification(notificationId, userId) {
        const { error } = await supabase
            .from('notifications')
            .delete()
            .eq('id', notificationId)
            .eq('user_id', userId);

        if (error) {
            throw { statusCode: 500, message: 'Failed to delete notification' };
        }

        return { success: true };
    }

    /**
     * Send push notification (FCM)
     * @param {string} userId - User ID
     * @param {Object} notification - Notification payload
     */
    async sendPush(userId, notification) {
        try {
            // Get user's FCM tokens (should be stored in user_preferences or separate table)
            const { data: preferences } = await supabase
                .from('user_preferences')
                .select('fcm_token')
                .eq('user_id', userId);

            const tokens = preferences
                ?.filter((p) => p.fcm_token)
                .map((p) => p.fcm_token);

            if (!tokens || tokens.length === 0) {
                return;
            }

            await sendPushNotification(tokens, notification);
        } catch (error) {
            console.error('Send push notification error:', error);
        }
    }

    /**
     * Notify workspace members
     * @param {string} workspaceId - Workspace ID
     * @param {Object} notification - Notification data
     * @param {Array} excludeUserIds - User IDs to exclude
     */
    async notifyWorkspaceMembers(workspaceId, notification, excludeUserIds = []) {
        // Get workspace members
        const { data: members } = await supabase
            .from('workspace_members')
            .select('user_id')
            .eq('workspace_id', workspaceId)
            .eq('is_active', true);

        if (!members) return;

        const userIds = members
            .map((m) => m.user_id)
            .filter((id) => !excludeUserIds.includes(id));

        // Create notifications for all members
        for (const userId of userIds) {
            await this.createNotification({
                userId,
                workspaceId,
                ...notification,
            });
        }
    }

    /**
     * Notify channel members
     * @param {string} channelId - Channel ID
     * @param {Object} notification - Notification data
     * @param {Array} excludeUserIds - User IDs to exclude
     */
    async notifyChannelMembers(channelId, notification, excludeUserIds = []) {
        // Get channel with workspace
        const { data: channel } = await supabase
            .from('channels')
            .select('workspace_id')
            .eq('id', channelId)
            .single();

        if (!channel) return;

        // Get channel members
        const { data: members } = await supabase
            .from('channel_members')
            .select('user_id')
            .eq('channel_id', channelId);

        if (!members) return;

        const userIds = members
            .map((m) => m.user_id)
            .filter((id) => !excludeUserIds.includes(id));

        // Create notifications for all members
        for (const userId of userIds) {
            await this.createNotification({
                userId,
                workspaceId: channel.workspace_id,
                ...notification,
            });
        }
    }
}

module.exports = new NotificationService();

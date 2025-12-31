const { supabase } = require('../config/supabase');
const { firestore } = require('../config/firebase');

/**
 * Search Service - Handles search across messages, channels, and users
 */
class SearchService {
    /**
     * Search messages
     * @param {string} workspaceId - Workspace ID
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Search results
     */
    async searchMessages(workspaceId, query, options = {}) {
        const { limit = 20, channelId, userId, before, after } = options;

        try {
            // Search in Firestore messages
            let messagesQuery = firestore
                .collection('messages')
                .where('workspaceId', '==', workspaceId)
                .where('isDeleted', '==', false)
                .orderBy('createdAt', 'desc')
                .limit(limit);

            if (channelId) {
                messagesQuery = messagesQuery.where('channelId', '==', channelId);
            }

            if (userId) {
                messagesQuery = messagesQuery.where('userId', '==', userId);
            }

            if (before) {
                messagesQuery = messagesQuery.where('createdAt', '<', new Date(before));
            }

            if (after) {
                messagesQuery = messagesQuery.where('createdAt', '>', new Date(after));
            }

            const snapshot = await messagesQuery.get();

            const results = [];
            snapshot.forEach((doc) => {
                const message = doc.data();
                // Simple text matching (in production, use Algolia or Elasticsearch)
                if (message.content.toLowerCase().includes(query.toLowerCase())) {
                    results.push({
                        id: doc.id,
                        ...message,
                        _type: 'message',
                    });
                }
            });

            return results;
        } catch (error) {
            console.error('Search messages error:', error);
            return [];
        }
    }

    /**
     * Search channels
     * @param {string} workspaceId - Workspace ID
     * @param {string} query - Search query
     * @param {string} userId - User ID (for private channel filtering)
     * @returns {Array} Matching channels
     */
    async searchChannels(workspaceId, query, userId) {
        const { data, error } = await supabase
            .from('channels')
            .select('*')
            .eq('workspace_id', workspaceId)
            .eq('is_archived', false)
            .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
            .limit(20);

        if (error) {
            console.error('Search channels error:', error);
            return [];
        }

        // Filter out private channels user doesn't have access to
        const filteredChannels = [];
        for (const channel of data || []) {
            if (!channel.is_private) {
                filteredChannels.push({ ...channel, _type: 'channel' });
            } else {
                // Check if user is member of private channel
                const { data: membership } = await supabase
                    .from('channel_members')
                    .select('id')
                    .eq('channel_id', channel.id)
                    .eq('user_id', userId)
                    .single();

                if (membership) {
                    filteredChannels.push({ ...channel, _type: 'channel' });
                }
            }
        }

        return filteredChannels;
    }

    /**
     * Search users
     * @param {string} workspaceId - Workspace ID (optional)
     * @param {string} query - Search query
     * @param {number} limit - Max results
     * @returns {Array} Matching users
     */
    async searchUsers(workspaceId, query, limit = 20) {
        let baseQuery = supabase
            .from('users')
            .select('id, username, full_name, email, avatar_url, status')
            .eq('is_active', true);

        if (workspaceId) {
            // Join with workspace_members to filter by workspace
            const { data: members } = await supabase
                .from('workspace_members')
                .select('user_id')
                .eq('workspace_id', workspaceId)
                .eq('is_active', true);

            const memberIds = (members || []).map((m) => m.user_id);

            baseQuery = baseQuery.in('id', memberIds);
        }

        const { data, error } = await baseQuery
            .or(`username.ilike.%${query}%,full_name.ilike.%${query}%,email.ilike.%${query}%`)
            .limit(limit);

        if (error) {
            console.error('Search users error:', error);
            return [];
        }

        return (data || []).map((user) => ({ ...user, _type: 'user' }));
    }

    /**
     * Search files
     * @param {string} workspaceId - Workspace ID
     * @param {string} query - Search query
     * @param {Object} options - Search options
     * @returns {Array} Matching files
     */
    async searchFiles(workspaceId, query, options = {}) {
        const { limit = 20, fileType, channelId } = options;

        let baseQuery = supabase
            .from('files')
            .select('*, uploader:uploader_id(id, username, full_name)')
            .eq('workspace_id', workspaceId)
            .ilike('original_name', `%${query}%`)
            .order('created_at', { ascending: false })
            .limit(limit);

        if (fileType) {
            baseQuery = baseQuery.eq('file_type', fileType);
        }

        if (channelId) {
            baseQuery = baseQuery.eq('channel_id', channelId);
        }

        const { data, error } = await baseQuery;

        if (error) {
            console.error('Search files error:', error);
            return [];
        }

        return (data || []).map((file) => ({ ...file, _type: 'file' }));
    }

    /**
     * Global search across all types
     * @param {string} workspaceId - Workspace ID
     * @param {string} query - Search query
     * @param {string} userId - User ID
     * @param {Object} options - Search options
     * @returns {Object} Search results by type
     */
    async globalSearch(workspaceId, query, userId, options = {}) {
        const { types = ['messages', 'channels', 'users', 'files'], limit = 10 } = options;

        const results = {};

        if (types.includes('messages')) {
            results.messages = await this.searchMessages(workspaceId, query, { limit });
        }

        if (types.includes('channels')) {
            results.channels = await this.searchChannels(workspaceId, query, userId);
        }

        if (types.includes('users')) {
            results.users = await this.searchUsers(workspaceId, query, limit);
        }

        if (types.includes('files')) {
            results.files = await this.searchFiles(workspaceId, query, { limit });
        }

        return results;
    }
}

module.exports = new SearchService();

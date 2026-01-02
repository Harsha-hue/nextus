const { firestore } = require('../config/firebase');
const { v4: uuidv4 } = require('uuid');
const { getIO } = require('../config/socket');
const notificationService = require('./notification.service');

// Firestore collection references
const messagesCollection = firestore.collection('messages');

/**
 * Send a message to a channel
 * @param {Object} messageData - Message data
 * @param {string} channelId - Channel ID
 * @param {Object} user - User object
 * @returns {Object} Created message
 */
const sendMessage = async (messageData, channelId, user) => {
    const { content, replyToId, fileIds, mentions } = messageData;

    const messageId = uuidv4();
    const now = new Date();

    const message = {
        id: messageId,
        channelId,
        dmGroupId: null,
        workspaceId: messageData.workspaceId,
        userId: user.id,
        userName: user.full_name || user.username,
        userAvatar: user.avatar_url,
        content,
        type: fileIds?.length > 0 ? 'file' : 'text',
        fileIds: fileIds || [],
        mentions: mentions || [],
        replyToId: replyToId || null,
        replyCount: 0,
        reactions: [],
        isEdited: false,
        isDeleted: false,
        isPinned: false,
        metadata: {},
        createdAt: now,
        updatedAt: now,
    };

    // Save to Firestore
    await messagesCollection.doc(messageId).set(message);

    // If this is a reply, increment reply count on parent
    if (replyToId) {
        const parentRef = messagesCollection.doc(replyToId);
        await firestore.runTransaction(async (transaction) => {
            const parentDoc = await transaction.get(parentRef);
            if (parentDoc.exists) {
                const currentCount = parentDoc.data().replyCount || 0;
                transaction.update(parentRef, { replyCount: currentCount + 1 });
            }
        });
    }

    // Broadcast message via WebSocket
    try {
        const io = getIO();
        io.to(`channel:${channelId}`).emit('message:new', message);
    } catch (error) {
        console.log('Socket not initialized, skipping broadcast');
    }

    // Send push notifications to channel members (except sender)
    try {
        await notificationService.notifyChannelMembers(channelId, {
            type: mentions?.length > 0 ? 'mention' : 'message',
            title: `${user.full_name || user.username} in #${channelId.substring(0, 8)}`,
            body: content.length > 100 ? content.substring(0, 100) + '...' : content,
            data: {
                channelId,
                messageId,
                preview: content.substring(0, 50),
            },
        }, [user.id]);
    } catch (error) {
        console.log('Push notification failed:', error.message);
    }

    return message;
};

/**
 * Get messages for a channel
 * @param {string} channelId - Channel ID
 * @param {Object} options - Query options
 * @returns {Array} List of messages
 */
const getMessages = async (channelId, { limit = 50, before, after }) => {
    let query = messagesCollection
        .where('channelId', '==', channelId)
        .where('isDeleted', '==', false)
        .where('replyToId', '==', null) // Only get top-level messages
        .orderBy('createdAt', 'desc')
        .limit(limit);

    if (before) {
        const beforeDoc = await messagesCollection.doc(before).get();
        if (beforeDoc.exists) {
            query = query.startAfter(beforeDoc);
        }
    }

    if (after) {
        const afterDoc = await messagesCollection.doc(after).get();
        if (afterDoc.exists) {
            query = query.endBefore(afterDoc);
        }
    }

    const snapshot = await query.get();
    const messages = [];

    snapshot.forEach((doc) => {
        messages.push(doc.data());
    });

    // Reverse to get chronological order
    return messages.reverse();
};

/**
 * Get a message by ID
 * @param {string} messageId - Message ID
 * @returns {Object} Message
 */
const getMessageById = async (messageId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    return doc.data();
};

/**
 * Update a message
 * @param {string} messageId - Message ID
 * @param {string} content - New content
 * @param {string} userId - User ID (for authorization)
 * @returns {Object} Updated message
 */
const updateMessage = async (messageId, content, userId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    const message = doc.data();

    if (message.userId !== userId) {
        throw { statusCode: 403, message: 'You can only edit your own messages' };
    }

    const updatedMessage = {
        ...message,
        content,
        isEdited: true,
        updatedAt: new Date(),
    };

    await messagesCollection.doc(messageId).update({
        content,
        isEdited: true,
        updatedAt: new Date(),
    });

    // Broadcast update
    try {
        const io = getIO();
        io.to(`channel:${message.channelId}`).emit('message:updated', updatedMessage);
    } catch (error) {
        console.log('Socket not initialized, skipping broadcast');
    }

    return updatedMessage;
};

/**
 * Delete a message (soft delete)
 * @param {string} messageId - Message ID
 * @param {string} userId - User ID (for authorization)
 * @returns {boolean} Success status
 */
const deleteMessage = async (messageId, userId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    const message = doc.data();

    if (message.userId !== userId) {
        throw { statusCode: 403, message: 'You can only delete your own messages' };
    }

    await messagesCollection.doc(messageId).update({
        isDeleted: true,
        content: 'This message has been deleted',
        updatedAt: new Date(),
    });

    // Broadcast deletion
    try {
        const io = getIO();
        io.to(`channel:${message.channelId}`).emit('message:deleted', { id: messageId });
    } catch (error) {
        console.log('Socket not initialized, skipping broadcast');
    }

    return true;
};

/**
 * Add reaction to a message
 * @param {string} messageId - Message ID
 * @param {string} emoji - Emoji reaction
 * @param {string} userId - User ID
 * @returns {Object} Updated message
 */
const addReaction = async (messageId, emoji, userId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    const message = doc.data();
    let reactions = message.reactions || [];

    // Find existing reaction for this emoji
    const existingIndex = reactions.findIndex((r) => r.emoji === emoji);

    if (existingIndex >= 0) {
        // Check if user already reacted
        if (reactions[existingIndex].userIds.includes(userId)) {
            throw { statusCode: 409, message: 'You already reacted with this emoji' };
        }
        // Add user to existing reaction
        reactions[existingIndex].userIds.push(userId);
        reactions[existingIndex].count++;
    } else {
        // Create new reaction
        reactions.push({
            emoji,
            userIds: [userId],
            count: 1,
        });
    }

    await messagesCollection.doc(messageId).update({ reactions });

    // Broadcast reaction
    try {
        const io = getIO();
        io.to(`channel:${message.channelId}`).emit('reaction:added', {
            messageId,
            emoji,
            userId,
        });
    } catch (error) {
        console.log('Socket not initialized, skipping broadcast');
    }

    return { ...message, reactions };
};

/**
 * Remove reaction from a message
 * @param {string} messageId - Message ID
 * @param {string} emoji - Emoji reaction
 * @param {string} userId - User ID
 * @returns {Object} Updated message
 */
const removeReaction = async (messageId, emoji, userId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    const message = doc.data();
    let reactions = message.reactions || [];

    // Find existing reaction for this emoji
    const existingIndex = reactions.findIndex((r) => r.emoji === emoji);

    if (existingIndex < 0) {
        throw { statusCode: 404, message: 'Reaction not found' };
    }

    // Remove user from reaction
    const userIndex = reactions[existingIndex].userIds.indexOf(userId);
    if (userIndex < 0) {
        throw { statusCode: 404, message: 'You have not reacted with this emoji' };
    }

    reactions[existingIndex].userIds.splice(userIndex, 1);
    reactions[existingIndex].count--;

    // Remove reaction if no users left
    if (reactions[existingIndex].count === 0) {
        reactions.splice(existingIndex, 1);
    }

    await messagesCollection.doc(messageId).update({ reactions });

    // Broadcast reaction removal
    try {
        const io = getIO();
        io.to(`channel:${message.channelId}`).emit('reaction:removed', {
            messageId,
            emoji,
            userId,
        });
    } catch (error) {
        console.log('Socket not initialized, skipping broadcast');
    }

    return { ...message, reactions };
};

/**
 * Get thread messages (replies to a message)
 * @param {string} parentMessageId - Parent message ID
 * @param {Object} options - Query options
 * @returns {Array} List of thread messages
 */
const getThreadMessages = async (parentMessageId, { limit = 50 }) => {
    const query = messagesCollection
        .where('replyToId', '==', parentMessageId)
        .where('isDeleted', '==', false)
        .orderBy('createdAt', 'asc')
        .limit(limit);

    const snapshot = await query.get();
    const messages = [];

    snapshot.forEach((doc) => {
        messages.push(doc.data());
    });

    return messages;
};

/**
 * Pin a message
 * @param {string} messageId - Message ID
 * @returns {Object} Updated message
 */
const pinMessage = async (messageId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    await messagesCollection.doc(messageId).update({ isPinned: true });

    return { ...doc.data(), isPinned: true };
};

/**
 * Unpin a message
 * @param {string} messageId - Message ID
 * @returns {Object} Updated message
 */
const unpinMessage = async (messageId) => {
    const doc = await messagesCollection.doc(messageId).get();

    if (!doc.exists) {
        throw { statusCode: 404, message: 'Message not found' };
    }

    await messagesCollection.doc(messageId).update({ isPinned: false });

    return { ...doc.data(), isPinned: false };
};

/**
 * Get pinned messages for a channel
 * @param {string} channelId - Channel ID
 * @returns {Array} List of pinned messages
 */
const getPinnedMessages = async (channelId) => {
    const query = messagesCollection
        .where('channelId', '==', channelId)
        .where('isPinned', '==', true)
        .where('isDeleted', '==', false)
        .orderBy('createdAt', 'desc');

    const snapshot = await query.get();
    const messages = [];

    snapshot.forEach((doc) => {
        messages.push(doc.data());
    });

    return messages;
};

// DM Conversations collection
const dmConversationsCollection = firestore.collection('dm_conversations');
const dmMessagesCollection = firestore.collection('dm_messages');

/**
 * Get DM conversations for a user in a workspace
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - Current user ID
 * @returns {Array} List of DM conversations
 */
const getDmConversations = async (workspaceId, userId) => {
    // Get conversations where user is a participant
    const query = dmConversationsCollection
        .where('workspace_id', '==', workspaceId)
        .where('participant_ids', 'array-contains', userId)
        .orderBy('last_message_at', 'desc');

    const snapshot = await query.get();
    const conversations = [];

    snapshot.forEach((doc) => {
        const data = doc.data();
        // Get the other user's info
        const otherUserId = data.participant_ids.find(id => id !== userId);
        conversations.push({
            id: doc.id,
            workspace_id: data.workspace_id,
            other_user: {
                id: otherUserId,
                full_name: data.participant_names?.[otherUserId] || 'User',
                avatar_url: data.participant_avatars?.[otherUserId],
                status: data.participant_statuses?.[otherUserId] || 'offline',
            },
            last_message: data.last_message,
            last_message_at: data.last_message_at,
            unread_count: data.unread_counts?.[userId] || 0,
            is_muted: data.muted_by?.includes(userId) || false,
        });
    });

    return conversations;
};

/**
 * Get or create a DM conversation
 * @param {string} workspaceId - Workspace ID
 * @param {string} userId - Current user ID
 * @param {string} otherUserId - Other user ID
 * @returns {Object} DM conversation
 */
const getOrCreateDmConversation = async (workspaceId, userId, otherUserId) => {
    // Check if conversation already exists
    const existingQuery = dmConversationsCollection
        .where('workspace_id', '==', workspaceId)
        .where('participant_ids', 'array-contains', userId);

    const snapshot = await existingQuery.get();
    let existingConversation = null;

    snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.participant_ids.includes(otherUserId)) {
            existingConversation = { id: doc.id, ...data };
        }
    });

    if (existingConversation) {
        return existingConversation;
    }

    // Create new conversation
    const conversationId = uuidv4();
    const now = new Date();

    const conversation = {
        id: conversationId,
        workspace_id: workspaceId,
        participant_ids: [userId, otherUserId],
        participant_names: {},
        participant_avatars: {},
        participant_statuses: {},
        last_message: null,
        last_message_at: now,
        unread_counts: { [userId]: 0, [otherUserId]: 0 },
        muted_by: [],
        created_at: now,
    };

    await dmConversationsCollection.doc(conversationId).set(conversation);

    return conversation;
};

/**
 * Get DM messages
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Current user ID
 * @param {Object} options - Query options
 * @returns {Array} List of DM messages
 */
const getDmMessages = async (conversationId, userId, { limit = 50, before }) => {
    let query = dmMessagesCollection
        .where('conversation_id', '==', conversationId)
        .where('is_deleted', '==', false)
        .orderBy('created_at', 'desc')
        .limit(limit);

    if (before) {
        const beforeDoc = await dmMessagesCollection.doc(before).get();
        if (beforeDoc.exists) {
            query = query.startAfter(beforeDoc);
        }
    }

    const snapshot = await query.get();
    const messages = [];

    snapshot.forEach((doc) => {
        messages.push(doc.data());
    });

    // Mark as read
    await dmConversationsCollection.doc(conversationId).update({
        [`unread_counts.${userId}`]: 0,
    });

    return messages.reverse();
};

/**
 * Send a DM message
 * @param {string} conversationId - Conversation ID
 * @param {string} userId - Sender user ID
 * @param {string} content - Message content
 * @returns {Object} Created message
 */
const sendDmMessage = async (conversationId, userId, content) => {
    const messageId = uuidv4();
    const now = new Date();

    const message = {
        id: messageId,
        conversation_id: conversationId,
        sender_id: userId,
        content,
        is_edited: false,
        is_deleted: false,
        reactions: [],
        created_at: now,
        updated_at: now,
    };

    await dmMessagesCollection.doc(messageId).set(message);

    // Update conversation
    const conversationRef = dmConversationsCollection.doc(conversationId);
    const conversationDoc = await conversationRef.get();

    if (conversationDoc.exists) {
        const data = conversationDoc.data();
        const otherUserId = data.participant_ids.find(id => id !== userId);

        await conversationRef.update({
            last_message: content,
            last_message_at: now,
            [`unread_counts.${otherUserId}`]: (data.unread_counts?.[otherUserId] || 0) + 1,
        });
    }

    // Broadcast via WebSocket
    try {
        const io = getIO();
        io.to(`dm:${conversationId}`).emit('dm:new', message);
    } catch (error) {
        console.log('Socket not initialized, skipping DM broadcast');
    }

    return message;
};

module.exports = {
    sendMessage,
    getMessages,
    getMessageById,
    updateMessage,
    deleteMessage,
    addReaction,
    removeReaction,
    getThreadMessages,
    pinMessage,
    unpinMessage,
    getPinnedMessages,
    getDmConversations,
    getOrCreateDmConversation,
    getDmMessages,
    sendDmMessage,
};


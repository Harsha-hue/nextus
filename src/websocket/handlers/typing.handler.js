const { firestore } = require('../../config/firebase');
const { getIO } = require('../../config/socket');

// Firestore collection for typing indicators
const typingCollection = firestore.collection('typing');

// Typing timeout (user stops typing after 5 seconds of inactivity)
const TYPING_TIMEOUT = 5000;

// Store active typing timeouts
const typingTimeouts = new Map();

/**
 * Handle typing:start event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Typing data
 */
const handleTypingStart = async (socket, data) => {
    try {
        const { channelId } = data;
        const userId = socket.user.id;
        const userName = socket.user.full_name || socket.user.username;

        if (!channelId) {
            return;
        }

        const typingKey = `${channelId}:${userId}`;

        // Clear existing timeout
        if (typingTimeouts.has(typingKey)) {
            clearTimeout(typingTimeouts.get(typingKey));
        }

        // Get current typing users
        const typingDoc = await typingCollection.doc(channelId).get();
        let typingUsers = typingDoc.exists ? typingDoc.data().users || [] : [];

        // Add user if not already typing
        const existingIndex = typingUsers.findIndex((u) => u.userId === userId);
        if (existingIndex >= 0) {
            typingUsers[existingIndex].timestamp = new Date();
        } else {
            typingUsers.push({
                userId,
                userName,
                timestamp: new Date(),
            });
        }

        // Update Firestore
        await typingCollection.doc(channelId).set({ users: typingUsers });

        // Broadcast to channel
        try {
            const io = getIO();
            io.to(`channel:${channelId}`).emit('typing:user', {
                channelId,
                users: typingUsers,
            });
        } catch (error) {
            console.log('Socket broadcast error:', error.message);
        }

        // Set timeout to remove typing indicator
        const timeout = setTimeout(() => {
            handleTypingStop(socket, { channelId });
        }, TYPING_TIMEOUT);

        typingTimeouts.set(typingKey, timeout);
    } catch (error) {
        console.error('Typing start error:', error);
    }
};

/**
 * Handle typing:stop event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Typing data
 */
const handleTypingStop = async (socket, data) => {
    try {
        const { channelId } = data;
        const userId = socket.user.id;

        if (!channelId) {
            return;
        }

        const typingKey = `${channelId}:${userId}`;

        // Clear timeout
        if (typingTimeouts.has(typingKey)) {
            clearTimeout(typingTimeouts.get(typingKey));
            typingTimeouts.delete(typingKey);
        }

        // Get current typing users
        const typingDoc = await typingCollection.doc(channelId).get();
        if (!typingDoc.exists) {
            return;
        }

        let typingUsers = typingDoc.data().users || [];

        // Remove user from typing list
        typingUsers = typingUsers.filter((u) => u.userId !== userId);

        // Update Firestore
        await typingCollection.doc(channelId).set({ users: typingUsers });

        // Broadcast to channel
        try {
            const io = getIO();
            io.to(`channel:${channelId}`).emit('typing:user', {
                channelId,
                users: typingUsers,
            });
        } catch (error) {
            console.log('Socket broadcast error:', error.message);
        }
    } catch (error) {
        console.error('Typing stop error:', error);
    }
};

/**
 * Clear all typing indicators for a user (on disconnect)
 * @param {string} userId - User ID
 */
const clearUserTyping = async (userId) => {
    try {
        // Clear all timeouts for this user
        for (const [key, timeout] of typingTimeouts.entries()) {
            if (key.includes(userId)) {
                clearTimeout(timeout);
                typingTimeouts.delete(key);
            }
        }

        // Note: Firestore cleanup would require querying all typing docs
        // For now, the typing indicators will naturally expire
    } catch (error) {
        console.error('Clear user typing error:', error);
    }
};

module.exports = {
    handleTypingStart,
    handleTypingStop,
    clearUserTyping,
};

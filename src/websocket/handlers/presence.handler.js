const { firestore } = require('../../config/firebase');
const { getIO } = require('../../config/socket');

// Firestore collection for presence
const presenceCollection = firestore.collection('presence');

/**
 * Handle presence:update event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Presence data
 */
const handlePresenceUpdate = async (socket, data) => {
    try {
        const { status, currentChannelId } = data;
        const userId = socket.user.id;
        const workspaceId = socket.workspaceId;

        const presenceData = {
            userId,
            workspaceId,
            status: status || 'online',
            lastSeen: new Date(),
            currentChannelId: currentChannelId || null,
            deviceInfo: {
                platform: data.platform || 'unknown',
                appVersion: data.appVersion || '1.0.0',
            },
        };

        // Update Firestore
        await presenceCollection.doc(userId).set(presenceData, { merge: true });

        // Broadcast to workspace members
        try {
            const io = getIO();
            io.to(`workspace:${workspaceId}`).emit('presence:changed', {
                userId,
                status: presenceData.status,
                lastSeen: presenceData.lastSeen,
            });
        } catch (error) {
            console.log('Socket broadcast error:', error.message);
        }

        socket.emit('presence:updated', { success: true });
    } catch (error) {
        console.error('Presence update error:', error);
        socket.emit('error', { message: 'Failed to update presence' });
    }
};

/**
 * Set user offline
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 */
const setUserOffline = async (userId, workspaceId) => {
    try {
        await presenceCollection.doc(userId).set({
            status: 'offline',
            lastSeen: new Date(),
        }, { merge: true });

        // Broadcast offline status
        try {
            const io = getIO();
            io.to(`workspace:${workspaceId}`).emit('presence:changed', {
                userId,
                status: 'offline',
                lastSeen: new Date(),
            });
        } catch (error) {
            console.log('Socket broadcast error:', error.message);
        }
    } catch (error) {
        console.error('Set user offline error:', error);
    }
};

/**
 * Get online users in workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Array} Online user IDs
 */
const getOnlineUsers = async (workspaceId) => {
    try {
        const snapshot = await presenceCollection
            .where('workspaceId', '==', workspaceId)
            .where('status', '==', 'online')
            .get();

        const onlineUsers = [];
        snapshot.forEach((doc) => {
            onlineUsers.push(doc.data());
        });

        return onlineUsers;
    } catch (error) {
        console.error('Get online users error:', error);
        return [];
    }
};

module.exports = {
    handlePresenceUpdate,
    setUserOffline,
    getOnlineUsers,
};

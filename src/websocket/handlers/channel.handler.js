/**
 * Handle channel:join event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Channel data
 */
const handleChannelJoin = async (socket, data) => {
    try {
        const { channelId } = data;

        if (!channelId) {
            socket.emit('error', { message: 'Channel ID is required' });
            return;
        }

        // Join the socket room for this channel
        socket.join(`channel:${channelId}`);
        socket.currentChannelId = channelId;

        socket.emit('channel:joined', { success: true, channelId });

        console.log(`User ${socket.user.id} joined channel ${channelId}`);
    } catch (error) {
        console.error('Channel join error:', error);
        socket.emit('error', { message: 'Failed to join channel' });
    }
};

/**
 * Handle channel:leave event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Channel data
 */
const handleChannelLeave = async (socket, data) => {
    try {
        const { channelId } = data;

        if (!channelId) {
            return;
        }

        // Leave the socket room for this channel
        socket.leave(`channel:${channelId}`);

        if (socket.currentChannelId === channelId) {
            socket.currentChannelId = null;
        }

        socket.emit('channel:left', { success: true, channelId });

        console.log(`User ${socket.user.id} left channel ${channelId}`);
    } catch (error) {
        console.error('Channel leave error:', error);
    }
};

/**
 * Join workspace room
 * @param {Object} socket - Socket instance
 * @param {string} workspaceId - Workspace ID
 */
const joinWorkspace = (socket, workspaceId) => {
    socket.join(`workspace:${workspaceId}`);
    socket.workspaceId = workspaceId;
    console.log(`User ${socket.user.id} joined workspace ${workspaceId}`);
};

/**
 * Leave workspace room
 * @param {Object} socket - Socket instance
 */
const leaveWorkspace = (socket) => {
    if (socket.workspaceId) {
        socket.leave(`workspace:${socket.workspaceId}`);
        console.log(`User ${socket.user.id} left workspace ${socket.workspaceId}`);
        socket.workspaceId = null;
    }
};

module.exports = {
    handleChannelJoin,
    handleChannelLeave,
    joinWorkspace,
    leaveWorkspace,
};

const messageService = require('../../services/message.service');

/**
 * Handle message:send event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Message data
 */
const handleSendMessage = async (socket, data) => {
    try {
        const { channelId, content, replyToId, fileIds, mentions, workspaceId } = data;
        const user = socket.user;

        if (!channelId || !content) {
            socket.emit('error', { message: 'Channel ID and content are required' });
            return;
        }

        const message = await messageService.sendMessage(
            { content, replyToId, fileIds, mentions, workspaceId },
            channelId,
            user
        );

        // Acknowledge to sender
        socket.emit('message:sent', { success: true, message });
    } catch (error) {
        console.error('Send message error:', error);
        socket.emit('error', { message: error.message || 'Failed to send message' });
    }
};

/**
 * Handle message:edit event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Edit data
 */
const handleEditMessage = async (socket, data) => {
    try {
        const { messageId, content } = data;
        const userId = socket.user.id;

        if (!messageId || !content) {
            socket.emit('error', { message: 'Message ID and content are required' });
            return;
        }

        const message = await messageService.updateMessage(messageId, content, userId);

        socket.emit('message:edited', { success: true, message });
    } catch (error) {
        console.error('Edit message error:', error);
        socket.emit('error', { message: error.message || 'Failed to edit message' });
    }
};

/**
 * Handle message:delete event
 * @param {Object} socket - Socket instance
 * @param {Object} data - Delete data
 */
const handleDeleteMessage = async (socket, data) => {
    try {
        const { messageId } = data;
        const userId = socket.user.id;

        if (!messageId) {
            socket.emit('error', { message: 'Message ID is required' });
            return;
        }

        await messageService.deleteMessage(messageId, userId);

        socket.emit('message:deleted_ack', { success: true, messageId });
    } catch (error) {
        console.error('Delete message error:', error);
        socket.emit('error', { message: error.message || 'Failed to delete message' });
    }
};

module.exports = {
    handleSendMessage,
    handleEditMessage,
    handleDeleteMessage,
};

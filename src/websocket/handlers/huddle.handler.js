const huddleService = require('../../services/huddle.service');
const EVENTS = require('../events');

/**
 * Set up huddle WebSocket handlers for WebRTC signaling
 * @param {Socket} socket - Socket.IO socket instance
 */
const setupHuddleHandlers = (socket) => {
    /**
     * Join huddle room for signaling
     */
    socket.on('huddle:join-room', async (data) => {
        const { huddleId } = data;

        try {
            // Join the huddle socket room
            socket.join(`huddle:${huddleId}`);

            // Notify others in the room
            socket.to(`huddle:${huddleId}`).emit('huddle:user-joined', {
                huddleId,
                userId: socket.userId,
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Leave huddle room
     */
    socket.on('huddle:leave-room', async (data) => {
        const { huddleId } = data;

        socket.leave(`huddle:${huddleId}`);

        // Notify others in the room
        socket.to(`huddle:${huddleId}`).emit('huddle:user-left', {
            huddleId,
            userId: socket.userId,
        });
    });

    /**
     * Handle WebRTC offer
     */
    socket.on('huddle:offer', async (data) => {
        const { huddleId, toUserId, offer } = data;

        await huddleService.handleSignaling({
            huddleId,
            fromUserId: socket.userId,
            toUserId,
            type: 'offer',
            data: offer,
        });
    });

    /**
     * Handle WebRTC answer
     */
    socket.on('huddle:answer', async (data) => {
        const { huddleId, toUserId, answer } = data;

        await huddleService.handleSignaling({
            huddleId,
            fromUserId: socket.userId,
            toUserId,
            type: 'answer',
            data: answer,
        });
    });

    /**
     * Handle ICE candidate
     */
    socket.on('huddle:ice-candidate', async (data) => {
        const { huddleId, toUserId, candidate } = data;

        await huddleService.handleSignaling({
            huddleId,
            fromUserId: socket.userId,
            toUserId,
            type: 'ice-candidate',
            data: candidate,
        });
    });

    /**
     * Mute/unmute audio
     */
    socket.on('huddle:toggle-mute', async (data) => {
        const { huddleId, isMuted } = data;

        try {
            await huddleService.updateParticipantStatus(huddleId, socket.userId, {
                isMuted,
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Toggle video
     */
    socket.on('huddle:toggle-video', async (data) => {
        const { huddleId, isVideoOff } = data;

        try {
            await huddleService.updateParticipantStatus(huddleId, socket.userId, {
                isVideoOff,
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });

    /**
     * Toggle screen sharing
     */
    socket.on('huddle:toggle-screen', async (data) => {
        const { huddleId, isScreenSharing } = data;

        try {
            await huddleService.updateParticipantStatus(huddleId, socket.userId, {
                isScreenSharing,
            });
        } catch (error) {
            socket.emit('error', { message: error.message });
        }
    });
};

module.exports = { setupHuddleHandlers };

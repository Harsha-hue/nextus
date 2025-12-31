const { v4: uuidv4 } = require('uuid');
const { supabase } = require('../config/supabase');
const { firestore } = require('../config/firebase');
const { getIO } = require('../config/socket');

/**
 * Huddle Service - Manages voice/video calls using WebRTC signaling
 */
class HuddleService {
    constructor() {
        this.activeHuddles = new Map(); // In-memory store for active huddles
    }

    /**
     * Create a new huddle
     * @param {Object} huddleData - Huddle creation data
     * @returns {Object} Created huddle
     */
    async createHuddle(huddleData) {
        const { channelId, workspaceId, creatorId, type = 'audio' } = huddleData;
        const huddleId = uuidv4();

        const huddle = {
            id: huddleId,
            channelId,
            workspaceId,
            creatorId,
            type, // 'audio' or 'video'
            status: 'active',
            participants: [
                {
                    userId: creatorId,
                    joinedAt: new Date(),
                    isMuted: false,
                    isVideoOff: type === 'audio',
                    isScreenSharing: false,
                },
            ],
            createdAt: new Date(),
            endedAt: null,
        };

        // Store in Firestore for persistence
        await firestore.collection('huddles').doc(huddleId).set({
            ...huddle,
            createdAt: new Date(),
        });

        // Store in memory for quick access
        this.activeHuddles.set(huddleId, huddle);

        // Notify channel members about the new huddle
        const io = getIO();
        io.to(`channel:${channelId}`).emit('huddle:started', huddle);

        return huddle;
    }

    /**
     * Join an existing huddle
     * @param {string} huddleId - Huddle ID
     * @param {string} userId - User ID
     * @returns {Object} Updated huddle
     */
    async joinHuddle(huddleId, userId) {
        let huddle = this.activeHuddles.get(huddleId);

        if (!huddle) {
            // Try to get from Firestore
            const doc = await firestore.collection('huddles').doc(huddleId).get();
            if (!doc.exists) {
                throw { statusCode: 404, message: 'Huddle not found' };
            }
            huddle = doc.data();
            this.activeHuddles.set(huddleId, huddle);
        }

        if (huddle.status !== 'active') {
            throw { statusCode: 400, message: 'Huddle is no longer active' };
        }

        // Check if user is already in huddle
        const existingParticipant = huddle.participants.find((p) => p.userId === userId);
        if (existingParticipant) {
            return huddle;
        }

        // Add participant
        const participant = {
            userId,
            joinedAt: new Date(),
            isMuted: false,
            isVideoOff: huddle.type === 'audio',
            isScreenSharing: false,
        };

        huddle.participants.push(participant);
        this.activeHuddles.set(huddleId, huddle);

        // Update Firestore
        await firestore.collection('huddles').doc(huddleId).update({
            participants: huddle.participants,
        });

        // Notify other participants
        const io = getIO();
        io.to(`huddle:${huddleId}`).emit('huddle:participant-joined', {
            huddleId,
            participant,
        });

        return huddle;
    }

    /**
     * Leave a huddle
     * @param {string} huddleId - Huddle ID
     * @param {string} userId - User ID
     */
    async leaveHuddle(huddleId, userId) {
        let huddle = this.activeHuddles.get(huddleId);

        if (!huddle) {
            const doc = await firestore.collection('huddles').doc(huddleId).get();
            if (!doc.exists) return;
            huddle = doc.data();
        }

        // Remove participant
        huddle.participants = huddle.participants.filter((p) => p.userId !== userId);

        // If no participants left, end the huddle
        if (huddle.participants.length === 0) {
            return this.endHuddle(huddleId);
        }

        this.activeHuddles.set(huddleId, huddle);

        // Update Firestore
        await firestore.collection('huddles').doc(huddleId).update({
            participants: huddle.participants,
        });

        // Notify other participants
        const io = getIO();
        io.to(`huddle:${huddleId}`).emit('huddle:participant-left', {
            huddleId,
            userId,
        });

        return huddle;
    }

    /**
     * End a huddle
     * @param {string} huddleId - Huddle ID
     */
    async endHuddle(huddleId) {
        const huddle = this.activeHuddles.get(huddleId);

        // Update status
        const updatedHuddle = {
            ...huddle,
            status: 'ended',
            endedAt: new Date(),
        };

        // Remove from active huddles
        this.activeHuddles.delete(huddleId);

        // Update Firestore
        await firestore.collection('huddles').doc(huddleId).update({
            status: 'ended',
            endedAt: new Date(),
        });

        // Notify channel members
        const io = getIO();
        if (huddle?.channelId) {
            io.to(`channel:${huddle.channelId}`).emit('huddle:ended', { huddleId });
        }
        io.to(`huddle:${huddleId}`).emit('huddle:ended', { huddleId });

        return updatedHuddle;
    }

    /**
     * Update participant status
     * @param {string} huddleId - Huddle ID
     * @param {string} userId - User ID
     * @param {Object} status - Status updates
     */
    async updateParticipantStatus(huddleId, userId, status) {
        const huddle = this.activeHuddles.get(huddleId);

        if (!huddle) {
            throw { statusCode: 404, message: 'Huddle not found' };
        }

        const participant = huddle.participants.find((p) => p.userId === userId);
        if (!participant) {
            throw { statusCode: 404, message: 'Participant not found' };
        }

        // Update status
        Object.assign(participant, status);
        this.activeHuddles.set(huddleId, huddle);

        // Notify other participants
        const io = getIO();
        io.to(`huddle:${huddleId}`).emit('huddle:participant-updated', {
            huddleId,
            userId,
            status,
        });

        return huddle;
    }

    /**
     * Get active huddle in a channel
     * @param {string} channelId - Channel ID
     * @returns {Object|null} Active huddle or null
     */
    async getChannelHuddle(channelId) {
        for (const [, huddle] of this.activeHuddles) {
            if (huddle.channelId === channelId && huddle.status === 'active') {
                return huddle;
            }
        }

        // Check Firestore
        const snapshot = await firestore
            .collection('huddles')
            .where('channelId', '==', channelId)
            .where('status', '==', 'active')
            .limit(1)
            .get();

        if (snapshot.empty) return null;

        const doc = snapshot.docs[0];
        const huddle = { id: doc.id, ...doc.data() };
        this.activeHuddles.set(huddle.id, huddle);

        return huddle;
    }

    /**
     * Handle WebRTC signaling (offer/answer/ice-candidate)
     * @param {Object} signalData - Signaling data
     */
    async handleSignaling(signalData) {
        const { huddleId, fromUserId, toUserId, type, data } = signalData;

        const io = getIO();

        // Send to specific user
        io.to(`user:${toUserId}`).emit('huddle:signal', {
            huddleId,
            fromUserId,
            type,
            data,
        });
    }
}

module.exports = new HuddleService();

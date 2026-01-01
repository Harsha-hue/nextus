/**
 * WebRTC Signaling Service
 * Dedicated server for WebRTC offer/answer/ICE exchange
 * Runs independently on port 3002
 */
const http = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const { supabase } = require('../config/supabase');

// Active huddles: huddleId -> { participants, type, roomId, createdAt }
const activeHuddles = new Map();

// User socket mapping: socketId -> { userId, huddleId }
const userSockets = new Map();

/**
 * Start signaling server
 * @param {number} port - Port to listen on
 */
const startSignalingServer = (port = 3002) => {
    const server = http.createServer((req, res) => {
        // Health check endpoint
        if (req.url === '/health') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ status: 'ok', service: 'signaling' }));
            return;
        }
        res.writeHead(404);
        res.end();
    });

    const io = new Server(server, {
        cors: {
            origin: true,
            credentials: true,
        },
        transports: ['websocket', 'polling'],
    });

    // JWT Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token ||
                socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            const decoded = jwt.verify(token, config.jwt.secret);

            // Verify user exists
            const { data: user, error } = await supabase
                .from('users')
                .select('id, username, full_name')
                .eq('id', decoded.userId)
                .single();

            if (error || !user) {
                return next(new Error('Invalid user'));
            }

            socket.userId = user.id;
            socket.user = user;
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        console.log(`📡 Signaling: User ${socket.userId} connected`);

        // Create new huddle
        socket.on('huddle:create', async (data) => {
            const { roomId, type = 'audio' } = data;

            // Verify room membership
            const isMember = await verifyRoomMembership(socket.userId, roomId);
            if (!isMember) {
                socket.emit('error', { message: 'Not authorized for this room' });
                return;
            }

            // Check if huddle already exists in room
            const existingHuddle = findHuddleByRoom(roomId);
            if (existingHuddle) {
                socket.emit('huddle:exists', { huddleId: existingHuddle.id });
                return;
            }

            const huddleId = `huddle_${Date.now()}_${socket.userId}`;

            activeHuddles.set(huddleId, {
                id: huddleId,
                roomId,
                type,
                createdBy: socket.userId,
                createdByName: socket.user.full_name || socket.user.username,
                participants: new Map([[socket.userId, { socketId: socket.id, joinedAt: new Date() }]]),
                createdAt: new Date(),
            });

            userSockets.set(socket.id, { userId: socket.userId, huddleId });
            socket.join(huddleId);

            socket.emit('huddle:created', { huddleId, type });

            // Notify room about new huddle
            io.to(`room:${roomId}`).emit('huddle:started', {
                huddleId,
                roomId,
                type,
                createdBy: socket.user,
            });

            console.log(`🎙️ Huddle created: ${huddleId} in room ${roomId}`);
        });

        // Join existing huddle
        socket.on('huddle:join', async (data) => {
            const { huddleId } = data;

            const huddle = activeHuddles.get(huddleId);
            if (!huddle) {
                socket.emit('error', { message: 'Huddle not found' });
                return;
            }

            // Verify room membership
            const isMember = await verifyRoomMembership(socket.userId, huddle.roomId);
            if (!isMember) {
                socket.emit('error', { message: 'Not authorized for this huddle' });
                return;
            }

            // Add participant
            huddle.participants.set(socket.userId, { socketId: socket.id, joinedAt: new Date() });
            userSockets.set(socket.id, { userId: socket.userId, huddleId });
            socket.join(huddleId);

            // Get existing participants for the new user
            const existingParticipants = Array.from(huddle.participants.entries())
                .filter(([id]) => id !== socket.userId)
                .map(([id, data]) => ({ id, ...data }));

            socket.emit('huddle:joined', {
                huddleId,
                type: huddle.type,
                participants: existingParticipants,
            });

            // Notify others
            socket.to(huddleId).emit('huddle:user-joined', {
                huddleId,
                user: {
                    id: socket.userId,
                    name: socket.user.full_name || socket.user.username,
                },
            });

            console.log(`👤 ${socket.userId} joined huddle ${huddleId}`);
        });

        // WebRTC Offer
        socket.on('rtc:offer', (data) => {
            const { huddleId, targetUserId, offer } = data;

            const huddle = activeHuddles.get(huddleId);
            if (!huddle) return;

            const target = huddle.participants.get(targetUserId);
            if (target) {
                io.to(target.socketId).emit('rtc:offer', {
                    huddleId,
                    fromUserId: socket.userId,
                    fromUserName: socket.user.full_name || socket.user.username,
                    offer,
                });
            }
        });

        // WebRTC Answer
        socket.on('rtc:answer', (data) => {
            const { huddleId, targetUserId, answer } = data;

            const huddle = activeHuddles.get(huddleId);
            if (!huddle) return;

            const target = huddle.participants.get(targetUserId);
            if (target) {
                io.to(target.socketId).emit('rtc:answer', {
                    huddleId,
                    fromUserId: socket.userId,
                    answer,
                });
            }
        });

        // ICE Candidate
        socket.on('rtc:ice-candidate', (data) => {
            const { huddleId, targetUserId, candidate } = data;

            const huddle = activeHuddles.get(huddleId);
            if (!huddle) return;

            const target = huddle.participants.get(targetUserId);
            if (target) {
                io.to(target.socketId).emit('rtc:ice-candidate', {
                    huddleId,
                    fromUserId: socket.userId,
                    candidate,
                });
            }
        });

        // Media state updates (mute, video off, screen share)
        socket.on('rtc:media-state', (data) => {
            const { huddleId, isMuted, isVideoOff, isScreenSharing } = data;

            socket.to(huddleId).emit('rtc:media-state', {
                userId: socket.userId,
                isMuted,
                isVideoOff,
                isScreenSharing,
            });
        });

        // Leave huddle
        socket.on('huddle:leave', (data) => {
            handleUserLeave(socket, io);
        });

        // Disconnect
        socket.on('disconnect', () => {
            console.log(`📡 Signaling: User ${socket.userId} disconnected`);
            handleUserLeave(socket, io);
        });
    });

    server.listen(port, '0.0.0.0', () => {
        console.log(`📡 WebRTC Signaling server running on port ${port}`);
    });

    return { server, io };
};

/**
 * Handle user leaving huddle
 */
const handleUserLeave = (socket, io) => {
    const userData = userSockets.get(socket.id);
    if (!userData) return;

    const { huddleId } = userData;
    const huddle = activeHuddles.get(huddleId);

    if (huddle) {
        huddle.participants.delete(socket.userId);
        socket.leave(huddleId);

        // Notify others
        io.to(huddleId).emit('huddle:user-left', {
            huddleId,
            userId: socket.userId,
        });

        // End huddle if empty
        if (huddle.participants.size === 0) {
            activeHuddles.delete(huddleId);
            io.to(`room:${huddle.roomId}`).emit('huddle:ended', { huddleId });
            console.log(`🔇 Huddle ended: ${huddleId}`);
        }
    }

    userSockets.delete(socket.id);
};

/**
 * Find huddle by room ID
 */
const findHuddleByRoom = (roomId) => {
    for (const huddle of activeHuddles.values()) {
        if (huddle.roomId === roomId) {
            return huddle;
        }
    }
    return null;
};

/**
 * Verify user is member of room (channel)
 */
const verifyRoomMembership = async (userId, roomId) => {
    // In production, check actual membership
    // For now, allow all authenticated users
    // TODO: Implement proper channel membership check
    return true;
};

/**
 * Get ICE server configuration
 */
const getIceServers = () => {
    const servers = [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
    ];

    // Add TURN server if configured
    if (process.env.TURN_SERVER) {
        servers.push({
            urls: process.env.TURN_SERVER,
            username: process.env.TURN_USERNAME,
            credential: process.env.TURN_PASSWORD,
        });
    }

    return servers;
};

module.exports = {
    startSignalingServer,
    getIceServers,
};

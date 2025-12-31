const jwt = require('jsonwebtoken');
const { initializeSocket, getIO } = require('../config/socket');
const config = require('../config/environment');
const { supabase } = require('../config/supabase');
const events = require('./events');

// Import handlers
const { handleSendMessage, handleEditMessage, handleDeleteMessage } = require('./handlers/message.handler');
const { handlePresenceUpdate, setUserOffline } = require('./handlers/presence.handler');
const { handleTypingStart, handleTypingStop, clearUserTyping } = require('./handlers/typing.handler');
const { handleChannelJoin, handleChannelLeave, joinWorkspace, leaveWorkspace } = require('./handlers/channel.handler');

/**
 * Initialize WebSocket server and set up event handlers
 * @param {Object} httpServer - HTTP server instance
 */
const initializeSocketServer = (httpServer) => {
    const io = initializeSocket(httpServer);

    // Authentication middleware
    io.use(async (socket, next) => {
        try {
            const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                return next(new Error('Authentication required'));
            }

            // Verify JWT
            const decoded = jwt.verify(token, config.jwt.secret);

            // Get user from database
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', decoded.userId)
                .single();

            if (error || !user) {
                return next(new Error('Invalid token'));
            }

            if (!user.is_active) {
                return next(new Error('Account is deactivated'));
            }

            // Attach user to socket
            socket.user = user;
            next();
        } catch (error) {
            console.error('Socket auth error:', error.message);
            next(new Error('Authentication failed'));
        }
    });

    // Connection handler
    io.on('connection', async (socket) => {
        console.log(`User connected: ${socket.user.id} (${socket.user.username})`);

        // Send connected event
        socket.emit(events.CONNECTED, {
            userId: socket.user.id,
            username: socket.user.username,
        });

        // Handle workspace join (from client after connection)
        socket.on('workspace:join', async (data) => {
            const { workspaceId } = data;
            if (workspaceId) {
                joinWorkspace(socket, workspaceId);
                await handlePresenceUpdate(socket, { status: 'online' });
            }
        });

        // Message events
        socket.on(events.MESSAGE_SEND, (data) => handleSendMessage(socket, data));
        socket.on(events.MESSAGE_EDIT, (data) => handleEditMessage(socket, data));
        socket.on(events.MESSAGE_DELETE, (data) => handleDeleteMessage(socket, data));

        // Typing events
        socket.on(events.TYPING_START, (data) => handleTypingStart(socket, data));
        socket.on(events.TYPING_STOP, (data) => handleTypingStop(socket, data));

        // Presence events
        socket.on(events.PRESENCE_UPDATE, (data) => handlePresenceUpdate(socket, data));

        // Channel events
        socket.on(events.CHANNEL_JOIN, (data) => handleChannelJoin(socket, data));
        socket.on(events.CHANNEL_LEAVE, (data) => handleChannelLeave(socket, data));

        // Disconnect handler
        socket.on('disconnect', async (reason) => {
            console.log(`User disconnected: ${socket.user.id} (${reason})`);

            // Set user offline
            if (socket.workspaceId) {
                await setUserOffline(socket.user.id, socket.workspaceId);
            }

            // Clear typing indicators
            await clearUserTyping(socket.user.id);

            // Leave workspace room
            leaveWorkspace(socket);
        });

        // Error handler
        socket.on('error', (error) => {
            console.error('Socket error:', error);
        });
    });

    console.log('WebSocket server initialized');
    return io;
};

module.exports = {
    initializeSocketServer,
};

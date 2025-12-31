/**
 * WebSocket event types
 */
module.exports = {
    // Client → Server
    MESSAGE_SEND: 'message:send',
    MESSAGE_EDIT: 'message:edit',
    MESSAGE_DELETE: 'message:delete',
    TYPING_START: 'typing:start',
    TYPING_STOP: 'typing:stop',
    PRESENCE_UPDATE: 'presence:update',
    CHANNEL_JOIN: 'channel:join',
    CHANNEL_LEAVE: 'channel:leave',

    // Server → Client
    MESSAGE_NEW: 'message:new',
    MESSAGE_UPDATED: 'message:updated',
    MESSAGE_DELETED: 'message:deleted',
    TYPING_USER: 'typing:user',
    PRESENCE_CHANGED: 'presence:changed',
    CHANNEL_UPDATED: 'channel:updated',
    NOTIFICATION_NEW: 'notification:new',
    REACTION_ADDED: 'reaction:added',
    REACTION_REMOVED: 'reaction:removed',

    // Connection events
    CONNECTED: 'connected',
    DISCONNECTED: 'disconnected',
    ERROR: 'error',
};

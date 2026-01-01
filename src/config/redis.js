/**
 * Redis Configuration
 * Used for pub/sub, presence tracking, and session management
 */
const Redis = require('ioredis');

let redisClient = null;
let pubClient = null;
let subClient = null;

/**
 * Initialize Redis connection
 * @returns {Object} Redis clients
 */
const initRedis = () => {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

    // Main client for general operations
    redisClient = new Redis(redisUrl, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });

    // Pub/sub clients (need separate connections)
    pubClient = new Redis(redisUrl);
    subClient = new Redis(redisUrl);

    redisClient.on('connect', () => {
        console.log('✅ Redis connected');
    });

    redisClient.on('error', (err) => {
        console.error('❌ Redis error:', err.message);
    });

    return { redisClient, pubClient, subClient };
};

/**
 * Get Redis client (lazy init)
 */
const getRedis = () => {
    if (!redisClient) {
        initRedis();
    }
    return redisClient;
};

/**
 * Get Pub/Sub clients
 */
const getPubSub = () => {
    if (!pubClient || !subClient) {
        initRedis();
    }
    return { pubClient, subClient };
};

// Presence tracking
const PRESENCE_PREFIX = 'presence:';
const PRESENCE_TTL = 60; // seconds

/**
 * Set user online status
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 * @param {Object} data - Status data
 */
const setUserOnline = async (userId, workspaceId, data = {}) => {
    const redis = getRedis();
    const key = `${PRESENCE_PREFIX}${workspaceId}:${userId}`;

    await redis.setex(key, PRESENCE_TTL, JSON.stringify({
        status: 'online',
        lastSeen: new Date().toISOString(),
        ...data,
    }));
};

/**
 * Set user offline
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 */
const setUserOffline = async (userId, workspaceId) => {
    const redis = getRedis();
    const key = `${PRESENCE_PREFIX}${workspaceId}:${userId}`;
    await redis.del(key);
};

/**
 * Get online users in workspace
 * @param {string} workspaceId - Workspace ID
 * @returns {Array} Online user IDs
 */
const getOnlineUsers = async (workspaceId) => {
    const redis = getRedis();
    const pattern = `${PRESENCE_PREFIX}${workspaceId}:*`;
    const keys = await redis.keys(pattern);

    const users = [];
    for (const key of keys) {
        const userId = key.split(':').pop();
        const data = await redis.get(key);
        if (data) {
            users.push({ userId, ...JSON.parse(data) });
        }
    }
    return users;
};

/**
 * Refresh user presence (heartbeat)
 * @param {string} userId - User ID
 * @param {string} workspaceId - Workspace ID
 */
const refreshPresence = async (userId, workspaceId) => {
    const redis = getRedis();
    const key = `${PRESENCE_PREFIX}${workspaceId}:${userId}`;
    await redis.expire(key, PRESENCE_TTL);
};

// Typing indicators
const TYPING_PREFIX = 'typing:';
const TYPING_TTL = 5; // seconds

/**
 * Set typing indicator
 * @param {string} userId - User ID
 * @param {string} channelId - Channel ID
 */
const setTyping = async (userId, channelId) => {
    const redis = getRedis();
    const key = `${TYPING_PREFIX}${channelId}:${userId}`;
    await redis.setex(key, TYPING_TTL, Date.now());
};

/**
 * Get users typing in channel
 * @param {string} channelId - Channel ID
 * @returns {Array} Typing user IDs
 */
const getTypingUsers = async (channelId) => {
    const redis = getRedis();
    const pattern = `${TYPING_PREFIX}${channelId}:*`;
    const keys = await redis.keys(pattern);
    return keys.map(key => key.split(':').pop());
};

module.exports = {
    initRedis,
    getRedis,
    getPubSub,
    setUserOnline,
    setUserOffline,
    getOnlineUsers,
    refreshPresence,
    setTyping,
    getTypingUsers,
};

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const config = require('./config/environment');
const routes = require('./routes');
const { errorHandler, notFoundHandler, logger } = require('./middleware/error-handler.middleware');
const { apiLimiter } = require('./middleware/rate-limit.middleware');

// Create Express app
const app = express();

// Trust proxy for Render/Heroku (fixes rate limiter X-Forwarded-For issue)
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
    contentSecurityPolicy: config.nodeEnv === 'production' ? undefined : false,
}));

// CORS configuration - allow all origins for now
app.use(cors({
    origin: true,
    credentials: true,
}));

// Request parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging
if (config.nodeEnv !== 'test') {
    app.use(morgan('combined'));
}

// Rate limiting
app.use('/api/', apiLimiter);

// API routes
app.use('/api/v1', routes);

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        name: 'Nextus API',
        version: '1.0.0',
        description: 'Team collaboration platform API',
        documentation: '/api/v1/docs',
        health: '/api/v1/health',
        status: 'running',
    });
});

// Error handling
app.use(notFoundHandler);
app.use(errorHandler);

// For Vercel serverless
module.exports = app;

// Service type router - allows same codebase to run as different services
const SERVICE_TYPE = process.env.SERVICE_TYPE || 'api';

const startServer = async () => {
    const PORT = process.env.PORT || config.port;

    switch (SERVICE_TYPE) {
        case 'signaling': {
            // WebRTC Signaling server only
            const { startSignalingServer } = require('./services/signaling.service');
            startSignalingServer(PORT);
            break;
        }

        case 'websocket': {
            // Chat WebSocket server only
            const { initializeSocketServer } = require('./websocket/socket-server');
            const server = http.createServer(app);
            initializeSocketServer(server);

            server.listen(PORT, '0.0.0.0', () => {
                logger.info(`🔌 WebSocket server running on port ${PORT}`);
            });
            break;
        }

        case 'api':
        default: {
            // Full API server with WebSocket (for development or single-instance)
            const { initializeSocketServer } = require('./websocket/socket-server');
            const server = http.createServer(app);

            // Only attach WebSocket if not in production multi-service mode
            if (process.env.NODE_ENV !== 'production' || !process.env.SEPARATE_SERVICES) {
                initializeSocketServer(server);
            }

            server.listen(PORT, '0.0.0.0', () => {
                logger.info(`🚀 Nextus API server running on port ${PORT}`);
                logger.info(`📡 Environment: ${config.nodeEnv}`);
                logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
                if (!process.env.SEPARATE_SERVICES) {
                    logger.info(`🔌 WebSocket ready`);
                }
            });
            break;
        }
    }
};

// Start if not in Vercel
if (!process.env.VERCEL) {
    startServer();

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Shutting down gracefully...');
        process.exit(0);
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });
}


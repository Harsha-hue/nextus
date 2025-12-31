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

// For local development with WebSocket
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
    const { initializeSocketServer } = require('./websocket/socket-server');

    // Create HTTP server
    const server = http.createServer(app);

    // Initialize WebSocket server
    initializeSocketServer(server);

    // Start server
    const PORT = config.port;

    server.listen(PORT, '0.0.0.0', () => {
        logger.info(`🚀 Nextus API server running on port ${PORT}`);
        logger.info(`📡 Environment: ${config.nodeEnv}`);
        logger.info(`🔗 API URL: http://localhost:${PORT}/api/v1`);
        logger.info(`🔌 WebSocket ready`);
    });

    // Graceful shutdown
    process.on('SIGTERM', () => {
        logger.info('SIGTERM received. Shutting down gracefully...');
        server.close(() => {
            logger.info('Server closed');
            process.exit(0);
        });
    });

    process.on('unhandledRejection', (reason, promise) => {
        logger.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error) => {
        logger.error('Uncaught Exception:', error);
        process.exit(1);
    });
}

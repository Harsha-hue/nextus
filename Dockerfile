# Production Dockerfile for Nextus API
# Target: x86_64 (Kali Linux VM)

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Install dependencies first (better caching)
COPY package*.json ./
RUN npm ci --only=production

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextus -u 1001 -G nodejs
USER nextus

# Expose ports
# 3000 = REST API
# 3001 = WebSocket (chat)
# 3002 = WebRTC signaling
EXPOSE 3000 3001 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3000/api/v1/health || exit 1

# Start the application
CMD ["node", "src/index.js"]

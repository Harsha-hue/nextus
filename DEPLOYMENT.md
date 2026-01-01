# Nextus Production Deployment on Kali Linux VM

## Prerequisites

- Kali Linux VM (x86_64) with Docker & Docker Compose installed
- Cloudflare account with Zero Trust access
- Domain: nexarats.com configured in Cloudflare

---

## Quick Start

### 1. Clone and Configure

```bash
# Clone repository
git clone https://github.com/Harsha-hue/nextus.git
cd nextus

# Copy and edit environment file
cp env.production.example .env
nano .env  # Fill in your values
```

### 2. Build and Run

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps
docker-compose logs -f
```

### 3. Setup Cloudflare Tunnel

```bash
# Install cloudflared (https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/get-started/)
wget https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared-linux-amd64.deb

# Authenticate
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create nextus-tunnel

# Copy config
sudo mkdir -p /etc/cloudflared
sudo cp cloudflare/config.yml /etc/cloudflared/config.yml
sudo cp ~/.cloudflared/*.json /etc/cloudflared/credentials.json

# Configure DNS (in Cloudflare dashboard or via CLI)
cloudflared tunnel route dns nextus-tunnel api.nexarats.com
cloudflared tunnel route dns nextus-tunnel ws.nexarats.com
cloudflared tunnel route dns nextus-tunnel media.nexarats.com

# Start tunnel as service
sudo cloudflared service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```

---

## Services

| Service | Port | URL |
|---------|------|-----|
| API | 3000 | https://api.nexarats.com |
| WebSocket | 3001 | wss://ws.nexarats.com |
| Signaling | 3002 | wss://media.nexarats.com |

---

## Commands

```bash
# View logs
docker-compose logs -f api
docker-compose logs -f websocket
docker-compose logs -f signaling

# Restart a service
docker-compose restart api

# Stop all
docker-compose down

# Update and redeploy
git pull
docker-compose build
docker-compose up -d
```

---

## Health Checks

```bash
# API
curl https://api.nexarats.com/api/v1/health

# Signaling
curl http://localhost:3002/health
```

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Redis connection error | Check `docker-compose logs redis` |
| WebSocket not connecting | Verify Cloudflare WebSocket setting is ON |
| Huddle not working | Check signaling logs for errors |

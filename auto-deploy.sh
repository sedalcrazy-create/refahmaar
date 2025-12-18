#!/bin/bash
# Auto Deploy Script - Run on Server
# این اسکریپت را روی سرور اجرا کنید

set -e

echo "================================================"
echo "🚀 Yalda Snake Challenge - Auto Deploy"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
DOMAIN="snake.darmanjoo.ir"
APP_DIR="/opt/yalda-snake"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}⚠️  Please run as root: sudo bash auto-deploy.sh${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Running as root${NC}"

# Step 1: Create directory
echo ""
echo "📂 Step 1: Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR
echo -e "${GREEN}✓ Directory created: $APP_DIR${NC}"

# Step 2: Check if files exist
echo ""
echo "📦 Step 2: Checking project files..."
if [ ! -f "package.json" ]; then
    echo -e "${RED}❌ Error: Project files not found in $APP_DIR${NC}"
    echo "Please upload files first using:"
    echo "  scp -r /path/to/marrefah/* root@37.152.174.87:$APP_DIR/"
    exit 1
fi
echo -e "${GREEN}✓ Project files found${NC}"

# Step 3: Setup environment
echo ""
echo "🔧 Step 3: Setting up environment..."
if [ ! -f ".env" ]; then
    echo -e "${YELLOW}⚠️  .env not found, creating from template...${NC}"
    if [ -f ".env.example" ]; then
        cp .env.example .env
    else
        cat > .env << 'EOF'
PORT=3001
NODE_ENV=production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=yalda_snake
POSTGRES_USER=snake_user
POSTGRES_PASSWORD=YaldaSnake2024!Secure
MAX_PLAYERS=150
GAME_SPEED=10
BOARD_WIDTH=100
BOARD_HEIGHT=60
BALE_BOT_TOKEN=64658763:rgYSwBxd05vEuuuNNbNNYZdtA-T1Gxdx5nw
GAME_URL=https://snake.darmanjoo.ir
CHANNEL_ID=@your_channel
EOF
    fi
    echo -e "${YELLOW}⚠️  Please edit .env and set CHANNEL_ID${NC}"
fi
echo -e "${GREEN}✓ Environment configured${NC}"

# Step 4: Setup Nginx
echo ""
echo "🌐 Step 4: Configuring Nginx..."
if [ -f "nginx-snake-darmanjoo.conf" ]; then
    cp nginx-snake-darmanjoo.conf $NGINX_CONF
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/$DOMAIN 2>/dev/null || true

    # Test Nginx
    if nginx -t 2>/dev/null; then
        systemctl reload nginx
        echo -e "${GREEN}✓ Nginx configured and reloaded${NC}"
    else
        echo -e "${YELLOW}⚠️  Nginx test failed, please check configuration${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  nginx-snake-darmanjoo.conf not found${NC}"
fi

# Step 5: SSL Certificate
echo ""
echo "🔐 Step 5: Checking SSL certificate..."
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo -e "${GREEN}✓ SSL certificate exists${NC}"
else
    echo -e "${YELLOW}⚠️  SSL certificate not found${NC}"
    echo "Installing certbot..."
    apt-get update -qq
    apt-get install -y certbot python3-certbot-nginx -qq

    echo "Obtaining certificate..."
    certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email

    if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
        echo -e "${GREEN}✓ SSL certificate obtained${NC}"
    else
        echo -e "${RED}❌ Failed to obtain SSL certificate${NC}"
    fi
fi

# Step 6: Docker
echo ""
echo "🐳 Step 6: Deploying with Docker..."

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${YELLOW}Installing Docker...${NC}"
    curl -fsSL https://get.docker.com | sh
    systemctl enable docker
    systemctl start docker
fi

# Check Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo -e "${YELLOW}Installing Docker Compose...${NC}"
    curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    chmod +x /usr/local/bin/docker-compose
fi

echo -e "${GREEN}✓ Docker & Docker Compose ready${NC}"

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down 2>/dev/null || true

# Build and start
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services
echo "Waiting for services to start..."
sleep 15

# Step 7: Health Check
echo ""
echo "🔍 Step 7: Running health checks..."

# Check containers
echo "Checking containers..."
if docker-compose ps | grep -q "Up"; then
    echo -e "${GREEN}✓ Containers are running${NC}"
    docker-compose ps
else
    echo -e "${RED}❌ Some containers failed to start${NC}"
    docker-compose ps
fi

# Check app health
echo ""
echo "Checking application health..."
sleep 5
if curl -f http://localhost:3001/health &>/dev/null; then
    echo -e "${GREEN}✓ Application is healthy${NC}"
else
    echo -e "${RED}❌ Application health check failed${NC}"
fi

# Check external access
echo ""
echo "Checking external access..."
if curl -f https://$DOMAIN/health &>/dev/null; then
    echo -e "${GREEN}✓ External access working${NC}"
else
    echo -e "${YELLOW}⚠️  External access check failed (might need DNS propagation)${NC}"
fi

# Final Summary
echo ""
echo "================================================"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo "================================================"
echo ""
echo "📊 Status:"
docker-compose ps
echo ""
echo "🌐 URLs:"
echo "  - Game: https://$DOMAIN"
echo "  - Health: https://$DOMAIN/health"
echo "  - Bot: @refahsnakebot"
echo ""
echo "📝 Next Steps:"
echo "  1. Edit .env and set your CHANNEL_ID"
echo "  2. Make bot admin of the channel"
echo "  3. Test: https://$DOMAIN"
echo "  4. Test bot: @refahsnakebot"
echo ""
echo "📊 Useful Commands:"
echo "  - View logs: docker-compose logs -f"
echo "  - Restart: docker-compose restart"
echo "  - Stop: docker-compose down"
echo ""
echo "🎉 Ready for Yalda Competition!"
echo ""

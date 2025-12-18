#!/bin/bash

# Quick Start Script for Yalda Snake Challenge
# Run this on your server to deploy quickly

set -e

echo "🎮 Yalda Snake Challenge - Quick Start"
echo "======================================"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo "⚠️  Please run as root or with sudo"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed"
    echo "Install with: curl -fsSL https://get.docker.com | sh"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not installed"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Set variables
DOMAIN="snake.darmanjoo.ir"
APP_DIR="/opt/yalda-snake"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

echo "📂 Creating application directory..."
mkdir -p $APP_DIR
cd $APP_DIR

echo ""
echo "🔧 Setting up environment..."

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "Creating .env file..."
    cat > .env << EOF
PORT=3001
NODE_ENV=production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=yalda_snake
POSTGRES_USER=snake_user
POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
MAX_PLAYERS=150
GAME_SPEED=10
BOARD_WIDTH=100
BOARD_HEIGHT=60
EOF
    echo "✅ .env created with random password"
else
    echo "✅ .env already exists"
fi

echo ""
echo "🔧 Setting up Nginx..."

if [ ! -f "$NGINX_CONF" ]; then
    cp nginx-snake-darmanjoo.conf $NGINX_CONF
    ln -sf $NGINX_CONF /etc/nginx/sites-enabled/
    echo "✅ Nginx configured"
else
    echo "✅ Nginx already configured"
fi

# Test Nginx
nginx -t
echo "✅ Nginx configuration is valid"

# SSL Setup
echo ""
echo "🔐 Checking SSL certificate..."
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "⚠️  SSL certificate not found"
    echo "Would you like to obtain one now? (y/n)"
    read -r response
    if [ "$response" = "y" ]; then
        certbot --nginx -d $DOMAIN --non-interactive --agree-tos --register-unsafely-without-email
    fi
else
    echo "✅ SSL certificate exists"
fi

# Reload Nginx
echo ""
echo "♻️  Reloading Nginx..."
systemctl reload nginx

# Docker
echo ""
echo "🐳 Starting Docker containers..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

echo ""
echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Health check
echo ""
echo "🔍 Running health check..."
if curl -f http://localhost:3001/health &> /dev/null; then
    echo "✅ Application is healthy!"
else
    echo "⚠️  Health check failed. Check logs with: docker-compose logs -f app"
fi

echo ""
echo "======================================"
echo "✅ Deployment Complete!"
echo "======================================"
echo ""
echo "🌐 URL: https://$DOMAIN"
echo "🤖 Bot: @refahsnakebot"
echo ""
echo "📊 Useful commands:"
echo "  - View logs:        docker-compose logs -f app"
echo "  - Check status:     docker-compose ps"
echo "  - Restart:          docker-compose restart"
echo "  - Stop:             docker-compose down"
echo ""
echo "📝 Next steps:"
echo "  1. Configure Bale bot mini-app (see BALE_SETUP.md)"
echo "  2. Test the game at https://$DOMAIN"
echo "  3. Check database: docker exec -it yalda_snake_db psql -U snake_user -d yalda_snake"
echo ""

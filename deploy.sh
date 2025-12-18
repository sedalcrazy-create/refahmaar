#!/bin/bash

# Yalda Snake Challenge - Deployment Script
# Domain: snake.darmanjoo.ir

set -e  # Exit on error

echo "=========================================="
echo "🎮 Yalda Snake Challenge Deployment"
echo "=========================================="

# Configuration
DOMAIN="snake.darmanjoo.ir"
APP_DIR="/opt/yalda-snake"  # Change to your preferred directory
NGINX_CONF="/etc/nginx/sites-available/snake.darmanjoo.ir"
NGINX_ENABLED="/etc/nginx/sites-enabled/snake.darmanjoo.ir"

echo "📦 Step 1: Creating application directory..."
sudo mkdir -p $APP_DIR
sudo chown $USER:$USER $APP_DIR

echo "📂 Step 2: Copying files to server..."
# If running locally, copy files
# If on server, assume files are already there
if [ "$PWD" != "$APP_DIR" ]; then
    echo "Copying files from current directory to $APP_DIR..."
    cp -r . $APP_DIR/
    cd $APP_DIR
fi

echo "🔧 Step 3: Setting up Nginx configuration..."
sudo cp nginx-snake-darmanjoo.conf $NGINX_CONF

# Enable site
sudo ln -sf $NGINX_CONF $NGINX_ENABLED

echo "🔐 Step 4: Setting up SSL certificate..."
# Check if certificate exists
if [ ! -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    echo "⚠️  SSL certificate not found. Running certbot..."
    sudo certbot certonly --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@darmanjoo.ir
else
    echo "✅ SSL certificate already exists"
fi

echo "🔄 Step 5: Testing Nginx configuration..."
sudo nginx -t

echo "♻️  Step 6: Reloading Nginx..."
sudo systemctl reload nginx

echo "🐳 Step 7: Starting Docker containers..."
docker-compose down 2>/dev/null || true
docker-compose up -d --build

echo "⏳ Step 8: Waiting for services to start..."
sleep 10

echo "🔍 Step 9: Checking service health..."
docker-compose ps

echo ""
echo "✅ Testing application health..."
curl -f http://localhost:3001/health || echo "⚠️  Health check failed"

echo ""
echo "=========================================="
echo "✅ Deployment Complete!"
echo "=========================================="
echo ""
echo "🌐 Domain: https://$DOMAIN"
echo "🤖 Bot: @refahsnakebot"
echo "📊 Logs: docker-compose logs -f app"
echo ""
echo "Next steps:"
echo "1. Configure Bale bot mini-app URL"
echo "2. Test the game"
echo ""

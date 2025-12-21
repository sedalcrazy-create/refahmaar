#!/bin/bash

echo "🛑 Stopping containers..."
docker-compose down

echo ""
echo "🔨 Rebuilding containers..."
docker-compose build

echo ""
echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "✅ Containers started!"
echo ""
echo "📋 Status:"
docker-compose ps

echo ""
echo "📊 Logs (Ctrl+C to exit):"
docker-compose logs -f

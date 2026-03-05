#!/bin/bash

# Configuration
FRONTEND_PORT=9000
BACKEND_PORT=9001

echo "🚀 Starting EduJourney Studio on High-Range Ports..."
echo "📡 Frontend: http://localhost:$FRONTEND_PORT"
echo "⚙️  Backend:  http://localhost:$BACKEND_PORT"

# Load NVM if present
[ -s "$HOME/.nvm/nvm.sh" ] && \. "$HOME/.nvm/nvm.sh"

# Kill existing processes on these ports
fuser -k $FRONTEND_PORT/tcp 2>/dev/null
fuser -k $BACKEND_PORT/tcp 2>/dev/null

# Start Backend in background
PORT=$BACKEND_PORT npx tsx server-supabase.js &
BACKEND_PID=$!

# Start Frontend
npx vite --port $FRONTEND_PORT --host 0.0.0.0

# Cleanup on exit
trap "kill $BACKEND_PID" EXIT

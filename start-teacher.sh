#!/bin/bash
FRONTEND_PORT=9000
BACKEND_PORT=9001
LOG_DIR=/tmp/teacher-logs
BACKEND_LOG=$LOG_DIR/backend.log
FRONTEND_LOG=$LOG_DIR/frontend.log
COMBINED_LOG=$LOG_DIR/combined.log

mkdir -p $LOG_DIR

for PORT in $FRONTEND_PORT $BACKEND_PORT; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Killing existing process on port $PORT (PID: $PID)"
        kill -9 $PID
    fi
done
sleep 1

[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

TS() { date '+%Y-%m-%d %H:%M:%S'; }

echo "" >> $BACKEND_LOG
echo "========================================" >> $BACKEND_LOG
echo "  Backend started at $(TS)" >> $BACKEND_LOG
echo "========================================" >> $BACKEND_LOG

echo "" >> $FRONTEND_LOG
echo "========================================" >> $FRONTEND_LOG
echo "  Frontend started at $(TS)" >> $FRONTEND_LOG
echo "========================================" >> $FRONTEND_LOG

cd /home/mgm/teacher-studio

# Start backend (tsx server)
nohup bash -c "PORT=$BACKEND_PORT npx tsx server-supabase.js 2>&1 | while IFS= read -r line; do echo \"\$(date '+%H:%M:%S') \$line\" | tee -a $COMBINED_LOG; done" > $BACKEND_LOG 2>&1 &
BACKEND_PID=$!

sleep 0.5

# Start frontend (vite)
nohup bash -c "npx vite --port $FRONTEND_PORT --host 0.0.0.0 2>&1 | while IFS= read -r line; do echo \"\$(date '+%H:%M:%S') \$line\" | tee -a $COMBINED_LOG; done" > $FRONTEND_LOG 2>&1 &
FRONTEND_PID=$!

echo ""
echo "✅ teacher-studio started"
echo ""
echo "  Frontend  → http://localhost:$FRONTEND_PORT  (PID: $FRONTEND_PID)"
echo "  Backend   → http://localhost:$BACKEND_PORT   (PID: $BACKEND_PID)"
echo ""
echo "  Logs:"
echo "    Backend   → tail -f $BACKEND_LOG"
echo "    Frontend  → tail -f $FRONTEND_LOG"
echo "    Combined  → tail -f $COMBINED_LOG"
echo ""
echo "  Quick tail:  tail -f $BACKEND_LOG $FRONTEND_LOG"

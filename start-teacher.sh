#!/bin/bash
FRONTEND_PORT=9000
BACKEND_PORT=9001
LOG=/tmp/teacher.log

for PORT in $FRONTEND_PORT $BACKEND_PORT; do
    PID=$(lsof -ti :$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
        echo "Killing existing process on port $PORT (PID: $PID)"
        kill -9 $PID
    fi
done
sleep 1

[ -s "$HOME/.nvm/nvm.sh" ] && . "$HOME/.nvm/nvm.sh"

echo "Starting teacher-studio, logging to $LOG..."
cd /home/mgm/teacher-studio
nohup bash -c "PORT=$BACKEND_PORT npx tsx server-supabase.js & npx vite --port $FRONTEND_PORT --host 0.0.0.0" > $LOG 2>&1 &
echo "Started with PID: $!"
echo "Frontend: http://localhost:$FRONTEND_PORT"
echo "Backend:  http://localhost:$BACKEND_PORT"

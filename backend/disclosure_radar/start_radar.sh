#!/bin/zsh
# Start Disclosure Radar Daemon in Background

SCRIPT_DIR="/Users/zakiahmad/Documents/Antigravity/backend/disclosure_radar"
PID_FILE="$SCRIPT_DIR/radar.pid"
LOG_FILE="$SCRIPT_DIR/radar.log"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "⚠️ Disclosure Radar is ALREADY running (PID: $PID)."
        exit 0
    else
        echo "Stale PID file found. Removing..."
        rm -f "$PID_FILE"
    fi
fi

ROOT_DIR="/Users/zakiahmad/Documents/Antigravity"
cd "$ROOT_DIR"
PYTHONPATH="$ROOT_DIR:$PYTHONPATH" nohup /usr/bin/python3 -m backend.disclosure_radar.radar_daemon > /dev/null 2>&1 &

sleep 2

if [ -f "$PID_FILE" ]; then
    NEW_PID=$(cat "$PID_FILE")
    echo "✅ Radar started successfully in background! (PID: $NEW_PID)"
    echo "📄 Logs: $LOG_FILE"
else
    echo "⚠️ Started process, verifying status in a moment..."
fi

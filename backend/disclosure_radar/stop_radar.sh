#!/bin/zsh
# Stop Disclosure Radar Daemon

SCRIPT_DIR="/Users/zakiahmad/Documents/Antigravity/backend/disclosure_radar"
PID_FILE="$SCRIPT_DIR/radar.pid"

if [ ! -f "$PID_FILE" ]; then
    echo "ℹ️ No running Disclosure Radar daemon found (no PID file)."
    exit 0
fi

PID=$(cat "$PID_FILE")
if ps -p "$PID" > /dev/null 2>&1; then
    echo "🛑 Stopping Disclosure Radar daemon (PID: $PID)..."
    kill -15 "$PID"
    sleep 2
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "Process did not stop cleanly, sending force kill..."
        kill -9 "$PID"
    fi
    rm -f "$PID_FILE"
    echo "✅ Radar daemon stopped."
else
    echo "Process $PID not running. Cleaning up PID file."
    rm -f "$PID_FILE"
fi

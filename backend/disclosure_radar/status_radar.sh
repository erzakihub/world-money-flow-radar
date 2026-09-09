#!/bin/zsh
# Check Disclosure Radar Daemon Status

SCRIPT_DIR="/Users/zakiahmad/Documents/Antigravity/backend/disclosure_radar"
PID_FILE="$SCRIPT_DIR/radar.pid"
LOG_FILE="$SCRIPT_DIR/radar.log"

echo "=================================================="
echo "📡 NSE & BSE Corporate Disclosure Radar Status"
echo "=================================================="

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "🟢 Status: RUNNING (PID: $PID)"
        echo "⏱️ Process Info:"
        ps -o pid,user,%cpu,%mem,etime,command -p "$PID"
    else
        echo "🔴 Status: STOPPED (stale PID file: $PID)"
    fi
else
    echo "⚪ Status: NOT RUNNING"
fi

echo "\n📊 Recent Log Output (Last 10 lines):"
echo "--------------------------------------------------"
if [ -f "$LOG_FILE" ]; then
    tail -n 10 "$LOG_FILE"
else
    echo "No log file found yet."
fi
echo "=================================================="

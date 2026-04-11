#!/bin/bash
##
# Crawler wrapper script for cron job
# Works on both local (Docker) and production (Linux server)
# Usage: ./run_crawler.sh [fast|skip|default]
##

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
if [ -d "/app/price-hawk" ]; then
    PROJECT_DIR="/app/price-hawk"
else
    PROJECT_DIR="$SCRIPT_DIR"
fi

# Create logs directory if not exists
mkdir -p "$PROJECT_DIR/logs"

# Default mode (can be overridden: skip|fast|default)
MODE="${1:-default}"
LOG_FILE="$PROJECT_DIR/logs/crawler_$(date +%Y%m%d_%H%M%S).log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting crawler (mode: $MODE)" | tee -a "$LOG_FILE"

# Activate virtual environment
if [ -f "$PROJECT_DIR/.venv/bin/activate" ]; then
    source "$PROJECT_DIR/.venv/bin/activate"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Activated .venv (Linux)" >> "$LOG_FILE"
elif [ -f "$PROJECT_DIR/.venv/Scripts/activate" ]; then
    source "$PROJECT_DIR/.venv/Scripts/activate"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Activated .venv (Windows/Git Bash)" >> "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] WARN: No venv activation script found, using system python" | tee -a "$LOG_FILE"
fi

# Change to project directory
cd "$PROJECT_DIR"

# Select Python binary
if [ -x "/usr/local/bin/python3" ]; then
    PY_BIN="/usr/local/bin/python3"
elif [ -x "/usr/bin/python3" ]; then
    PY_BIN="/usr/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
    PY_BIN="python3"
elif command -v python >/dev/null 2>&1; then
    PY_BIN="python"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: python/python3 not found" | tee -a "$LOG_FILE"
    exit 1
fi

# Run crawler
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running: $PY_BIN crawl_all.py --$MODE" >> "$LOG_FILE"

if [ "$MODE" = "default" ]; then
    "$PY_BIN" crawl_all.py >> "$LOG_FILE" 2>&1
else
    "$PY_BIN" crawl_all.py --"$MODE" >> "$LOG_FILE" 2>&1
fi

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] OK: Crawler completed successfully" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: Crawler failed with exit code $EXIT_CODE" | tee -a "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log: $LOG_FILE" >> "$LOG_FILE"

exit $EXIT_CODE

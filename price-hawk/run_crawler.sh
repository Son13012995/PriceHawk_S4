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

# Default mode (simplified - no modes, just crawl all)
MODE="default"
LOG_FILE="$PROJECT_DIR/logs/crawler_$(date +%Y%m%d_%H%M%S).log"

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting crawler" | tee -a "$LOG_FILE"

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

# Set PYTHONPATH for imports
export PYTHONPATH="$PROJECT_DIR:$PROJECT_DIR/price_hawk:$PYTHONPATH"

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

# Auto-backfill MeiliSearch if empty (run once on first deploy)
MEILI_URL="${MEILI_URL:-http://meilisearch:7700}"
MEILI_INDEX_STATUS=$("$PY_BIN" -c "
import httpx, os
url = os.getenv('MEILI_URL', '$MEILI_URL')
key = os.getenv('MEILI_MASTER_KEY', 'pricehawk-meili-master-key-2026')
try:
    r = httpx.get(f'{url}/indexes/products/stats', headers={'Authorization': f'Bearer {key}'}, timeout=5.0)
    data = r.json()
    print(data.get('numberOfDocuments', 0))
except:
    print(0)
" 2>/dev/null)

if [ "$MEILI_INDEX_STATUS" = "0" ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] MeiliSearch empty → running backfill..." | tee -a "$LOG_FILE"
    "$PY_BIN" scripts/index_existing.py >> "$LOG_FILE" 2>&1
fi

# Run crawler
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Running: $PY_BIN crawl_all.py" >> "$LOG_FILE"

"$PY_BIN" crawl_all.py >> "$LOG_FILE" 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ✅ Crawler + DB insert completed successfully" | tee -a "$LOG_FILE"
else
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ❌ Crawler failed with exit code $EXIT_CODE" | tee -a "$LOG_FILE"
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log: $LOG_FILE" >> "$LOG_FILE"

exit $EXIT_CODE

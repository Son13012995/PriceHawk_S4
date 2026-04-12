#!/usr/bin/env python3
"""
Quick wrapper for smart parallel crawl with sensible defaults.
Usage:
    python crawl_all.py              # Run all 9 jobs with 3 workers
    python crawl_all.py --fast       # 0% skip threshold (always update)
    python crawl_all.py --skip-mode  # Aggressive skip (180min cooldown)
"""

import subprocess
import sys
import os

# Use current Python interpreter (works on Windows, Linux, Docker)
PYTHON_BIN = sys.executable

DEFAULT_ARGS = [
    PYTHON_BIN, "scripts/run_smart_catalogs.py",
    "--workers", "3",
    "--shops", "tgdd", "fpt", "hoangha",
    "--categories", "dien-thoai", "laptop", "tablet",
    "--change-threshold", "0.01",
    "--max-count-delta", "5",
]

SKIP_MODE_ARGS = DEFAULT_ARGS + [
    "--cooldown-minutes", "180",
    "--min-unchanged-streak", "2",
]

FAST_MODE_ARGS = DEFAULT_ARGS + [
    "--change-threshold", "0.0",
    "--cooldown-minutes", "0",
]

def main():
    mode = "default"
    if len(sys.argv) > 1:
        if sys.argv[1] == "--skip-mode":
            mode = "skip"
        elif sys.argv[1] == "--fast":
            mode = "fast"
    
    if mode == "skip":
        args = SKIP_MODE_ARGS
        print("Running in SKIP mode (aggressive skip + cooldown)")
    elif mode == "fast":
        args = FAST_MODE_ARGS
        print("Running in FAST mode (update every time)")
    else:
        args = DEFAULT_ARGS
        print("Running in DEFAULT mode")
    
    result = subprocess.run(args)
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()

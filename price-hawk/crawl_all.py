#!/usr/bin/env python3
"""
Simple crawler wrapper - crawl all 9 spiders, insert to DB, no skip logic.
Usage:
    python crawl_all.py
"""

import subprocess
import sys
import os

# Use current Python interpreter
PYTHON_BIN = sys.executable

def main():
    # Just run the simple crawler
    result = subprocess.run([PYTHON_BIN, "scripts/run_simple_crawl.py"])
    sys.exit(result.returncode)

if __name__ == "__main__":
    main()

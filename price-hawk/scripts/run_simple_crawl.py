#!/usr/bin/env python3
"""
Simple parallel crawler - just crawl all 9 spiders and insert to DB every time.
No skip logic, no smart checks, no cooldown.
Usage:
    python run_simple_crawl.py
"""

import subprocess
import sys
import os
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"

SPIDER_BY_SHOP = {
    "tgdd": "tgdd_catalog",
    "fpt": "fpt_catalog"
}

CATEGORIES = ["dien-thoai", "laptop", "tablet"]
SHOPS = list(SPIDER_BY_SHOP.keys())


def run_spider(shop: str, category: str) -> tuple:
    """Run single spider and return (shop, category, success, output)"""
    spider_name = SPIDER_BY_SHOP[shop]
    output_file = DATA_DIR / f"{shop}_{category}_crawl.jsonl"
    
    cmd = [
        sys.executable, "-m", "scrapy", "crawl",
        spider_name,
        "-a", f"category={category}",
        "-O", str(output_file),
        "-s", "LOG_LEVEL=WARNING",
    ]
    
    thread_id = threading.current_thread().name
    start = time.time()
    
    try:
        result = subprocess.run(
            cmd,
            cwd=ROOT_DIR,
            capture_output=True,
            text=True,
            timeout=300  # 5 min timeout per spider
        )
        elapsed = time.time() - start
        success = result.returncode == 0
        
        if success:
    # Count items in output file
            count = 0
            if output_file.exists():
                with open(output_file, 'r') as f:
                    count = len(f.readlines())
            print(f"[{thread_id}] ✅ {shop}:{category} (crawled {count} items in {elapsed:.1f}s)")
        else:
            print(f"[{thread_id}] ❌ {shop}:{category} (failed in {elapsed:.1f}s)")
            print(f"--- STDERR ---\n{result.stderr.strip()}\n")
            print(f"--- STDOUT ---\n{result.stdout.strip()}\n")
        
        return (shop, category, success, output_file)
    
    except subprocess.TimeoutExpired:
        elapsed = time.time() - start
        print(f"[{thread_id}] ⏱️ {shop}:{category} (timeout after {elapsed:.1f}s)")
        return (shop, category, False, output_file)
    except Exception as e:
        elapsed = time.time() - start
        print(f"[{thread_id}] ❌ {shop}:{category} (error: {e})")
        return (shop, category, False, output_file)


def main():
    print("🚀 Simple Crawler - Crawl All, No Skip Logic")
    print(f"Crawling: {len(SHOPS)} shops × {len(CATEGORIES)} categories = {len(SHOPS) * len(CATEGORIES)} spiders")
    print()
    
    # Ensure data dir exists
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    
    # Run all 9 spiders in parallel (3 workers)
    tasks = []
    for shop in SHOPS:
        for category in CATEGORIES:
            tasks.append((shop, category))
    
    print(f"Starting {len(tasks)} crawl tasks with 3 workers...\n")
    
    successful = 0
    failed = 0
    start_time = time.time()
    
    with ThreadPoolExecutor(max_workers=3, thread_name_prefix="Crawler") as executor:
        futures = {
            executor.submit(run_spider, shop, category): (shop, category)
            for shop, category in tasks
        }
        
        for future in as_completed(futures):
            shop, category, success, output_file = future.result()
            if success:
                successful += 1
            else:
                failed += 1
    
    total_time = time.time() - start_time
    
    print()
    print("=" * 60)
    print(f"Summary: {successful} updated, {failed} failed (total {total_time:.1f}s)")
    print("=" * 60)
    
    # All outputs in DATA_DIR are ready for DB insertion by pipeline
    return 0 if failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())

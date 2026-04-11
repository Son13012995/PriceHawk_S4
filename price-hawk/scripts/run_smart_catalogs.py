import argparse
import hashlib
import json
import os
import shutil
import subprocess
import sys
import threading
import time
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple

ROOT_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT_DIR / "data"
TMP_DIR = DATA_DIR / "tmp"
ARCHIVE_DIR = DATA_DIR / "archive"
INDEX_FILE = DATA_DIR / "crawl_index.json"

SPIDER_BY_SHOP = {
    "tgdd": "tgdd_catalog",
    "fpt": "fpt_catalog",
    "hoangha": "hoangha_catalog",
}
DEFAULT_CATEGORIES = ["dien-thoai", "laptop", "tablet"]
MIN_BASELINE_FOR_DROP_GUARD = 20
MIN_ACCEPTED_COUNT_RATIO = 0.3


@dataclass
class Snapshot:
    count: int
    digest: str
    tokens: Set[str]


@dataclass
class TaskResult:
    shop: str
    category: str
    status: str
    count: int = 0
    changed_ratio: float = 0.0
    message: str = ""


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


def parse_iso(value: str) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    try:
        dt = datetime.fromisoformat(text)
    except ValueError:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def load_index() -> Dict[str, dict]:
    if not INDEX_FILE.exists():
        return {}
    try:
        return json.loads(INDEX_FILE.read_text(encoding="utf-8"))
    except (json.JSONDecodeError, OSError):
        return {}


def save_index(index_data: Dict[str, dict]) -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    INDEX_FILE.write_text(
        json.dumps(index_data, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def canonical_record_token(row: dict) -> str:
    normalize_name = str(row.get("normalize_name") or "").strip().lower()
    model_key = str(row.get("model_key") or "").strip().lower()
    variant_key = str(row.get("variant_key") or "").strip().lower()
    price = str(row.get("price") or "").strip()
    in_stock = "1" if bool(row.get("in_stock", True)) else "0"
    source = str(row.get("source") or "").strip().lower()

    return "|".join([source, normalize_name, model_key, variant_key, price, in_stock])


def build_snapshot(file_path: Path) -> Snapshot:
    tokens: Set[str] = set()
    count = 0

    if not file_path.exists():
        return Snapshot(count=0, digest="", tokens=tokens)

    with file_path.open("r", encoding="utf-8") as handle:
        for raw_line in handle:
            line = raw_line.strip()
            if not line:
                continue
            count += 1
            try:
                row = json.loads(line)
            except json.JSONDecodeError:
                continue
            tokens.add(canonical_record_token(row))

    digest_input = "\n".join(sorted(tokens)).encode("utf-8")
    digest = hashlib.sha1(digest_input).hexdigest()
    return Snapshot(count=count, digest=digest, tokens=tokens)


def compute_changed_ratio(old_tokens: Set[str], new_tokens: Set[str]) -> float:
    if not old_tokens and not new_tokens:
        return 0.0
    baseline = max(len(old_tokens.union(new_tokens)), 1)
    symmetric_diff = old_tokens.symmetric_difference(new_tokens)
    return len(symmetric_diff) / baseline


def should_skip_by_cooldown(entry: dict, cooldown_minutes: int, min_streak: int) -> bool:
    if cooldown_minutes <= 0:
        return False

    unchanged_streak = int(entry.get("unchanged_streak") or 0)
    if unchanged_streak < min_streak:
        return False

    last_run_at = parse_iso(str(entry.get("last_run_at") or ""))
    if not last_run_at:
        return False

    return now_utc() - last_run_at < timedelta(minutes=cooldown_minutes)


def run_scrapy_job(shop: str, category: str, output_file: Path) -> Tuple[int, str]:
    spider_name = SPIDER_BY_SHOP[shop]
    output_file.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        sys.executable,
        "-m",
        "scrapy",
        "crawl",
        spider_name,
        "-a",
        f"category={category}",
        "-O",
        str(output_file),
        "-s",
        "LOG_LEVEL=WARNING",
    ]

    completed = subprocess.run(
        cmd,
        cwd=ROOT_DIR,
        text=True,
        capture_output=True,
        env=os.environ.copy(),
    )

    combined_output = (completed.stdout or "") + "\n" + (completed.stderr or "")
    return completed.returncode, combined_output.strip()


def run_task(
    shop: str,
    category: str,
    old_index: Dict[str, dict],
    change_threshold: float,
    max_count_delta: int,
    cooldown_minutes: int,
    min_unchanged_streak: int,
) -> Tuple[TaskResult, dict]:
    thread_id = threading.current_thread().name
    key = f"{shop}:{category}"
    previous_entry = old_index.get(key, {})
    
    print(f"[{thread_id}] START: {shop}:{category}")
    start_time = time.time()

    if should_skip_by_cooldown(previous_entry, cooldown_minutes, min_unchanged_streak):
        updated_entry = {
            **previous_entry,
            "last_run_at": now_iso(),
            "status": "skipped_cooldown",
        }
        result = TaskResult(
            shop=shop,
            category=category,
            status="skipped_cooldown",
            count=int(previous_entry.get("last_count") or 0),
            message="Skipped by cooldown based on unchanged streak.",
        )
        elapsed = time.time() - start_time
        print(f"[{thread_id}] DONE: {shop}:{category} (skipped_cooldown in {elapsed:.1f}s)")
        return result, updated_entry

    TMP_DIR.mkdir(parents=True, exist_ok=True)
    ARCHIVE_DIR.mkdir(parents=True, exist_ok=True)

    temp_file = TMP_DIR / f"{shop}_{category}_latest.jsonl"
    full_file = DATA_DIR / f"{shop}_{category}_full.jsonl"
    timestamp = now_utc().strftime("%Y-%m-%dT%H-%M-%S%z")
    archive_file = ARCHIVE_DIR / f"{shop}_{category}_{timestamp}.jsonl"

    return_code, output_text = run_scrapy_job(shop, category, temp_file)
    if return_code != 0:
        updated_entry = {
            **previous_entry,
            "last_run_at": now_iso(),
            "status": "failed",
            "last_error": output_text[-2000:],
        }
        result = TaskResult(
            shop=shop,
            category=category,
            status="failed",
            message="Scrapy exited with non-zero status.",
        )
        elapsed = time.time() - start_time
        print(f"[{thread_id}] FAILED: {shop}:{category} in {elapsed:.1f}s")
        return result, updated_entry

    new_snapshot = build_snapshot(temp_file)
    old_snapshot = build_snapshot(full_file)

    changed_ratio = compute_changed_ratio(old_snapshot.tokens, new_snapshot.tokens)
    count_delta = abs(new_snapshot.count - old_snapshot.count)

    # Protect current full snapshot if a crawler run suddenly returns no rows.
    if old_snapshot.count > 0 and new_snapshot.count == 0:
        rejected_file = ARCHIVE_DIR / f"{shop}_{category}_{timestamp}_rejected-empty.jsonl"
        if temp_file.exists():
            shutil.copy2(str(temp_file), str(rejected_file))
            temp_file.unlink()

        updated_entry = {
            **previous_entry,
            "last_run_at": now_iso(),
            "status": "rejected_empty_snapshot",
            "last_count": old_snapshot.count,
            "last_digest": old_snapshot.digest,
            "changed_ratio": round(changed_ratio, 6),
            "unchanged_streak": int(previous_entry.get("unchanged_streak") or 0) + 1,
            "last_error": "Rejected empty snapshot to avoid wiping previous data.",
            "rejected_file": str(rejected_file.relative_to(ROOT_DIR)).replace("\\", "/"),
        }
        result = TaskResult(
            shop=shop,
            category=category,
            status="rejected_empty_snapshot",
            count=old_snapshot.count,
            changed_ratio=changed_ratio,
            message="New snapshot is empty while previous snapshot has data.",
        )
        elapsed = time.time() - start_time
        print(f"[{thread_id}] DONE: {shop}:{category} (rejected_empty in {elapsed:.1f}s)")
        return result, updated_entry

    # Protect against suspicious sudden drops that usually indicate partial crawl or blocking.
    if (
        old_snapshot.count >= MIN_BASELINE_FOR_DROP_GUARD
        and 0 < new_snapshot.count < int(old_snapshot.count * MIN_ACCEPTED_COUNT_RATIO)
    ):
        rejected_file = ARCHIVE_DIR / f"{shop}_{category}_{timestamp}_rejected-drop.jsonl"
        if temp_file.exists():
            shutil.copy2(str(temp_file), str(rejected_file))
            temp_file.unlink()

        updated_entry = {
            **previous_entry,
            "last_run_at": now_iso(),
            "status": "rejected_abnormal_drop",
            "last_count": old_snapshot.count,
            "last_digest": old_snapshot.digest,
            "changed_ratio": round(changed_ratio, 6),
            "unchanged_streak": int(previous_entry.get("unchanged_streak") or 0) + 1,
            "last_error": (
                f"Rejected abnormal count drop: old={old_snapshot.count}, new={new_snapshot.count}"
            ),
            "rejected_file": str(rejected_file.relative_to(ROOT_DIR)).replace("\\", "/"),
        }
        result = TaskResult(
            shop=shop,
            category=category,
            status="rejected_abnormal_drop",
            count=old_snapshot.count,
            changed_ratio=changed_ratio,
            message="New snapshot count dropped too much compared to previous snapshot.",
        )
        elapsed = time.time() - start_time
        print(f"[{thread_id}] DONE: {shop}:{category} (rejected_drop in {elapsed:.1f}s)")
        return result, updated_entry

    changed_enough = (
        changed_ratio > change_threshold or count_delta > max_count_delta or not full_file.exists()
    )

    if changed_enough:
        shutil.move(str(temp_file), str(full_file))
        shutil.copy2(str(full_file), str(archive_file))

        updated_entry = {
            "last_run_at": now_iso(),
            "status": "updated",
            "last_count": new_snapshot.count,
            "last_digest": new_snapshot.digest,
            "changed_ratio": round(changed_ratio, 6),
            "unchanged_streak": 0,
            "last_changed_at": now_iso(),
            "archive_file": str(archive_file.relative_to(ROOT_DIR)).replace("\\", "/"),
        }
        result = TaskResult(
            shop=shop,
            category=category,
            status="updated",
            count=new_snapshot.count,
            changed_ratio=changed_ratio,
        )
        elapsed = time.time() - start_time
        print(f"[{thread_id}] DONE: {shop}:{category} (updated in {elapsed:.1f}s)")
        return result, updated_entry

    if temp_file.exists():
        temp_file.unlink()

    updated_entry = {
        **previous_entry,
        "last_run_at": now_iso(),
        "status": "skipped_no_significant_change",
        "last_count": old_snapshot.count,
        "last_digest": old_snapshot.digest,
        "changed_ratio": round(changed_ratio, 6),
        "unchanged_streak": int(previous_entry.get("unchanged_streak") or 0) + 1,
    }

    result = TaskResult(
        shop=shop,
        category=category,
        status="skipped_no_significant_change",
        count=old_snapshot.count,
        changed_ratio=changed_ratio,
    )
    elapsed = time.time() - start_time
    print(f"[{thread_id}] DONE: {shop}:{category} (skipped_no_change in {elapsed:.1f}s)")
    return result, updated_entry


def build_arg_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run smart parallel catalog crawls")
    parser.add_argument("--workers", type=int, default=3, help="Number of parallel workers")
    parser.add_argument(
        "--categories",
        nargs="+",
        default=DEFAULT_CATEGORIES,
        help="Categories to crawl",
    )
    parser.add_argument(
        "--shops",
        nargs="+",
        default=list(SPIDER_BY_SHOP.keys()),
        choices=list(SPIDER_BY_SHOP.keys()),
        help="Shops to crawl",
    )
    parser.add_argument(
        "--change-threshold",
        type=float,
        default=0.02,
        help="Minimum changed ratio required to accept a new snapshot",
    )
    parser.add_argument(
        "--max-count-delta",
        type=int,
        default=5,
        help="Minimum absolute count delta required to accept a new snapshot",
    )
    parser.add_argument(
        "--cooldown-minutes",
        type=int,
        default=0,
        help="Skip crawl for stable pairs within cooldown window (0 disables)",
    )
    parser.add_argument(
        "--min-unchanged-streak",
        type=int,
        default=2,
        help="Required unchanged streak before cooldown skip can apply",
    )
    return parser


def main() -> int:
    parser = build_arg_parser()
    args = parser.parse_args()

    old_index = load_index()
    new_index = dict(old_index)

    tasks: List[Tuple[str, str]] = []
    for shop in args.shops:
        for category in args.categories:
            tasks.append((shop, category))

    print(f"Scheduling {len(tasks)} tasks with {args.workers} workers...")
    print(
        "Rules: change_threshold="
        f"{args.change_threshold}, max_count_delta={args.max_count_delta}, "
        f"cooldown_minutes={args.cooldown_minutes}"
    )

    results: List[TaskResult] = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        future_map = {
            executor.submit(
                run_task,
                shop,
                category,
                old_index,
                args.change_threshold,
                args.max_count_delta,
                args.cooldown_minutes,
                args.min_unchanged_streak,
            ): (shop, category)
            for shop, category in tasks
        }

        for future in as_completed(future_map):
            shop, category = future_map[future]
            try:
                result, entry = future.result()
            except Exception as exc:
                result = TaskResult(shop=shop, category=category, status="failed", message=str(exc))
                entry = {
                    **old_index.get(f"{shop}:{category}", {}),
                    "last_run_at": now_iso(),
                    "status": "failed",
                    "last_error": str(exc),
                }

            new_index[f"{shop}:{category}"] = entry
            results.append(result)
            print(
                f"[{result.shop}:{result.category}] {result.status} "
                f"count={result.count} changed_ratio={result.changed_ratio:.4f}"
            )

    save_index(new_index)

    failed = [r for r in results if r.status == "failed"]
    updated = [r for r in results if r.status == "updated"]
    skipped = [
        r
        for r in results
        if r.status in {"skipped_no_significant_change", "skipped_cooldown"}
    ]

    print("\nSummary")
    print(f"  Updated: {len(updated)}")
    print(f"  Skipped: {len(skipped)}")
    print(f"  Failed:  {len(failed)}")
    print(f"  Index:   {INDEX_FILE}")

    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())

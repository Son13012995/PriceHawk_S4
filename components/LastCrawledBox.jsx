"use client";

/**
 * LastCrawledBox — Hiển thị thời điểm sản phẩm được crawler cào gần nhất.
 * Data đến từ MAX(comparison.current_price_at) thông qua /api/compare.
 * Không cần fetch thêm — nhận lastCrawledAt qua props.
 */
export default function LastCrawledBox({ lastCrawledAt, loading = false }) {
  function formatCrawledTime(value) {
    if (!value) return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    const now = new Date();
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    const diffHour = Math.floor(diffMs / 3600000);
    const diffDay = Math.floor(diffMs / 86400000);

    // Hiển thị "X phút trước / X giờ trước" nếu gần
    if (diffMin < 1) return "vừa xong";
    if (diffMin < 60) return `${diffMin} phút trước`;
    if (diffHour < 24) return `${diffHour} giờ trước`;
    if (diffDay === 1) return "hôm qua";

    // Ngày cụ thể nếu xa hơn
    return new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(date);
  }

  if (loading) {
    return (
      <div className="px-4 py-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg h-[84px] animate-pulse" />
    );
  }

  const formattedTime = formatCrawledTime(lastCrawledAt);

  return (
    <div className="px-4 py-3 border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-lg hover:border-violet-500 dark:hover:border-violet-500 transition-all shadow-sm">
      {/* Icon + Label */}
      <div className="flex items-center gap-2 mb-1">
        <svg
          className="w-3.5 h-3.5 text-violet-500 shrink-0"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
          Cập nhật lần cuối
        </p>
      </div>

      {formattedTime ? (
        <>
          <p className="text-base font-bold text-zinc-900 dark:text-zinc-50 mt-1 leading-tight">
            {formattedTime}
          </p>
          <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1.5 leading-tight">
            Giá được cào tự động mỗi 5 phút
          </p>
        </>
      ) : (
        <p className="text-sm font-semibold text-zinc-400 dark:text-zinc-500 mt-2">
          Chưa có dữ liệu
        </p>
      )}
    </div>
  );
}

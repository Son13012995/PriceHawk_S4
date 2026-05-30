"use client";

import { useEffect, useMemo, useState } from "react";
import { getProductDetail } from "@/lib/apiClient";
import { formatPrice } from "@/app/utils/format";

function formatDateTime(value) {
  if (!value) return "Chưa có dữ liệu";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có dữ liệu";

  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export default function MinPriceBox({ productId }) {
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await getProductDetail(productId);

        setComparison(res.data?.comparison || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [productId]);

  const minPriceRecord = useMemo(() => {
    const candidates = comparison.filter((item) => {
      const value = Number(item?.price);
      return Number.isFinite(value) && value > 0;
    });

    if (!candidates.length) return null;

    return candidates.reduce((best, current) =>
      Number(current.price) < Number(best.price)
        ? current
        : best
    );
  }, [comparison]);

  if (loading) {
    return <div className="px-6 py-4 border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl h-[116px] animate-pulse" />;
  }

  if (!minPriceRecord) {
    return (
      <div className="px-6 py-4 border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 rounded-xl font-bold">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-2 border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 rounded-xl hover:border-violet-500 dark:hover:border-violet-500 transition-all shadow-sm">
      <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">Min Price</p>
      <p className="text-lg font-bold text-zinc-900 dark:text-zinc-50 mt-1 leading-tight truncate">
        {formatPrice(minPriceRecord.price)}
      </p>

      <p className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-2 mb-1">Cập nhật lúc</p>
      <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-tight truncate">
        {formatDateTime(minPriceRecord.current_price_at)}
      </p>
    </div>
  );
}

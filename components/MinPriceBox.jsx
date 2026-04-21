"use client";

import { useEffect, useMemo, useState } from "react";
import axios from "axios";

function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN").format(price);
}

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
        const res = await axios.get(`/api/compare`, {
          params: { id: productId },
        });

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
      const value = Number(item?.min_price);
      return Number.isFinite(value) && value > 0;
    });

    if (!candidates.length) return null;

    return candidates.reduce((best, current) =>
      Number(current.min_price) < Number(best.min_price)
        ? current
        : best
    );
  }, [comparison]);

  if (loading) {
    return <div className="px-6 py-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[1.25rem] h-[116px] animate-pulse" />;
  }

  if (!minPriceRecord) {
    return (
      <div className="px-6 py-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-[1.25rem] font-bold">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="px-6 py-4 border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-[1.25rem] hover:border-teal-500 dark:hover:border-teal-500 transition-all shadow-sm">
      <p className="text-xs font-bold text-teal-600 dark:text-teal-400 uppercase tracking-widest">Min Price</p>
      <p className="text-lg font-bold text-slate-900 dark:text-white mt-1 leading-tight truncate">
        {formatPrice(minPriceRecord.min_price)}₫
      </p>

      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mt-2 mb-1">Cập nhật lúc</p>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-tight truncate">
        {formatDateTime(minPriceRecord.min_price_at)}
      </p>
    </div>
  );
}

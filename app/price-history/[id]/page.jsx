"use client";

import { useEffect, useMemo, useState } from "react";
import { getProductDetail } from "@/lib/apiClient";

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
    return <div className="h-24 bg-zinc-100 animate-pulse rounded-xl" />;
  }

  if (!minPriceRecord) {
    return (
      <div className="p-4 border rounded-xl text-zinc-500">
        Chưa có dữ liệu
      </div>
    );
  }

  return (
    <div className="p-4 border rounded-xl bg-violet-50">
      <p className="text-xs text-zinc-500">Min Price</p>
      <p className="text-xl font-bold">
        {formatPrice(minPriceRecord.min_price)}₫
      </p>

      <p className="text-xs text-zinc-500 mt-2">Cập nhật lúc</p>
      <p className="text-sm font-semibold">
        {formatDateTime(minPriceRecord.min_price_at)}
      </p>
    </div>
  );
}

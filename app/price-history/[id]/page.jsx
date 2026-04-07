"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import axios from "axios";
import { cn, ui } from "../../../components/ui/designSystem";

function formatDate(date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function buildHistoryRows(basePrice) {
  const safe = Number(basePrice) || 100;
  return Array.from({ length: 7 }).map((_, index) => {
    const dayOffset = 6 - index;
    const date = new Date();
    date.setDate(date.getDate() - dayOffset);
    const drift = ((index % 3) - 1) * 2.25;
    const price = Math.max(1, Number((safe + drift).toFixed(2)));
    return { date: formatDate(date), price };
  });
}

function formatPrice(price) {
  return new Intl.NumberFormat("vi-VN").format(price);
}

export default function PriceHistoryPage({ params }) {
  const [product, setProduct] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      setError("");
      try {
        const res = await axios.get(`/api/compare`, { params: { id: params.id } });
        setProduct(res.data?.product?.[0] || null);
        setComparison(Array.isArray(res.data?.comparison) ? res.data.comparison : []);
      } catch (fetchError) {
        setError("Không thể tải lịch sử giá cho sản phẩm này.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [params.id]);

  const basePrice = useMemo(() => {
    if (!comparison.length) {
      return 100;
    }
    return Math.min(...comparison.map((item) => Number(item.price) || 100));
  }, [comparison]);

  const rows = useMemo(() => buildHistoryRows(basePrice), [basePrice]);
  const high = useMemo(() => Math.max(...rows.map((row) => row.price)), [rows]);

  return (
    <div className={cn(ui.pageWrap, "py-10")}> 
      <div className={cn(ui.container, "space-y-6")}> 
        <header className={cn(ui.card, "p-6 md:p-8")}> 
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Price Timeline</p>
          <h1 className={cn(ui.heading, "mt-3 text-3xl font-black sm:text-4xl")}>Lịch sử giá gần đây</h1>
          <p className={cn(ui.mutedText, "mt-3")}>
            {product ? product.name : `Sản phẩm #${params.id}`}
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link href={`/product/${params.id}`} className={cn(ui.secondaryButton, ui.ring)}>
              Quay lại trang sản phẩm
            </Link>
            <Link href="/alerts" className={cn(ui.primaryButton, ui.ring)}>
              Đặt cảnh báo giá
            </Link>
          </div>
        </header>

        <section className={cn(ui.card, "p-6 md:p-8")}> 
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 7 }).map((_, idx) => (
                <div key={idx} className="h-12 animate-pulse rounded-xl border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{error}</p>
          ) : (
            <div className="space-y-3">
              {rows.map((row) => (
                <div key={row.date} className="grid grid-cols-[95px_1fr_88px] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                  <span className="text-sm font-semibold text-slate-700">{row.date}</span>
                  <div className="h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-sky-400"
                      style={{ width: `${Math.max(12, (row.price / high) * 100)}%` }}
                    />
                  </div>
                  <span className="text-right text-sm font-bold text-slate-900">{formatPrice(row.price)}₫</span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-slate-500">
            Dữ liệu lịch sử hiện đang mô phỏng theo mặt bằng giá hiện tại. Bạn có thể nối vào bảng lịch sử giá thực tế khi backend sẵn sàng.
          </p>
        </section>
      </div>
    </div>
  );
}

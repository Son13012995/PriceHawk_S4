"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getProducts, searchProducts } from "../lib/apiClient";
import axios from "axios";
import SearchCard from "./SearchCard";
import AppSearchBar from "./ui/AppSearchBar";
import { cn, ui } from "./ui/designSystem";
import { Search, Package } from "lucide-react";

const SkeletonLoader = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="bg-zinc-100 dark:bg-zinc-800 rounded-2xl h-80 w-full shadow-inner border border-zinc-100 dark:border-zinc-700"
      />
    ))}
  </div>
);

export default function ProductBrowser({ searchTerm = "" }) {
  const [items, setItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 12;

  const isSearchMode = Boolean(searchTerm);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchData() {
      setLoading(true);
      setError("");

      try {
        const request = isSearchMode
          ? searchProducts(searchTerm, currentPage, pageSize, controller.signal)
          : getProducts(currentPage, pageSize, controller.signal);

        const res = await request;
        const payload = res.data || {};

        setItems(Array.isArray(payload.data) ? payload.data : []);
        setTotalItems(Number(payload.totalCount || 0));
      } catch (requestError) {
        if (!axios.isCancel(requestError)) {
          setError(
            isSearchMode
              ? "Khong the tai ket qua tim kiem. Vui long thu lai."
              : "Khong the tai danh sach san pham. Vui long thu lai."
          );
        }
      } finally {
        setLoading(false);
      }
    }

    fetchData();
    window.scrollTo({ top: 0, behavior: "smooth" });

    return () => controller.abort();
  }, [isSearchMode, searchTerm, currentPage]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalItems / pageSize)), [totalItems]);

  return (
    <div className={cn(ui.pageWrap, "py-10")}>
      <div className={cn(ui.container, "space-y-6")}>
      <header className={cn(ui.card, "p-8 md:p-10 relative overflow-hidden")}>
        {/* Decorative Background */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <Search className="w-6 h-6 text-violet-600 dark:text-violet-400" />
              </div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                Sản phẩm
              </p>
            </div>
            <h1 className={cn(ui.heading, "text-3xl font-black sm:text-5xl tracking-tight")}>
              {isSearchMode ? (
                <>
                  Kết quả cho
                  <span className="text-violet-600 dark:text-violet-500"> "{decodeURIComponent(searchTerm)}"</span>
                </>
              ) : (
                "Khám phá sản phẩm"
              )}
            </h1>
            <p className={cn(ui.mutedText, "mt-4 max-w-xl text-base mb-6")}>
              Tìm kiếm và so sánh hàng ngàn sản phẩm từ các nhà bán lẻ uy tín. Tìm giá tốt nhất trong chớp mắt.
            </p>
            <div className="w-full max-w-xl">
              <AppSearchBar placeholder="Tìm kiếm sản phẩm bạn muốn so sánh giá..." initialValue={isSearchMode ? decodeURIComponent(searchTerm) : ""} />
            </div>
          </div>
          
          {/* Statistics */}
          <div className="flex gap-4">
            <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-w-[120px]">
              <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                <Package className="w-4 h-4" />
                <span className="text-xs font-bold uppercase tracking-wider">Tổng cộng</span>
              </div>
              <p className="text-2xl font-black text-zinc-900 dark:text-white">
                {loading ? "-" : totalItems}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {error ? (
          <div className="bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 py-4 px-6 rounded-xl border border-rose-100 dark:border-rose-900/50 text-center shadow-sm font-medium mb-6">
            {error}
          </div>
        ) : null}

        {loading ? <SkeletonLoader /> : null}

        {!loading && !error && items.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {items.map((item) => (
              <SearchCard
                key={item?.id}
                id={item?.id}
                name={item?.name}
                brand={item?.brand}
                imageUrl={item?.image_url}
                currentPrice={item?.current_price || item?.min_price}
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="text-7xl mb-6 grayscale opacity-40">{isSearchMode ? "?" : "[]"}</div>
            <h2 className="text-xl font-medium text-zinc-700 dark:text-zinc-200">
              {isSearchMode ? "Không tìm thấy kết quả phù hợp" : "Hiện chưa có sản phẩm nào"}
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              {isSearchMode
                ? "Hãy thử từ khóa khác hoặc kiểm tra lại chính tả."
                : "Vui lòng quay lại sau."}
            </p>
          </div>
        ) : null}

        {!loading && totalItems > 0 && totalPages > 1 ? (
          <div className="flex justify-center items-center gap-3 mt-16 text-sm">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-6 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              Trước
            </button>

            <div className="rounded-full bg-violet-600 text-white text-sm font-semibold px-3 py-1.5">
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-6 py-2.5 rounded-full border border-zinc-200 dark:border-zinc-700 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              Sau
            </button>
          </div>
        ) : null}
      </main>
      </div>
    </div>
  );
}

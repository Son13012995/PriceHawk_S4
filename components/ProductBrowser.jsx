"use client";

import React, { useEffect, useMemo, useState } from "react";
import { getProducts, searchProducts } from "../lib/apiClient";
import axios from "axios"; // Keeping this for error checking IsCancel, but replacing requests
import SearchCard from "./SearchCard";

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
    <div className="min-h-screen bg-zinc-50 dark:bg-[#09090b] pb-16 text-zinc-800 dark:text-zinc-200">
      <header className="sticky top-0 z-20 bg-white/70 dark:bg-[#09090b]/70 backdrop-blur-xl border-b border-zinc-200/50 dark:border-zinc-800/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 md:py-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white">
              {isSearchMode ? (
                <>
                  Kết quả cho
                  <span className="text-violet-600 dark:text-violet-500"> "{decodeURIComponent(searchTerm)}"</span>
                </>
              ) : (
                "Khám phá sản phẩm"
              )}
            </h1>
            {!loading && !error ? (
              <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1.5 font-medium">
                Hiển thị <span className="text-zinc-900 dark:text-zinc-200">{items.length}</span> trên tổng số{" "}
                <span className="text-zinc-900 dark:text-zinc-200">{totalItems}</span> kết quả
              </p>
            ) : null}
          </div>
          
          {/* Optional: Add a subtle decoration or action area here if needed later */}
          <div className="hidden sm:block">
            <div className="h-10 w-10 rounded-full bg-violet-100 dark:bg-violet-900/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
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
  );
}

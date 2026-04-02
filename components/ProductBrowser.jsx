"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import SearchCard from "./SearchCard";

const SkeletonLoader = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
    {Array.from({ length: 8 }).map((_, index) => (
      <div
        key={index}
        className="bg-slate-100 rounded-2xl h-80 w-full shadow-inner border border-slate-100"
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
          ? axios.get("/api/pagination", {
              params: { q: searchTerm, page: currentPage, pageSize },
              signal: controller.signal,
            })
          : axios.get("/api/product", {
              params: { page: currentPage, pageSize },
              signal: controller.signal,
            });

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
    <div className="min-h-screen bg-slate-50 pb-16 text-slate-800">
      <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-900">
            {isSearchMode ? (
              <>
                Ket qua cho
                <span className="font-bold text-sky-700"> "{decodeURIComponent(searchTerm)}"</span>
              </>
            ) : (
              "Kham pha san pham"
            )}
          </h1>

          {!loading && !error ? (
            <p className="text-sm text-slate-500 mt-2">
              Hien thi <span className="font-semibold text-slate-700">{items.length}</span> tren tong so{" "}
              <span className="font-semibold text-slate-700">{totalItems}</span> ket qua
            </p>
          ) : null}
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-10">
        {error ? (
          <div className="bg-rose-50 text-rose-700 py-4 px-6 rounded-xl border border-rose-100 text-center shadow-sm font-medium mb-6">
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
              />
            ))}
          </div>
        ) : null}

        {!loading && !error && items.length === 0 ? (
          <div className="text-center py-24 flex flex-col items-center">
            <div className="text-7xl mb-6 grayscale opacity-40">{isSearchMode ? "?" : "[]"}</div>
            <h2 className="text-xl font-medium text-slate-700">
              {isSearchMode ? "Khong tim thay ket qua phu hop" : "Hien chua co san pham nao"}
            </h2>
            <p className="text-slate-500 mt-2">
              {isSearchMode
                ? "Hay thu tu khoa khac hoac kiem tra lai chinh ta."
                : "Vui long quay lai sau."}
            </p>
          </div>
        ) : null}

        {!loading && totalItems > 0 && totalPages > 1 ? (
          <div className="flex justify-center items-center gap-3 mt-16 text-sm">
            <button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-6 py-2.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              Truoc
            </button>

            <div className="px-6 py-2.5 bg-sky-50 text-sky-800 rounded-full font-bold shadow-inner border border-sky-100">
              {currentPage} / {totalPages}
            </div>

            <button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-6 py-2.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium"
            >
              Sau
            </button>
          </div>
        ) : null}
      </main>
    </div>
  );
}

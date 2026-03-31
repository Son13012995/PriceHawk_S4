"use client";

import SearchCard from "../../../components/SearchCard";
import React, { useEffect, useState } from "react";
import axios from "axios";

// Skeleton Loader với màu Slate dịu hơn
const SkeletonLoader = () => (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
        {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-slate-100 rounded-2xl h-80 w-full shadow-inner border border-slate-100"></div>
        ))}
    </div>
);

export default function Page({ params }) {
    const [searchResults, setSearchResults] = useState([]);
    const [totalResults, setTotalResults] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12;

    useEffect(() => {
        const controller = new AbortController();

        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/pagination`, {
                    params: { q: params.searchTerm, page: currentPage, pageSize },
                    signal: controller.signal,
                });
                setSearchResults(res.data.data);
                setTotalResults(res.data.totalCount);
            } catch (error) {
                if (!axios.isCancel(error)) {
                    setError("Không thể tải dữ liệu. Vui lòng thử lại.");
                }
            } finally {
                setLoading(false);
            }
        }
        fetchData();
        window.scrollTo({ top: 0, behavior: 'smooth' });
        return () => controller.abort();
    }, [params.searchTerm, currentPage]);

    const totalPages = Math.ceil(totalResults / pageSize);

    return (
        // 1. Nền trang tông Slate-50 dịu mát
        <div className="min-h-screen bg-slate-50 pb-16 font-sans text-slate-800">

            {/* Header section - Cố định, nền trắng tinh khôi */}
            <header className="bg-white border-b border-slate-100 shadow-sm sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-6 py-8">
                    {/* 2. Tiêu đề dùng text-slate-900, từ khóa dùng sky-700 mượt mà */}
                    <h1 className="text-2xl md:text-3xl font-light tracking-wide text-slate-900">
                        {loading ? (
                            <span className="text-slate-400">Đang tìm kiếm...</span>
                        ) : (
                            <>
                                Kết quả cho <span className="font-medium text-sky-700">"{decodeURIComponent(params.searchTerm)}"</span>
                            </>
                        )}
                    </h1>
                    {!loading && !error && (
                        <p className="text-sm text-slate-500 mt-2 font-light">
                            Hiển thị <span className="font-medium text-slate-700">{searchResults.length}</span> trên tổng số <span className="font-medium text-slate-700">{totalResults}</span> kết quả
                        </p>
                    )}
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-6 mt-10">
                {/* Error Message - Màu đỏ dịu hơn (rose) */}
                {error && (
                    <div className="bg-rose-50 text-rose-700 py-4 px-6 rounded-xl border border-rose-100 text-center shadow-sm font-medium">
                        {error}
                    </div>
                )}

                {loading && <SkeletonLoader />}

                {!loading && !error && searchResults.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {searchResults.map((data) => (
                            <div key={data?.id}>
                                <SearchCard
                                    id={data?.id}
                                    name={data?.name}
                                    brand={data?.brand}
                                    imageUrl={data?.image_url}
                                />
                            </div>
                        ))}
                    </div>
                )}

                {!loading && !error && searchResults.length === 0 && (
                    <div className="text-center py-24 flex flex-col items-center">
                        <div className="text-7xl mb-6 grayscale opacity-40">🔍</div>
                        <h2 className="text-xl font-medium text-slate-700">Không tìm thấy kết quả phù hợp</h2>
                        <p className="text-slate-500 mt-2 font-light">Hãy thử từ khóa khác hoặc kiểm tra lại chính tả.</p>
                    </div>
                )}

                {/* 5. Pagination Thiết kế mới hài hòa hơn */}
                {!loading && totalPages > 1 && (
                    <div className="flex justify-center items-center gap-3 mt-16 text-sm">

                        {/* Nút Trước - Nền xám xanh cực nhẹ */}
                        <button
                            onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="px-6 py-2.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium active:scale-95"
                        >
                            ← Trước
                        </button>

                        {/* Chỉ số trang - Điểm nhấn xanh nhạt dễ chịu */}
                        <div className="px-6 py-2.5 bg-sky-50 text-sky-800 rounded-full font-bold shadow-inner border border-sky-100">
                            {currentPage} / {totalPages}
                        </div>

                        {/* Nút Sau */}
                        <button
                            onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="px-6 py-2.5 rounded-full border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm font-medium active:scale-95"
                        >
                            Sau →
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
}
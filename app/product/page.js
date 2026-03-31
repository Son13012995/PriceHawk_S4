"use client";

import SearchCard from "../../components/SearchCard";
import React, { useEffect, useState } from "react";
import axios from "axios";

// Component con cho hiệu ứng loading đẹp hơn
const SkeletonCard = () => (
    <div className="bg-gray-200 animate-pulse rounded-xl h-80 w-full"></div>
);

export default function ProductsPage() {
    const [products, setProducts] = useState([]);
    const [totalProducts, setTotalProducts] = useState(0);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 12; // Tăng lên 12 để chia hết cho grid 2, 3, 4

    useEffect(() => {
        async function fetchProducts() {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/product`, {
                    params: { page: currentPage, pageSize },
                });
                setProducts(res.data.data);
                setTotalProducts(res.data.totalCount);
            } catch (error) {
                setError("Không thể tải sản phẩm. Vui lòng thử lại sau.");
            } finally {
                setLoading(false);
            }
        }
        fetchProducts();
        // Cuộn lên đầu trang khi đổi trang
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [currentPage]);

    const totalPages = Math.ceil(totalProducts / pageSize);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8 min-h-screen bg-gray-50">
            {/* Header Section */}
            <div className="mb-10 text-center">
                <h1 className="text-4xl font-extrabold text-gray-900 mb-2">
                    Khám Phá Sản Phẩm
                </h1>
                <div className="h-1 w-20 bg-blue-600 mx-auto rounded-full"></div>
                {!loading && (
                    <p className="text-gray-500 mt-4">
                        Tìm thấy <span className="font-semibold text-blue-600">{totalProducts}</span> sản phẩm chất lượng
                    </p>
                )}
            </div>

            {/* Error State */}
            {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg">
                    <p className="text-red-700">{error}</p>
                </div>
            )}

            {/* Main Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {loading ? (
                    // Hiển thị 8 skeleton cards khi đang load
                    Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)
                ) : products.length > 0 ? (
                    products.map((product) => (
                        <div key={product.id} className="transform hover:-translate-y-1 transition-transform duration-300">
                            <SearchCard
                                id={product.id}
                                name={product.name}
                                brand={product.brand}
                                imageUrl={product.image_url}
                            />
                        </div>
                    ))
                ) : null}
            </div>

            {/* No Products Found */}
            {!loading && products.length === 0 && !error && (
                <div className="text-center py-20">
                    <div className="text-6xl mb-4">📦</div>
                    <h2 className="text-xl font-medium text-gray-600">Hiện chưa có sản phẩm nào.</h2>
                </div>
            )}

            {/* Modern Pagination */}
            {!loading && totalPages > 1 && (
                <div className="mt-12 flex justify-center items-center gap-2">
                    <button
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        ← Trang trước
                    </button>

                    <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg font-bold">
                        {currentPage} / {totalPages}
                    </div>

                    <button
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex items-center px-4 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Trang sau →
                    </button>
                </div>
            )}
        </div>
    );
}
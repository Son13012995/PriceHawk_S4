"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";

// Hiệu ứng Loading khung xương (Skeleton) cho trang chi tiết
const DetailSkeleton = () => (
    <div className="flex flex-col lg:flex-row gap-12 animate-pulse w-full max-w-6xl mx-auto">
        <div className="w-full lg:w-1/2 aspect-square bg-slate-200 rounded-3xl"></div>
        <div className="w-full lg:w-1/2 space-y-6 pt-4">
            <div className="h-10 bg-slate-200 rounded-lg w-3/4"></div>
            <div className="h-6 bg-slate-200 rounded-lg w-1/4"></div>
            <div className="h-px bg-slate-200 w-full my-8"></div>
            <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-6"></div>
            <div className="h-24 bg-slate-200 rounded-2xl w-full"></div>
        </div>
    </div>
);

export default function ProductItem({ params }) {
    const router = useRouter();
    const [product, setProduct] = useState(null);
    const [comparison, setComparison] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`/api/compare?id=${params.id}`);
                const data = res.data;
                setProduct(data?.product[0]);
                setComparison(data?.comparison);
            } catch (error) {
                setError("Không thể tải thông tin sản phẩm. Vui lòng thử lại sau.");
                console.error("Error Fetching data:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [params.id]);

    return (
        // Bao bọc toàn bộ trang bằng nền tông Slate dịu mắt
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 py-12 px-4 sm:px-6 lg:px-8">

            {/* Container căn giữa trang, giới hạn chiều rộng max-w-6xl */}
            <div className="max-w-6xl mx-auto">

                {loading && <DetailSkeleton />}

                {error && (
                    <div className="bg-rose-50 text-rose-700 py-4 px-6 rounded-2xl border border-rose-100 text-center font-medium shadow-sm">
                        {error}
                    </div>
                )}

                {!loading && !error && product && (
                    <div className="flex flex-col lg:flex-row gap-12">

                        {/* CỘT TRÁI: Khung Ảnh Sản Phẩm */}
                        <div className="w-full lg:w-1/2">
                            <div className="relative w-full aspect-square bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-center p-8 overflow-hidden group">
                                <Image
                                    src={product?.image_url}
                                    alt={product?.name || "Product Image"}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="object-contain p-8 transition-transform duration-700 group-hover:scale-105"
                                    priority // Ưu tiên load ảnh chính
                                />
                            </div>
                        </div>

                        {/* CỘT PHẢI: Thông tin và Nơi bán */}
                        <div className="w-full lg:w-1/2 flex flex-col pt-2 lg:pt-6">

                            {/* Nút Quay lại (Tùy chọn, thêm vào cho UX tốt hơn) */}
                            <button
                                onClick={() => router.back()}
                                className="self-start mb-6 text-sm text-slate-500 hover:text-sky-700 flex items-center gap-2 transition-colors"
                            >
                                ← Quay lại
                            </button>

                            {/* Tên & Brand */}
                            <div>
                                <h1 className="text-3xl sm:text-4xl font-medium text-slate-900 leading-tight mb-4">
                                    {product?.name}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm text-slate-400 uppercase tracking-widest">Brand:</span>
                                    <span className="text-sm font-semibold text-slate-700 bg-slate-200/50 px-3 py-1 rounded-full border border-slate-200">
                    {product?.brand}
                  </span>
                                </div>
                            </div>

                            {/* Đường kẻ ngang thanh lịch */}
                            <hr className="border-slate-200 my-10" />

                            {/* Khu vực so sánh giá (Available on) */}
                            <div>
                                <h2 className="text-xl font-medium text-slate-800 mb-6 flex items-center gap-2">
                                    <span className="text-2xl">🏪</span> Hiện có sẵn tại
                                </h2>

                                {comparison.length > 0 ? (
                                    <div className="space-y-4">
                                        {comparison.map((data, index) => (
                                            <div
                                                key={data?.id || index}
                                                className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow gap-4"
                                            >
                                                {/* Tên shop & Giá */}
                                                <div>
                                                    <h3 className="text-lg font-medium text-slate-800 mb-1">
                                                        {data?.name}
                                                    </h3>
                                                    <p className="text-slate-500 font-light">
                                                        Giá bán: <span className="text-sky-700 font-semibold text-xl ml-1">&#163;{data?.price}</span>
                                                    </p>
                                                </div>

                                                {/* Nút bấm chuyển hướng */}
                                                <button
                                                    className="w-full sm:w-auto px-6 py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium rounded-xl transition-all shadow-sm shadow-sky-200 active:scale-95 whitespace-nowrap"
                                                    onClick={() => window.open(data?.url, "_blank", "noopener,noreferrer")}
                                                >
                                                    Tới cửa hàng
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-slate-100 rounded-2xl p-6 text-center text-slate-500 font-light border border-slate-200">
                                        Hiện chưa có thông tin giá bán cho sản phẩm này.
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
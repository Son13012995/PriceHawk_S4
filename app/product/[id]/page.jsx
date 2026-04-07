"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import axios from "axios";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { formatPrice } from "@/app/utils/format";

// Skeleton giữ nguyên
const DetailSkeleton = () => (
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16 animate-pulse w-full max-w-6xl mx-auto">
        <div className="w-full lg:w-1/2 aspect-square bg-white rounded-[2rem] border border-slate-100 shadow-sm"></div>
        <div className="w-full lg:w-1/2 space-y-6 pt-4 lg:pt-10">
            <div className="h-6 w-24 bg-slate-200 rounded-full mb-8"></div>
            <div className="h-12 bg-slate-200 rounded-xl w-4/5"></div>
            <div className="h-8 bg-slate-200 rounded-lg w-1/4"></div>
            <div className="h-px bg-slate-200 w-full my-10"></div>
            <div className="h-8 bg-slate-200 rounded-lg w-1/3 mb-6"></div>
            <div className="space-y-4">
                <div className="h-24 bg-slate-200 rounded-2xl w-full"></div>
                <div className="h-24 bg-slate-200 rounded-2xl w-full"></div>
            </div>
        </div>
    </div>
);

export default function ProductItem({ params }) {
    const router = useRouter();
    const [product, setProduct] = useState(null);
    const [comparison, setComparison] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [wishlistMessage, setWishlistMessage] = useState("");
    const [showAlertForm, setShowAlertForm] = useState(false);
    const [alertTarget, setAlertTarget] = useState("");
    const [alertNote, setAlertNote] = useState("");
    const [alertError, setAlertError] = useState("");

    const addToWishlist = async () => {
        if (!product?.id) {
            return;
        }

        try {
            const response = await axios.post("/api/wishlist", {
                productId: product.id,
                userId: null,
            });

            if (response.status === 201 || response.status === 200) {
                setWishlistMessage("✓ Đã thêm vào wishlist.");
                setTimeout(() => setWishlistMessage(""), 3000);
            }
        } catch (error) {
            if (error.response?.status === 409) {
                setWishlistMessage("Sản phẩm đã có trong wishlist.");
            } else {
                setWishlistMessage("Không thể thêm vào wishlist. Vui lòng thử lại.");
            }
            setTimeout(() => setWishlistMessage(""), 3000);
        }
    };

    const handlePriceAlertSubmit = async (e) => {
        e.preventDefault();
        setAlertError("");

        const currentPrice = product?.current_price || 0;
        const target = Number(alertTarget);

        if (!alertTarget.trim() || target <= 0) {
            setAlertError("Vui lòng nhập mức giá hợp lệ.");
            return;
        }

        if (target >= currentPrice) {
            setAlertError(`Mức giá mục tiêu phải thấp hơn giá hiện tại (${formatPrice(currentPrice)}đ).`);
            return;
        }

        try {
            const response = await axios.post("/api/price-alert", {
                productId: product.id,
                targetPrice: target,
                note: alertNote.trim() || null,
                userId: null,
            });

            if (response.status === 201) {
                setWishlistMessage(`✓ Đã tạo price alert (mục tiêu: ${formatPrice(target)}đ)`);
                setTimeout(() => setWishlistMessage(""), 3000);

                setShowAlertForm(false);
                setAlertTarget("");
                setAlertNote("");
            }
        } catch (error) {
            setAlertError(error.response?.data?.error || "Không thể tạo alert. Vui lòng thử lại.");
        }
    };

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
        <div className="min-h-screen bg-slate-50 font-sans text-slate-800 py-10 px-4 sm:px-6 lg:px-8">
            <div className="max-w-6xl mx-auto">

                {loading && <DetailSkeleton />}

                {error && (
                    <div className="bg-rose-50 text-rose-600 py-4 px-6 rounded-2xl border border-rose-100 flex items-center justify-center gap-2 font-medium shadow-sm">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {error}
                    </div>
                )}

                {!loading && !error && product && (
                    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

                        {/* CỘT TRÁI */}
                        <div className="w-full lg:w-1/2">
                            <div className="sticky top-24 relative w-full aspect-square bg-white rounded-[2rem] border border-slate-100 shadow-sm shadow-slate-200/50 flex items-center justify-center p-8 overflow-hidden group">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                <Image
                                    src={product?.image_url}
                                    alt={product?.name || "Product Image"}
                                    fill
                                    sizes="(max-width: 1024px) 100vw, 50vw"
                                    className="object-contain p-10 transition-transform duration-700 ease-out group-hover:scale-110 relative z-10"
                                    priority
                                />
                            </div>
                        </div>

                        {/* CỘT PHẢI */}
                        <div className="w-full lg:w-1/2 flex flex-col pt-2 lg:pt-4">

                            <button
                                onClick={() => router.back()}
                                className="self-start mb-8 text-sm font-medium text-slate-500 hover:text-indigo-600 flex items-center gap-2 transition-colors group py-2"
                            >
                                <div className="w-8 h-8 rounded-full bg-slate-200/50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors">
                                    <svg className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                    </svg>
                                </div>
                                Quay lại
                            </button>

                            {/* Tên & Brand - Hạ từ extrabold xuống bold, màu slate-800 */}
                            <div>
                                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-slate-800 leading-[1.15] mb-6 tracking-tight">
                                    {product?.name}
                                </h1>
                                <div className="flex items-center gap-3">
                                    <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Brand:</span>
                                    {/* Hạ từ bold xuống semibold */}
                                    <span className="text-sm font-semibold text-indigo-700 bg-indigo-50 px-3.5 py-1.5 rounded-lg border border-indigo-100 shadow-sm">
                                        {product?.brand}
                                    </span>
                                </div>
                            </div>

                            <hr className="border-slate-100 my-10" />

                            <div className="mb-8 flex flex-wrap items-center gap-3">
                                <Link
                                    href={`/price-history/${params.id}`}
                                    className="px-4 py-2.5 rounded-xl border border-cyan-200 bg-cyan-50 text-cyan-700 text-sm font-semibold hover:bg-cyan-100 transition-colors"
                                >
                                    Lịch sử giá
                                </Link>
                                <button
                                    onClick={() => setShowAlertForm(true)}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Set price alert
                                </button>
                                <button
                                    onClick={addToWishlist}
                                    className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Add to wishlist
                                </button>
                            </div>

                            {wishlistMessage ? (
                                <p className="mb-6 text-sm text-slate-500">{wishlistMessage}</p>
                            ) : null}

                            <div>
                                {/* Hạ từ bold xuống semibold */}
                                <h2 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2.5">
                                    <svg className="w-6 h-6 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                    </svg>
                                    Hiện có sẵn tại
                                </h2>

                                {comparison.length > 0 ? (
                                    <div className="space-y-4">
                                        {comparison.map((data, index) => (
                                            <div
                                                key={data?.id || index}
                                                className="group relative flex flex-col sm:flex-row sm:items-center justify-between p-5 sm:p-6 bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 gap-5"
                                            >
                                                <div className="flex-1">
                                                    {/* Hạ từ bold xuống semibold */}
                                                    <h3 className="text-lg font-semibold text-slate-800 mb-1 flex items-center gap-2">
                                                        {data?.name}
                                                    </h3>
                                                    <div className="flex items-baseline gap-1.5 mt-2">
                                                        <span className="text-sm font-medium text-slate-500">Giá bán:</span>
                                                        {/* Hạ từ extrabold xuống bold */}
                                                        <span className="font-bold text-2xl tracking-tight text-slate-800 group-hover:text-indigo-600 transition-colors">
                                                            {formatPrice(data?.price)}
                                                        </span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => window.open(data?.url, "_blank", "noopener,noreferrer")}
                                                    // Hạ từ semibold xuống medium
                                                    className="w-full sm:w-auto px-6 py-3 text-sm font-medium rounded-xl transition-all duration-300 shadow-sm flex items-center justify-center gap-2 bg-slate-50 hover:bg-indigo-600 text-slate-700 hover:text-white border border-slate-200 hover:border-indigo-600 active:scale-95"
                                                >
                                                    Tới cửa hàng
                                                    <svg className="w-4 h-4 text-slate-400 group-hover:text-indigo-200 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                                                    </svg>
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-2xl p-8 text-center border border-slate-100 shadow-sm flex flex-col items-center">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
                                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-slate-500 font-medium">Hiện chưa có thông tin giá bán cho sản phẩm này.</p>
                                    </div>
                                )}
                            </div>

                        </div>
                    </div>
                )}
            </div>

            {/* Price Alert Form Modal */}
            {showAlertForm && product && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 p-6">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Tạo Price Alert</h2>
                            <button
                                onClick={() => {
                                    setShowAlertForm(false);
                                    setAlertError("");
                                    setAlertTarget("");
                                    setAlertNote("");
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        {/* Product info */}
                        <div className="mb-6 flex items-center gap-3 p-3 bg-cyan-50 rounded-xl border border-cyan-200">
                            {product?.image_url && (
                                <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-12 w-12 rounded object-cover"
                                />
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="font-semibold text-slate-900 truncate">{product?.name}</p>
                                <p className="text-sm text-cyan-700 font-bold">formatPrice(current_price)</p>
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handlePriceAlertSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Mức giá mục tiêu
                                </label>
                                <div className="relative">
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">formatPrice(target)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={alertTarget}
                                        onChange={(e) => setAlertTarget(e.target.value)}
                                        placeholder={`Dưới formatPrice(product?.current_price})`}
                                        className="w-full pl-7 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                        autoFocus
                                    />
                                </div>
                                {alertTarget && (
                                    <p className={`mt-2 text-xs font-medium ${
                                        Number(alertTarget) < product?.current_price ? "text-emerald-600" : "text-rose-600"
                                    }`}>
                                        {Number(alertTarget) < product?.current_price
                                            ? `✓ Tiết kiệm £${(product?.current_price - Number(alertTarget)).toFixed(2)}`
                                            : `✗ Phải thấp hơn £${product?.price}`}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-2">
                                    Ghi chú (tuỳ chọn)
                                </label>
                                <input
                                    type="text"
                                    value={alertNote}
                                    onChange={(e) => setAlertNote(e.target.value)}
                                    placeholder="Vì sao bạn muốn alert này?"
                                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-slate-900 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100"
                                />
                            </div>

                            {alertError && (
                                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
                                    {alertError}
                                </div>
                            )}

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowAlertForm(false);
                                        setAlertError("");
                                        setAlertTarget("");
                                        setAlertNote("");
                                    }}
                                    className="flex-1 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button
                                    type="submit"
                                    disabled={!alertTarget}
                                    className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-white transition-colors ${
                                        alertTarget
                                            ? "bg-cyan-600 hover:bg-cyan-700"
                                            : "bg-slate-300 cursor-not-allowed"
                                    }`}
                                >
                                    Tạo Alert
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
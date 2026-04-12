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
        <div className="w-full lg:w-1/2 aspect-square bg-white dark:bg-slate-800 rounded-[2rem] border border-slate-100 dark:border-slate-700 shadow-sm"></div>
        <div className="w-full lg:w-1/2 space-y-6 pt-4 lg:pt-10">
            <div className="h-6 w-24 bg-slate-200 dark:bg-slate-700 rounded-full mb-8"></div>
            <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-xl w-4/5"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/4"></div>
            <div className="h-px bg-slate-200 dark:bg-slate-700 w-full my-10"></div>
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-1/3 mb-6"></div>
            <div className="space-y-4">
                <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full"></div>
                <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl w-full"></div>
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
        if (!product?.id) return;
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
            setWishlistMessage("Sản phẩm đã có trong wishlist.");
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
            setAlertError(`Giá mục tiêu phải thấp hơn giá hiện tại (${formatPrice(currentPrice)}đ).`);
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
                setWishlistMessage(`✓ Đã tạo alert: ${formatPrice(target)}đ`);
                setTimeout(() => setWishlistMessage(""), 3000);
                setShowAlertForm(false);
                setAlertTarget("");
                setAlertNote("");
            }
        } catch (error) {
            setAlertError("Không thể tạo alert.");
        }
    };

    useEffect(() => {
        async function fetchData() {
            setLoading(true);
            try {
                const res = await axios.get(`/api/compare?id=${params.id}`);
                setProduct(res.data?.product[0]);
                setComparison(res.data?.comparison);
            } catch (error) {
                setError("Lỗi tải dữ liệu.");
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [params.id]);

    return (
        <div className="min-h-screen bg-slate-50/50 dark:bg-slate-900 py-10 px-4 sm:px-6 lg:px-8 text-slate-800 dark:text-slate-200">
            <div className="max-w-6xl mx-auto">
                {loading && <DetailSkeleton />}

                {!loading && !error && product && (
                    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">

                        {/* CỘT TRÁI */}
                        <div className="w-full lg:w-1/2">
                            <div className="sticky top-24 aspect-square bg-white dark:bg-slate-800 rounded-[2.5rem] border border-slate-100 dark:border-slate-700 shadow-xl shadow-slate-200/30 dark:shadow-none flex items-center justify-center p-8 overflow-hidden group">
                                <Image
                                    src={product?.image_url}
                                    alt={product?.name}
                                    fill
                                    className="object-contain p-12 transition-transform duration-500 group-hover:scale-110"
                                    priority
                                />
                            </div>
                        </div>

                        {/* CỘT PHẢI */}
                        <div className="w-full lg:w-1/2 flex flex-col pt-2">
                            <button onClick={() => router.back()} className="self-start mb-6 flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors group">
                                <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                                Quay lại
                            </button>

                            <h1 className="text-3xl lg:text-4xl font-bold text-slate-800 dark:text-white leading-tight mb-4 lowercase first-letter:uppercase">
                                {product?.name}
                            </h1>

                            <div className="flex items-center gap-3 mb-8">
                                <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40 px-3 py-1.5 rounded-lg border border-indigo-100 dark:border-indigo-800 uppercase tracking-widest">
                                    {product?.brand}
                                </span>
                            </div>

                            <div className="flex flex-wrap gap-3 mb-8">
                                <Link href={`/price-history/${params.id}`} className="px-5 py-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-all shadow-sm flex items-center gap-2">
                                    <svg className="w-4 h-4 text-cyan-600 dark:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                    Lịch sử giá
                                </Link>
                                <button onClick={() => setShowAlertForm(true)} className="px-5 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-700 text-white font-bold hover:bg-slate-800 dark:hover:bg-slate-600 transition-all shadow-lg flex items-center gap-2">
                                    <svg className="w-4 h-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" /></svg>
                                    Set alert
                                </button>
                                <button onClick={addToWishlist} className="p-2.5 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:text-rose-500 transition-all">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
                                </button>
                            </div>

                            {wishlistMessage && <p className="mb-6 text-sm font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl inline-block border border-emerald-100 dark:border-emerald-800">{wishlistMessage}</p>}

                            <h2 className="text-xl font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                                <svg className="w-6 h-6 text-indigo-500 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                So sánh giá
                            </h2>

                            <div className="space-y-4">
                                {comparison.map((data, index) => (
                                    <div key={index} className="flex items-center justify-between p-5 bg-white dark:bg-slate-800 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 hover:shadow-md transition-all group">
                                        <div>
                                            <p className="text-xs font-bold text-slate-400 uppercase mb-1">{data?.name}</p>
                                            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100">{formatPrice(data?.price)}</p>
                                        </div>
                                        <button onClick={() => window.open(data?.url, "_blank")} className="px-5 py-2.5 bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-bold rounded-xl group-hover:bg-indigo-600 dark:group-hover:bg-indigo-500 group-hover:text-white transition-all flex items-center gap-2">
                                            Mua ngay
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal Price Alert - Đã fix lỗi code hiển thị */}
            {showAlertForm && product && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-900/80 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
                        <div className="p-8">
                            <div className="flex items-center justify-between mb-8">
                                <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Tạo Cảnh Báo Giá</h2>
                                <button onClick={() => setShowAlertForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-full text-slate-400 dark:text-slate-500">
                                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                </button>
                            </div>

                            <div className="mb-8 flex items-center gap-4 p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-2xl border border-cyan-100 dark:border-cyan-800">
                                <div className="h-12 w-12 relative bg-white dark:bg-slate-800 rounded-lg p-1 border border-cyan-100 dark:border-cyan-800">
                                    <img src={product.image_url} alt="" className="object-contain h-full w-full" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="font-bold text-slate-900 dark:text-slate-200 truncate text-sm">{product.name}</p>
                                    {/* FIX 1: Bọc trong ngoặc nhọn */}
                                    <p className="text-cyan-700 dark:text-cyan-400 font-bold">{formatPrice(product.current_price)}</p>
                                </div>
                            </div>

                            <form onSubmit={handlePriceAlertSubmit} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Giá mong muốn</label>
                                    <div className="relative">
                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₫</span>
                                        <input
                                            type="number"
                                            value={alertTarget}
                                            onChange={(e) => setAlertTarget(e.target.value)}
                                            /* FIX 2: Template literal đúng cú pháp */
                                            placeholder={`Thấp hơn ${formatPrice(product.current_price)}`}
                                            className="w-full pl-8 pr-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 focus:ring-2 focus:ring-cyan-100 dark:focus:ring-cyan-800 focus:border-cyan-500 transition-all font-bold outline-none"
                                            autoFocus
                                        />
                                    </div>
                                    {alertTarget && (
                                        <p className={`mt-2 text-xs font-bold ${Number(alertTarget) < product.current_price ? "text-emerald-600 dark:text-emerald-400" : "text-rose-500 dark:text-rose-400"}`}>
                                            {Number(alertTarget) < product.current_price
                                                ? `✓ Tiết kiệm được ${formatPrice(product.current_price - Number(alertTarget))}`
                                                : `! Phải thấp hơn ${formatPrice(product.current_price)}`
                                            }
                                        </p>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-2">Ghi chú</label>
                                    <input
                                        type="text"
                                        value={alertNote}
                                        onChange={(e) => setAlertNote(e.target.value)}
                                        placeholder="Ví dụ: Quà sinh nhật..."
                                        className="w-full px-4 py-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 outline-none"
                                    />
                                </div>

                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={() => setShowAlertForm(false)} className="flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-700/50 text-slate-600 dark:text-slate-300 font-bold hover:bg-slate-200 dark:hover:bg-slate-700">Hủy</button>
                                    <button
                                        type="submit"
                                        disabled={!alertTarget || Number(alertTarget) >= product.current_price}
                                        className="flex-[2] py-3.5 rounded-xl bg-cyan-600 text-white font-bold hover:bg-cyan-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 dark:disabled:text-slate-500 shadow-lg shadow-cyan-100 dark:shadow-none"
                                    >
                                        Tạo Alert
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
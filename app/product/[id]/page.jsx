"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";
import {
  getProductDetail,
  getPriceHistory,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  createAlert,
} from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import MinPriceBox from "@/components/MinPriceBox";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import { formatPrice, formatPriceInput, formatPriceUpdateTime, parsePriceInput } from "@/app/utils/format";
import { ShoppingBasket } from "lucide-react";
import { mutate } from "swr";

const DetailSkeleton = () => (
  <div className="animate-pulse w-full max-w-6xl mx-auto space-y-8">
    <div className="flex flex-col lg:flex-row gap-10 lg:gap-16">
      <div className="w-full lg:w-5/12 aspect-square bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      <div className="w-full lg:w-7/12 space-y-5 pt-4">
        <div className="h-5 w-20 bg-zinc-200 dark:bg-zinc-800 rounded-full" />
        <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-4/5" />
        <div className="h-8 bg-zinc-100 dark:bg-zinc-700 rounded-lg w-1/3" />
        <div className="h-px bg-zinc-200 dark:bg-zinc-800 w-full my-6" />
        <div className="flex gap-3">
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl flex-1" />
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-28" />
          <div className="h-16 bg-zinc-200 dark:bg-zinc-800 rounded-xl w-28" />
        </div>
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
      <div className="h-64 bg-zinc-200 dark:bg-zinc-800 rounded-2xl" />
    </div>
  </div>
);

export default function ProductItem({ params }) {
  const router = useRouter();
  const [product, setProduct] = useState(null);
  const [comparison, setComparison] = useState([]);
  const [priceHistory, setPriceHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [wishlistMessage, setWishlistMessage] = useState("");
  const [showAlertForm, setShowAlertForm] = useState(false);
  const [alertTarget, setAlertTarget] = useState("");
  const [alertNote, setAlertNote] = useState("");
  const [alertError, setAlertError] = useState("");
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  const addToWishlistFn = async () => {
    if (!product?.id) return;
    try {
      const response = await addToWishlist(product.id);
      if (response.status === 201 || response.status === 200) {
        setIsInWishlist(true);
        setWishlistMessage("✓ Đã thêm vào wishlist.");
        setTimeout(() => setWishlistMessage(""), 3000);
        mutate("wishlist-nav");
      }
    } catch {
      setWishlistMessage("Lỗi khi thêm vào wishlist.");
      setTimeout(() => setWishlistMessage(""), 3000);
    }
  };

  const removeFromWishlistFn = async () => {
    if (!product?.id) return;
    try {
      await removeFromWishlist(product.id);
      setIsInWishlist(false);
      setWishlistMessage("Đã xóa khỏi wishlist.");
      setTimeout(() => setWishlistMessage(""), 3000);
      setShowRemoveConfirm(false);
      mutate("wishlist-nav");
    } catch {
      setWishlistMessage("Lỗi khi xóa khỏi wishlist.");
      setTimeout(() => setWishlistMessage(""), 3000);
    }
  };

  const handleWishlistClick = () => {
    if (isInWishlist) setShowRemoveConfirm(true);
    else addToWishlistFn();
  };

  const handlePriceAlertSubmit = async (e) => {
    e.preventDefault();
    setAlertError("");
    const currentPrice = product?.current_price || 0;
    const target = parsePriceInput(alertTarget);
    if (!alertTarget.trim() || target <= 0) {
      setAlertError("Vui lòng nhập mức giá hợp lệ.");
      return;
    }
    if (target >= currentPrice) {
      setAlertError(`Giá mong muốn phải thấp hơn giá hiện tại (${formatPrice(currentPrice)}).`);
      return;
    }
    try {
      const response = await createAlert(
        product.id,
        target,
        alertNote.trim() || null
      );
      if (response.status === 201) {
        setWishlistMessage(`✓ Đã tạo alert: ${formatPrice(target)}`);
        setTimeout(() => setWishlistMessage(""), 3000);
        setShowAlertForm(false);
        setAlertTarget("");
        setAlertNote("");
      }
    } catch {
      setAlertError("Không thể tạo alert.");
    }
  };

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [compareRes, wlRes] = await Promise.all([
          getProductDetail(params.id),
          getWishlist().catch(() => ({ data: { data: [] } })),
        ]);
        setProduct(compareRes.data?.product[0]);
        setComparison(compareRes.data?.comparison);
        const wlData = wlRes.data?.data || [];
        setIsInWishlist(wlData.some((item) => item.product_id === Number(params.id)));
      } catch {
        setError("Lỗi tải dữ liệu.");
        setLoading(false);
        return;
      }

      try {
        const historyRes = await getPriceHistory(params.id);
        setPriceHistory(historyRes.data);
      } catch (e) {
        console.warn("Price history unavailable:", e.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.id]);

  // Week change badge values
  const weekChangePercent = priceHistory?.weekChangePercent ?? null;
  const weekChangeTrend = priceHistory?.weekChangeTrend ?? "stable";

  const weekBadgeStyle = {
    down: { bg: "bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-700/40", text: "text-emerald-700 dark:text-emerald-400", icon: "▼" },
    up:   { bg: "bg-rose-50 dark:bg-rose-900/30 border-rose-200 dark:border-rose-700/40",           text: "text-rose-700 dark:text-rose-400",     icon: "▲" },
    stable: { bg: "bg-zinc-100 dark:bg-zinc-800/60 border-zinc-300 dark:border-zinc-700/40",        text: "text-zinc-500 dark:text-zinc-400",   icon: "→" },
  };
  const badge = weekBadgeStyle[weekChangeTrend] || weekBadgeStyle.stable;

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 py-10 px-4 sm:px-6 lg:px-8 text-zinc-800 dark:text-zinc-200">
      <div className="max-w-6xl mx-auto">
        {loading && <DetailSkeleton />}

        {!loading && !error && product && (
          <div className="space-y-8">

            {/* ── TOP SECTION: Image + Product Info ── */}
            <div className="flex flex-col lg:flex-row gap-10 lg:gap-14">

              {/* Left: Image */}
              <div className="w-full lg:w-5/12 shrink-0">
                <div className="sticky top-24 aspect-square bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 shadow-xl dark:shadow-2xl flex items-center justify-center p-8 overflow-hidden group">
                  <Image
                    src={product?.image_url}
                    alt={product?.name}
                    fill
                    className="object-contain p-10 transition-transform duration-500 group-hover:scale-105"
                    priority
                  />
                </div>
              </div>

              {/* Right: Info */}
              <div className="w-full lg:w-7/12 flex flex-col pt-2">
                <button
                  onClick={() => router.back()}
                  className="self-start mb-6 flex items-center gap-2 text-zinc-500 dark:text-zinc-500 hover:text-violet-600 dark:hover:text-violet-400 font-medium transition-colors group text-sm"
                >
                  <svg className="w-4 h-4 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Quay lại
                </button>

                {/* Brand + Category */}
                <div className="flex items-center gap-2 mb-4">
                  <span className="text-xs font-bold text-white bg-gradient-to-r from-violet-600 to-violet-500 shadow-lg px-3 py-1 rounded-full uppercase tracking-widest">
                    {product?.brand}
                  </span>
                  {product?.category && (
                    <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-700">
                      {product.category}
                    </span>
                  )}
                </div>

                <h1 className="text-3xl sm:text-4xl font-extrabold text-zinc-900 dark:text-white mb-6 leading-tight tracking-tight">
                  {product?.name}
                </h1>

                {/* Current Lowest Price + Week Change Badge */}
                <div className="mb-8">
                  <p className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">
                    Giá thấp nhất hiện tại
                  </p>
                  <div className="flex items-center flex-wrap gap-3">
                    <span className="text-4xl font-black text-violet-600 dark:text-violet-400 tracking-tight">
                      {formatPrice(product?.current_price)}
                    </span>
                    {weekChangePercent !== null && (
                      <span
                        className={`flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border ${badge.bg} ${badge.text}`}
                      >
                        <span>{badge.icon}</span>
                        <span>
                          {weekChangePercent > 0 ? "+" : ""}
                          {weekChangePercent}% tuần trước
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row flex-wrap gap-3 pb-8 border-b border-zinc-200 dark:border-zinc-800">
                  <div className="flex-[2] min-w-[180px]">
                    <MinPriceBox productId={params.id} />
                  </div>
                  <button
                    onClick={() => setShowAlertForm(true)}
                    className="flex-1 min-w-[110px] px-4 py-3 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-200 font-semibold text-sm rounded-xl hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 transition-all flex items-center justify-center gap-2 shadow-sm"
                  >
                    <svg className="w-4 h-4 text-orange-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                    <span className="whitespace-nowrap">Theo dõi</span>
                  </button>
                  <button
                    onClick={handleWishlistClick}
                    className={`flex-1 min-w-[110px] px-4 py-3 font-semibold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border ${
                      isInWishlist
                        ? "bg-rose-900/20 text-rose-400 border-rose-800/50 hover:bg-rose-900/30"
                        : "bg-violet-600 text-white border-transparent hover:bg-violet-700 shadow-lg shadow-violet-900/30"
                    }`}
                  >
                    <ShoppingBasket className={`w-4 h-4 shrink-0 ${isInWishlist ? "text-rose-400" : "text-red-300"}`} fill={isInWishlist ? "currentColor" : "none"} strokeWidth={isInWishlist ? 1 : 2} />
                    <span className="whitespace-nowrap">{isInWishlist ? "Đã lưu" : "Wishlist"}</span>
                  </button>
                </div>

                {wishlistMessage && (
                  <p className="mt-4 text-sm font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/40">
                    {wishlistMessage}
                  </p>
                )}
              </div>
            </div>

            {/* ── BOTTOM SECTION: Price Comparison + Chart (2 columns) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">

              {/* LEFT: Price Comparison */}
              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6 shadow-sm dark:shadow-none">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  So sánh giá
                </h2>
                <div className="space-y-3">
                  {comparison?.map((data, index) => {
                    let domain = "";
                    try { domain = new URL(data?.url).hostname; } catch {}
                    const logoSrc = domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=128` : null;
                    const rName = data?.name?.toLowerCase() || "";

                    return (
                      <div
                        key={index}
                        className="flex items-center justify-between gap-4 p-4 bg-zinc-50 dark:bg-zinc-900 rounded-xl border border-zinc-200 dark:border-zinc-800 hover:border-violet-400 dark:hover:border-violet-600/50 transition-all group"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center font-bold text-zinc-400 text-[10px] shrink-0 overflow-hidden">
                            {logoSrc ? (
                              <img src={logoSrc} alt={data?.name} className="w-7 h-7 object-contain" />
                            ) : (
                              rName.includes("fpt") ? "FPT" :
                              rName.includes("tgdd") || rName.includes("di động") ? "TGDD" :
                              rName.includes("cellphone") ? "CPS" :
                              data?.name?.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wide truncate">{data?.name}</p>
                            <p className="text-base font-black text-violet-600 dark:text-violet-400">{formatPrice(data?.price)}</p>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-600 mt-0.5">{formatPriceUpdateTime(data?.current_price_at)}</p>
                          </div>
                        </div>
                        <button
                          onClick={() => window.open(data?.url, "_blank")}
                          className="shrink-0 px-3 py-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-bold text-xs rounded-lg hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/20 hover:text-violet-700 dark:hover:text-violet-300 transition-all flex items-center gap-1.5"
                        >
                          Mua
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* RIGHT: 1-Week Price History Table */}
              <div className="bg-white dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800/60 rounded-2xl p-6 shadow-sm dark:shadow-none">
                <h2 className="text-base font-bold text-zinc-900 dark:text-white mb-5 flex items-center gap-2.5">
                  <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                  </svg>
                  Lịch sử giá 7 ngày qua
                </h2>
                <PriceHistoryChart productId={params.id} />
              </div>

            </div>
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-20 text-zinc-400 dark:text-zinc-500">{error}</div>
        )}
      </div>

      {/* ── Modal Price Alert ── */}
      {showAlertForm && product && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/70 dark:bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="p-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Tạo Cảnh Báo Giá</h2>
                <button onClick={() => setShowAlertForm(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 dark:text-zinc-500 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="mb-6 flex items-center gap-3 p-3 bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800/30">
                <img src={product.image_url} alt="" className="w-10 h-10 object-contain rounded-lg bg-zinc-800 p-1" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-zinc-800 dark:text-zinc-200 truncate text-sm">{product.name}</p>
                  <p className="text-violet-600 dark:text-violet-400 font-bold text-sm">{formatPrice(product.current_price)}</p>
                </div>
              </div>
              <form onSubmit={handlePriceAlertSubmit} className="space-y-5">
                <div>
                  <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Giá mong muốn (đ)</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={alertTarget}
                    onChange={(e) => setAlertTarget(formatPriceInput(e.target.value))}
                    placeholder={`Thấp hơn ${formatPrice(product.current_price)}`}
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none font-bold transition-all"
                    autoFocus
                  />
                  {alertTarget && parsePriceInput(alertTarget) > 0 && (
                    <p className={`mt-2 text-xs font-bold ${parsePriceInput(alertTarget) < product.current_price ? "text-emerald-400" : "text-rose-400"}`}>
                      {parsePriceInput(alertTarget) < product.current_price
                        ? `✓ Tiết kiệm được ${formatPrice(product.current_price - parsePriceInput(alertTarget))}`
                        : `! Phải thấp hơn ${formatPrice(product.current_price)}`}
                    </p>
                  )}
                  {alertError && <p className="mt-2 text-xs text-rose-400 font-semibold">{alertError}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest mb-2">Ghi chú</label>
                  <input
                    type="text"
                    value={alertNote}
                    onChange={(e) => setAlertNote(e.target.value)}
                    placeholder="Ví dụ: Quà sinh nhật..."
                    className="w-full px-4 py-3 rounded-xl border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none transition-all"
                  />
                </div>
                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowAlertForm(false)} className="flex-1 py-3 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Hủy</button>
                  <button
                    type="submit"
                    disabled={!alertTarget || parsePriceInput(alertTarget) >= product.current_price}
                    className="flex-[2] py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 disabled:bg-zinc-200 dark:disabled:bg-zinc-800 disabled:text-zinc-400 dark:disabled:text-zinc-500 shadow-lg shadow-violet-200 dark:shadow-violet-900/30 transition-all"
                  >
                    Tạo Alert
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal Confirm Remove Wishlist ── */}
      {showRemoveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-900/70 dark:bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-sm w-full p-6">
            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-2">Bỏ lưu sản phẩm?</h3>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-5">Bạn có chắc chắn muốn bỏ lưu sản phẩm này?</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRemoveConfirm(false)} className="flex-1 py-3 bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-bold rounded-xl hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">Không</button>
              <button onClick={removeFromWishlistFn} className="flex-1 py-3 bg-rose-600 text-white font-bold rounded-xl hover:bg-rose-700 transition-colors">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
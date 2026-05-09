"use client";

import { useMemo, useState, useEffect } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import ProductSearch from "../../components/ui/ProductSearch";
import { cn, ui } from "../../components/ui/designSystem";
import { formatPrice, formatPriceInput, parsePriceInput } from "../utils/format";

const fetcher = (url) => axios.get(url).then((res) => res.data);

export default function AlertsPage() {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [showTriggeredModal, setShowTriggeredModal] = useState(false);

  // Auto-fetch alerts every 5 seconds
  const { data: alertsData, isLoading: alertsLoading } = useSWR(
    "/api/price-alert?status=all",
    fetcher,
    {
      refreshInterval: 5000, // Auto-refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // Auto-fetch triggered alerts every 5 seconds
  const { data: triggeredData } = useSWR(
    "/api/price-alert?action=check-triggers",
    fetcher,
    {
      refreshInterval: 5000, // Auto-refresh every 5 seconds
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  const alerts = alertsData?.data || [];
  const triggeredAlerts = triggeredData?.details?.filter((item) => item.triggered) || [];
  const loading = alertsLoading;

  // Auto-show modal when alerts are triggered
  useEffect(() => {
    if (triggeredAlerts.length > 0) {
      setShowTriggeredModal(true);
    }
  }, [triggeredAlerts]);

  const activeCount = useMemo(() => {
    return alerts.filter((item) => item.status === "active").length;
  }, [alerts]);

  const submitAlert = async (event) => {
    event.preventDefault();
    const target = parsePriceInput(targetPrice);

    if (!selectedProduct || !target || target <= 0) {
      setMessage("Vui lòng chọn sản phẩm và nhập mức giá hợp lệ.");
      return;
    }

    try {
      const response = await axios.post("/api/price-alert", {
        productId: selectedProduct.id,
        targetPrice: target,
        note: note.trim() || null,
      });

      if (response.status === 201) {
        setMessage("Đã tạo price alert mới.");
        setSelectedProduct(null);
        setTargetPrice("");
        setNote("");
        setTimeout(() => setMessage(""), 3000);
        
        // Revalidate both endpoints
        mutate("/api/price-alert?status=all");
        mutate("/api/price-alert?action=check-triggers");
      }
    } catch (error) {
      setMessage(error.response?.data?.error || "Không thể tạo alert. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const toggleAlert = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await axios.put("/api/price-alert", {
        alertId: id,
        status: newStatus,
      });
      
      // Revalidate both endpoints
      mutate("/api/price-alert?status=all");
      mutate("/api/price-alert?action=check-triggers");
    } catch (error) {
      setMessage("Không thể cập nhật alert. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const removeAlert = async (id) => {
    try {
      await axios.delete("/api/price-alert", {
        data: { alertId: id },
      });
      setMessage("Đã xóa alert.");
      setTimeout(() => setMessage(""), 3000);
      
      // Revalidate both endpoints
      mutate("/api/price-alert?status=all");
      mutate("/api/price-alert?action=check-triggers");
    } catch (error) {
      setMessage("Không thể xóa alert. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleProductClick = (productId) => {
    router.push(`/product/${productId}`);
  };

  const handleCloseTriggeredModal = () => {
    setShowTriggeredModal(false);
    // Revalidate to update status
    mutate("/api/price-alert?status=all");
    mutate("/api/price-alert?action=check-triggers");
  };

  return (
    <div className={cn(ui.pageWrap, "py-10")}>
      {/* Triggered Alerts Modal */}
      {showTriggeredModal && triggeredAlerts.length > 0 && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className={cn(ui.card, "w-full max-w-2xl space-y-6 p-8 shadow-2xl")}>
            {/* Header */}
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30">
                  <span className="text-lg">🎉</span>
                </div>
                <h2 className={cn(ui.heading, "text-2xl font-black")}>Giá hiện tại đã đạt mục tiêu!</h2>
              </div>
              <p className={cn(ui.mutedText, "text-sm")}>
                {triggeredAlerts.length} sản phẩm trong danh sách price alert của bạn đã đạt giá mong muốn
              </p>
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700" />

            {/* Triggered Products List */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {triggeredAlerts.map((alert, index) => (
                <button
                  key={alert.alertId}
                  onClick={() => {
                    handleProductClick(alert.productId);
                    setShowTriggeredModal(false);
                  }}
                  className={cn(
                    "group w-full rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 to-violet-50/50 p-4 text-left transition-all hover:border-emerald-300 hover:shadow-lg dark:border-emerald-900/40 dark:from-emerald-900/20 dark:to-violet-900/10 dark:hover:shadow-emerald-900/30"
                  )}
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-lg font-bold text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                      {index + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-zinc-900 dark:text-zinc-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition">
                        {alert.productName}
                      </p>
                      <p className={cn(ui.mutedText, "text-sm")}>
                        {alert.brand} • Giá hiện tại: {formatPrice(alert.currentPrice)}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
                        Triggered
                      </span>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">
                        Mục tiêu: {formatPrice(alert.targetPrice)}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Divider */}
            <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent dark:via-zinc-700" />

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleCloseTriggeredModal()}
                className={cn(ui.secondaryButton, "flex-1")}
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  handleCloseTriggeredModal();
                  mutate("/api/price-alert?status=all");
                  mutate("/api/price-alert?action=check-triggers");
                }}
                className={cn(ui.primaryButton, "flex-1")}
              >
                Cập nhật Alerts
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={cn(ui.container, "space-y-6")}>
        <header className={cn(ui.card, "p-6 md:p-8")}>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Alert Center</p>
          <h1 className={cn(ui.heading, "mt-3 text-3xl font-black sm:text-4xl")}>Set Price Alert</h1>
          <p className={cn(ui.mutedText, "mt-3")}>Tạo cảnh báo khi giá sản phẩm giảm về mức bạn mong muốn.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {alerts.filter((item) => item.status === "active").length} alert đang bật
            </span>
            {triggeredAlerts.length > 0 && (
              <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 animate-pulse">
                🔔 {triggeredAlerts.length} có thay đổi giá
              </span>
            )}
          </div>
        </header>

        <section className={cn(ui.card, "grid gap-6 p-6 md:grid-cols-5 md:p-8")}>
          <form onSubmit={submitAlert} className="space-y-4 md:col-span-3">
            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Chọn sản phẩm</label>
              <ProductSearch onSelectProduct={setSelectedProduct} placeholder="Tìm kiếm tên sản phẩm..." />
              {selectedProduct && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-violet-200 bg-violet-50 p-3 dark:border-violet-800 dark:bg-violet-900/20">
                  {selectedProduct.image_url && (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">{selectedProduct.name}</p>
                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{selectedProduct.brand || "N/A"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-zinc-400 hover:text-zinc-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Giá mong muốn (đ)</label>
              <input
                type="text"
                inputMode="numeric"
                value={targetPrice}
                onChange={(e) => setTargetPrice(formatPriceInput(e.target.value))}
                placeholder="Ví dụ: 1.000.000 đ"
                className={cn(
                  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500",
                  ui.ring
                )}
              />
              {targetPrice && parsePriceInput(targetPrice) > 0 ? (
                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Giá mục tiêu: {formatPrice(parsePriceInput(targetPrice))}
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ghi chú (tuỳ chọn)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tai nghe cho đi làm"
                className={cn(
                  "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder-zinc-500",
                  ui.ring
                )}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button type="submit" className={cn(ui.primaryButton, ui.ring)}>
                Tạo alert
              </button>
              {message && <span className="text-sm font-medium text-zinc-500">{message}</span>}
            </div>
          </form>

          <aside className="rounded-2xl border border-zinc-200 bg-zinc-50 p-5 dark:border-zinc-700 dark:bg-zinc-800/50 md:col-span-2">
            <h2 className="text-base font-bold text-zinc-800 dark:text-zinc-200">Cách hoạt động</h2>
            <ul className="mt-3 space-y-2 text-sm text-zinc-600 dark:text-zinc-400">
              <li>1. Tìm kiếm tên sản phẩm chọn từ kết quả.</li>
              <li>2. Nhập giá mục tiêu và lưu alert.</li>
              <li>3. Khi giá thấp hơn ngưỡng, alert sẽ được đánh dấu.</li>
            </ul>
          </aside>
        </section>

        <section className={cn(ui.card, "p-6 md:p-8")}>
          <h2 className="text-xl font-bold text-zinc-900 dark:text-white">Danh sách alerts</h2>
          {loading ? (
            <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-20 animate-pulse rounded-2xl bg-zinc-100" />
              ))}
            </div>
          ) : alerts.length === 0 ? (
            <p className={cn(ui.mutedText, "mt-3")}>Chưa có alert nào. Hãy tạo alert đầu tiên của bạn.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {alerts.map((item) => (
                <article
                  key={item.id}
                  className={cn(
                    "rounded-2xl border p-4 transition-colors",
                    item.status === "triggered"
                      ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10"
                      : item.status === "active"
                      ? "border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800/80"
                      : "border-zinc-200 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/40"
                  )}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-zinc-900 dark:text-zinc-200">
                          {item.name || `Product #${item.product_id}`}
                        </p>
                        {item.status === "triggered" && (
                          <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        )}
                      </div>
                      <p className={cn("text-sm", item.status === "triggered" ? "text-emerald-700 dark:text-emerald-400 font-semibold" : "text-zinc-600 dark:text-zinc-400")}>
                        Target: {formatPrice(item.target_price)} {item.status === "triggered" && "✓ Đã đạt"}
                      </p>
                      {item.note ? <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-500">{item.note}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAlert(item.id, item.status)}
                        className={cn(
                          "rounded-lg px-3 py-1 text-xs font-semibold transition",
                          item.status === "active"
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:hover:bg-emerald-900/50"
                            : item.status === "triggered"
                            ? "bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:hover:bg-amber-900/50"
                            : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-600"
                        )}
                      >
                        {item.status === "active" ? "Active" : item.status === "triggered" ? "Triggered" : "Paused"}
                      </button>
                      <button
                        onClick={() => removeAlert(item.id)}
                        className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400 dark:hover:bg-rose-900/50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState, useEffect } from "react";
import {
  getAlerts,
  checkTriggeredAlerts,
  createAlert,
  updateAlertStatus,
  deleteAlert,
} from "@/lib/apiClient";
import { useRouter } from "next/navigation";
import useSWR, { mutate } from "swr";
import ProductSearch from "../../components/ui/ProductSearch";
import { cn, ui } from "../../components/ui/designSystem";
import { formatPrice, formatPriceInput, parsePriceInput } from "../utils/format";
import { Bell, Activity, Flame } from "lucide-react";

const alertsFetcher = () => getAlerts().then((res) => res.data);
const triggersFetcher = () => checkTriggeredAlerts().then((res) => res.data);

export default function AlertsPage() {
  const router = useRouter();
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [showTriggeredModal, setShowTriggeredModal] = useState(false);

  // Auto-fetch alerts every 5 seconds
  const { data: alertsData, isLoading: alertsLoading } = useSWR(
    "alerts",
    alertsFetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // Auto-fetch triggered alerts every 5 seconds
  const { data: triggeredData } = useSWR(
    "alerts-triggers",
    triggersFetcher,
    {
      refreshInterval: 5000,
      revalidateOnFocus: true,
      revalidateOnReconnect: true,
      dedupingInterval: 2000,
    }
  );

  // Set of alertIds mà giá thực tế đang <= target (real-time, không phụ thuộc DB status)
  const triggeredAlerts = triggeredData?.details?.filter((item) => item.triggered) || [];
  const triggeredAlertIds = useMemo(
    () => new Set(triggeredAlerts.map((a) => a.alertId)),
    [triggeredAlerts]
  );

  // Sort: triggered (real-time) lên đầu → active → inactive
  const alerts = useMemo(() => {
    const raw = alertsData?.data || [];
    return [...raw].sort((a, b) => {
      const aTriggered = triggeredAlertIds.has(a.id) ? 0 : 1;
      const bTriggered = triggeredAlertIds.has(b.id) ? 0 : 1;
      if (aTriggered !== bTriggered) return aTriggered - bTriggered;
      // Fallback: active trước inactive
      const STATUS_ORDER = { active: 0, triggered: 0, inactive: 1 };
      return (STATUS_ORDER[a.status] ?? 9) - (STATUS_ORDER[b.status] ?? 9);
    });
  }, [alertsData, triggeredAlertIds]);
  const loading = alertsLoading;

  // ─── Modal: chỉ hiện 1 lần cho mỗi tập alert triggered mới ───────────────
  // Dùng sessionStorage để nhớ các alertId đã bị dismiss trong session này
  const getDismissedIds = () => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem("dismissedTriggeredAlerts") || "[]"));
    } catch {
      return new Set();
    }
  };

  // Auto-show modal chỉ khi có alert triggered MỚI (chưa từng dismiss)
  useEffect(() => {
    if (triggeredAlerts.length === 0) return;
    const dismissed = getDismissedIds();
    const hasNew = triggeredAlerts.some((a) => !dismissed.has(a.alertId));
    if (hasNew) {
      setShowTriggeredModal(true);
    }
  }, [triggeredAlerts.map((a) => a.alertId).join(",")]);

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
      const response = await createAlert(
        selectedProduct.id,
        target,
        note.trim() || null
      );

      if (response.status === 201) {
        setMessage("Đã tạo price alert mới.");
        setSelectedProduct(null);
        setTargetPrice("");
        setNote("");
        setTimeout(() => setMessage(""), 3000);
        mutate("alerts");
        mutate("alerts-triggers");
      }
    } catch (error) {
      setMessage(error.response?.data?.error || "Không thể tạo alert. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const toggleAlert = async (id, currentStatus) => {
    const newStatus = currentStatus === "active" ? "inactive" : "active";
    try {
      await updateAlertStatus(id, newStatus);
      mutate("alerts");
      mutate("alerts-triggers");
    } catch (error) {
      setMessage("Không thể cập nhật alert. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const removeAlert = async (id) => {
    try {
      await deleteAlert(id);
      setMessage("Đã xóa alert.");
      setTimeout(() => setMessage(""), 3000);
      mutate("alerts");
      mutate("alerts-triggers");
    } catch (error) {
      setMessage("Không thể xóa alert. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const handleProductClick = (productId) => {
    router.push(`/product/${productId}`);
  };

  const handleCloseTriggeredModal = () => {
    // Ghi nhớ các alertId đã dismiss để không pop lại
    const currentIds = triggeredAlerts.map((a) => a.alertId);
    const dismissed = getDismissedIds();
    currentIds.forEach((id) => dismissed.add(id));
    sessionStorage.setItem("dismissedTriggeredAlerts", JSON.stringify([...dismissed]));

    setShowTriggeredModal(false);
    mutate("alerts");
    mutate("alerts-triggers");
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
                  mutate("alerts");
                  mutate("alerts-triggers");
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
        {/* Header Section */}
        <header className={cn(ui.card, "p-8 md:p-10 relative overflow-hidden")}>
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                  Alert Center
                </p>
              </div>
              <h1 className={cn(ui.heading, "text-3xl font-black sm:text-5xl tracking-tight")}>
                Price Alerts
              </h1>
              <p className={cn(ui.mutedText, "mt-4 max-w-xl text-base")}>
                Tạo cảnh báo tự động khi giá sản phẩm giảm về mức bạn mong muốn. Không bao giờ bỏ lỡ deal tốt.
              </p>
            </div>
            
            {/* Statistics */}
            <div className="flex gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-w-[120px]">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                  <Activity className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Đang bật</span>
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                  {loading ? "-" : activeCount}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-w-[140px] relative overflow-hidden group">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                  <Flame className="w-4 h-4 group-hover:text-amber-500 transition-colors" />
                  <span className="text-xs font-bold uppercase tracking-wider">Đạt mục tiêu</span>
                </div>
                <p className={cn("text-2xl font-black", triggeredAlerts.length > 0 ? "text-amber-500" : "text-zinc-900 dark:text-white")}>
                  {loading ? "-" : triggeredAlerts.length}
                </p>
                {triggeredAlerts.length > 0 && (
                  <span className="absolute -bottom-4 -right-4 text-6xl opacity-10">🔥</span>
                )}
              </div>
            </div>
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
                className={ui.input}
              />
              {targetPrice && parsePriceInput(targetPrice) > 0 ? (
                <p className="mt-2 text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  Giá mục tiêu: <span className="font-bold text-violet-600 dark:text-violet-400">{formatPrice(parsePriceInput(targetPrice))}</span>
                </p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-zinc-700 dark:text-zinc-300">Ghi chú (tuỳ chọn)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Ví dụ: Mua làm quà tặng..."
                className={ui.input}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button type="submit" className={cn(ui.primaryButton, "w-full md:w-auto")}>
                Tạo Alert
              </button>
              {message && <span className="text-sm font-medium text-rose-500 dark:text-rose-400">{message}</span>}
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
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {alerts.map((item) => {
                // isTriggered: dựa vào giá thực tế, không phụ thuộc DB status
                const isTriggered = triggeredAlertIds.has(item.id);
                return (
                <article
                  key={item.id}
                  className={cn(
                    ui.card,
                    ui.cardHover,
                    "overflow-hidden flex flex-col relative group",
                    isTriggered && "ring-2 ring-emerald-500 shadow-emerald-500/20 shadow-xl"
                  )}
                >
                  <div className="flex items-start gap-4 p-5 cursor-pointer" onClick={() => handleProductClick(item.product_id)}>
                    {item.image_url ? (
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-white p-1 border border-zinc-100 dark:border-zinc-800 dark:bg-zinc-800 overflow-hidden">
                        <img src={item.image_url} alt={item.name} className="h-full w-full object-contain mix-blend-multiply dark:mix-blend-normal" />
                      </div>
                    ) : (
                      <div className="h-16 w-16 shrink-0 rounded-xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <span className="text-xl">📦</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate group-hover:text-violet-600 transition-colors">
                        {item.name || `Product #${item.product_id}`}
                      </h3>
                      <p className={cn(ui.mutedText, "text-xs mt-1 truncate")}>
                        {item.brand || "N/A"}
                        {item.created_at && (
                          <> • <span className="opacity-75">Tạo ngày {new Date(item.created_at).toLocaleDateString("vi-VN")}</span></>
                        )}
                      </p>
                      
                      <div className="mt-3 flex items-center gap-2">
                        <span className={cn(
                          "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                          isTriggered
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : item.status === "active"
                            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                            : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                        )}>
                          {isTriggered && <span className="mr-1 h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>}
                          {isTriggered ? "ĐÃ ĐẠT MỤC TIÊU" : item.status === "active" ? "ĐANG BẬT" : "TẠM DỪNG"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-zinc-50/50 dark:bg-zinc-900/50 p-5 border-t border-zinc-100 dark:border-zinc-800 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Giá hiện tại</span>
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">{formatPrice(item.latest_price)}</span>
                      </div>
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400">Mục tiêu</span>
                        <span className={cn("text-sm font-bold", isTriggered ? "text-emerald-600 dark:text-emerald-400" : "text-violet-600 dark:text-violet-400")}>
                          {formatPrice(item.target_price)}
                        </span>
                      </div>
                      {item.note && (
                        <p className="mt-3 text-xs text-zinc-500 dark:text-zinc-400 border-l-2 border-zinc-200 dark:border-zinc-700 pl-2 italic">
                          "{item.note}"
                        </p>
                      )}
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50 flex gap-2">
                      <button
                        onClick={() => toggleAlert(item.id, item.status)}
                        className={cn(ui.ghostButton, "flex-1 py-2 text-xs")}
                      >
                        {item.status === "active" ? "Tạm dừng" : item.status === "triggered" ? "Kích hoạt lại" : "Kích hoạt"}
                      </button>
                      <button
                        onClick={() => removeAlert(item.id)}
                        className={cn(ui.ghostButton, "flex-1 py-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20")}
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

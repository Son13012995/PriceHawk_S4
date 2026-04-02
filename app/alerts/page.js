"use client";

import { useEffect, useMemo, useState } from "react";
import ProductSearch from "../../components/ui/ProductSearch";
import { cn, ui } from "../../components/ui/designSystem";

const STORAGE_KEY = "budspot:price-alerts";

function loadAlerts() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

export default function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [targetPrice, setTargetPrice] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setAlerts(loadAlerts());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    }
  }, [alerts]);

  const activeCount = useMemo(() => alerts.filter((item) => item.active).length, [alerts]);

  const submitAlert = (event) => {
    event.preventDefault();
    const target = Number(targetPrice);

    if (!selectedProduct || !target || target <= 0) {
      setMessage("Vui lòng chọn sản phẩm và nhập mức giá hợp lệ.");
      return;
    }

    const nextAlert = {
      id: `${selectedProduct.id}-${Date.now()}`,
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      targetPrice: target,
      note: note.trim(),
      active: true,
      createdAt: new Date().toISOString(),
    };

    setAlerts((prev) => [nextAlert, ...prev]);
    setSelectedProduct(null);
    setTargetPrice("");
    setNote("");
    setMessage("Đã tạo price alert mới.");
  };

  const toggleAlert = (id) => {
    setAlerts((prev) =>
      prev.map((item) => (item.id === id ? { ...item, active: !item.active } : item))
    );
  };

  const removeAlert = (id) => {
    setAlerts((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className={cn(ui.pageWrap, "py-10")}> 
      <div className={cn(ui.container, "space-y-6")}> 
        <header className={cn(ui.card, "p-6 md:p-8")}> 
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Alert Center</p>
          <h1 className={cn(ui.heading, "mt-3 text-3xl font-black sm:text-4xl")}>Set Price Alert</h1>
          <p className={cn(ui.mutedText, "mt-3")}>Tạo cảnh báo khi giá sản phẩm giảm về mức bạn mong muốn.</p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
              {activeCount} alert đang bật
            </span>
          </div>
        </header>

        <section className={cn(ui.card, "grid gap-6 p-6 md:grid-cols-5 md:p-8")}> 
          <form onSubmit={submitAlert} className="md:col-span-3 space-y-4">
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Chọn sản phẩm</label>
              <ProductSearch
                onSelectProduct={setSelectedProduct}
                placeholder="Tìm kiếm tên sản phẩm..."
              />
              {selectedProduct && (
                <div className="mt-2 flex items-center gap-2 rounded-lg bg-cyan-50 p-3 border border-cyan-200">
                  {selectedProduct.image_url && (
                    <img
                      src={selectedProduct.image_url}
                      alt={selectedProduct.name}
                      className="h-8 w-8 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{selectedProduct.name}</p>
                    <p className="text-xs text-slate-600">{selectedProduct.brand || "N/A"}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedProduct(null)}
                    className="text-slate-400 hover:text-slate-600"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Target Price</label>
              <input
                type="number"
                min="1"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Ví dụ: 99"
                className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5", ui.ring)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-semibold text-slate-700">Ghi chú (tuỳ chọn)</label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Tai nghe cho đi làm"
                className={cn("w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5", ui.ring)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <button type="submit" className={cn(ui.primaryButton, ui.ring)}>Tạo alert</button>
              {message && <span className="text-sm font-medium text-slate-500">{message}</span>}
            </div>
          </form>

          <aside className="md:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h2 className="text-base font-bold text-slate-800">Cách hoạt động</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li>1. Tìm kiếm tên sản phẩm chọn từ kết quả.</li>
              <li>2. Nhập giá mục tiêu và lưu alert.</li>
              <li>3. Khi giá thấp hơn ngưỡng, alert sẽ được đánh dấu.</li>
            </ul>
          </aside>
        </section>

        <section className={cn(ui.card, "p-6 md:p-8")}> 
          <h2 className="text-xl font-bold text-slate-900">Danh sách alerts</h2>
          {alerts.length === 0 ? (
            <p className={cn(ui.mutedText, "mt-3")}>Chưa có alert nào. Hãy tạo alert đầu tiên của bạn.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {alerts.map((item) => (
                <article key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold text-slate-900">{item.productName || `Product #${item.productId}`}</p>
                      <p className="text-sm text-slate-600">Target: £{item.targetPrice}</p>
                      {item.note ? <p className="text-xs text-slate-500 mt-1">{item.note}</p> : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => toggleAlert(item.id)}
                        className={cn(
                          "rounded-lg px-3 py-1 text-xs font-semibold",
                          item.active
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                        )}
                      >
                        {item.active ? "Active" : "Paused"}
                      </button>
                      <button
                        onClick={() => removeAlert(item.id)}
                        className="rounded-lg bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-200"
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

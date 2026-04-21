export function formatPrice(price) {
  const value = Number(price);
  if (!Number.isFinite(value)) return "0 đ";

  return (
    new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 0,
    }).format(value) + " đ"
  );
}

export function formatPriceInput(rawValue) {
  const digits = String(rawValue ?? "").replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(Number(digits));
}

export function parsePriceInput(value) {
  const digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return 0;
  return Number(digits);
}

export function formatPriceUpdateTime(timestamp) {
  if (!timestamp) return "Chưa cập nhật";

  const updatedAt = new Date(timestamp);
  if (Number.isNaN(updatedAt.getTime())) {
    return "Chưa cập nhật";
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(updatedAt);
}
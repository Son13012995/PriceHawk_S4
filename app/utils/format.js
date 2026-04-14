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
  if (!timestamp) return "Chua co du lieu cap nhat";

  const updatedAt = new Date(timestamp);
  if (Number.isNaN(updatedAt.getTime())) {
    return "Chua co du lieu cap nhat";
  }

  const now = new Date();
  const isSameDay =
    updatedAt.getDate() === now.getDate() &&
    updatedAt.getMonth() === now.getMonth() &&
    updatedAt.getFullYear() === now.getFullYear();

  if (isSameDay) {
    const diffMs = now.getTime() - updatedAt.getTime();
    const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

    if (diffMinutes < 1) return "vua xong";
    if (diffMinutes < 60) return `${diffMinutes} phut truoc`;

    const diffHours = Math.floor(diffMinutes / 60);
    return `${diffHours} gio truoc`;
  }

  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(updatedAt);
}
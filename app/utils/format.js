export function formatPrice(price) {
  if (price == null) return "0 ₫";
  return new Intl.NumberFormat("vi-VN").format(price) + " ₫";
}
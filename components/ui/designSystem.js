// PriceHawk S4 — Design System v2 "Phantom Intelligence"
// Cập nhật: 07/05/2026

export const pageTabs = [
  { label: "Products", href: "/product" },
  { label: "Price Alerts", href: "/alerts" },
  { label: "Wishlist", href: "/wishlist" },
];

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export const ui = {
  // Layout
  pageWrap: "min-h-screen bg-zinc-50 dark:bg-zinc-950",
  container: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",

  // Card
  card: [
    "rounded-2xl border border-zinc-200 dark:border-zinc-800",
    "bg-white dark:bg-zinc-900",
    "shadow-sm transition-all duration-200",
  ].join(" "),

  cardHover: [
    "hover:border-violet-300 dark:hover:border-violet-800",
    "hover:shadow-lg hover:shadow-violet-500/10",
  ].join(" "),

  // Typography
  heading: "text-zinc-900 dark:text-zinc-50 tracking-tight",
  mutedText: "text-zinc-500 dark:text-zinc-400",

  // Price — CHỈ dùng cho số tiền
  price: "tabular-nums text-amber-600 dark:text-amber-400",

  // Focus ring
  ring: [
    "focus-visible:outline-none focus-visible:ring-2",
    "focus-visible:ring-violet-500/50 focus-visible:ring-offset-2",
    "focus-visible:ring-offset-white dark:focus-visible:ring-offset-zinc-950",
  ].join(" "),

  // Buttons
  primaryButton: [
    "inline-flex items-center justify-center",
    "rounded-lg bg-violet-600 dark:bg-violet-500",
    "px-4 py-2.5 text-sm font-semibold text-white",
    "hover:bg-violet-700 dark:hover:bg-violet-400",
    "hover:scale-[1.02] active:scale-[0.98]",
    "transition-all duration-200",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/50",
  ].join(" "),

  secondaryButton: [
    "inline-flex items-center justify-center",
    "rounded-lg border border-zinc-200 dark:border-zinc-700",
    "bg-white dark:bg-zinc-900",
    "px-4 py-2.5 text-sm font-semibold",
    "text-zinc-700 dark:text-zinc-300",
    "hover:bg-zinc-50 dark:hover:bg-zinc-800",
    "transition-all duration-200",
  ].join(" "),

  ghostButton: [
    "inline-flex items-center justify-center",
    "rounded-lg px-4 py-2.5 text-sm font-semibold",
    "text-zinc-600 dark:text-zinc-400",
    "hover:bg-zinc-100 dark:hover:bg-zinc-800",
    "transition-all duration-200",
  ].join(" "),

  // Input
  input: [
    "w-full rounded-xl border border-zinc-300 dark:border-zinc-700",
    "bg-zinc-50 dark:bg-zinc-900",
    "px-4 py-2.5 text-sm",
    "text-zinc-900 dark:text-zinc-50",
    "placeholder:text-zinc-400 dark:placeholder:text-zinc-600",
    "focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20",
    "transition-all duration-200",
  ].join(" "),
};

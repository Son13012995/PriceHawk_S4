export const pageTabs = [
  { label: "Products", href: "/product" },
  { label: "Price Alerts", href: "/alerts" },
  { label: "Wishlist", href: "/wishlist" },
];

export const ui = {
  pageWrap: "min-h-screen bg-[radial-gradient(circle_at_top_right,_#f0f9ff_0%,_#f8fafc_45%,_#ffffff_100%)] dark:bg-slate-950 dark:bg-none",
  container: "mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8",
  card: "rounded-3xl border border-slate-200/70 dark:border-slate-800 bg-white/85 dark:bg-slate-900/80 shadow-sm backdrop-blur",
  ring: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-900",
  heading: "text-slate-900 dark:text-white tracking-tight",
  mutedText: "text-slate-500 dark:text-slate-400",
  primaryButton:
    "inline-flex items-center justify-center rounded-xl bg-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-cyan-700 dark:bg-cyan-700 dark:hover:bg-cyan-600 disabled:cursor-not-allowed disabled:opacity-50",
  secondaryButton:
    "inline-flex items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 transition hover:border-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50",
};

export function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

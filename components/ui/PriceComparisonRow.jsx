"use client";
import { cn, ui } from "@/components/ui/designSystem";
import { formatPrice } from "@/app/utils/format";

export default function PriceComparisonRow({ retailer, faviconUrl, price, isCheapest }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-zinc-100 dark:border-zinc-800 last:border-0">
      <div className="flex items-center gap-3">
        {faviconUrl && (
          <img src={faviconUrl} alt={retailer} className="w-5 h-5 rounded" />
        )}
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          {retailer}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className={cn(
          "text-base font-medium",
          ui.price,
          isCheapest
            ? "text-amber-600 dark:text-amber-400"
            : "text-zinc-600 dark:text-zinc-400"
        )}>
          {formatPrice(price)}
        </span>
        {isCheapest && (
          <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950 px-2 py-1 rounded-full border border-amber-200 dark:border-amber-800">
            Best
          </span>
        )}
      </div>
    </div>
  );
}

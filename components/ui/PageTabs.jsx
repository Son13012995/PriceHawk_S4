"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, pageTabs, ui } from "./designSystem";
import { ShoppingBag, Bell, ShoppingBasket } from "lucide-react";

const icons = {
  "/product": ShoppingBag,
  "/alerts": Bell,
  "/wishlist": ShoppingBasket,
};

function isActive(pathname, href) {
  if (pathname === href) {
    return true;
  }
  if (href !== "/" && pathname.startsWith(`${href}/`)) {
    return true;
  }
  return false;
}

export default function PageTabs({ className = "", badgeCounts = {} }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      {pageTabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        const Icon = icons[tab.href] || ShoppingBag;
        
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "group relative flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-300",
              ui.ring,
              active
                ? "bg-violet-600 text-white shadow-lg shadow-violet-600/20"
                : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-white/5"
            )}
          >
            <span className="relative">
              <Icon className={cn(
                "h-4 w-4 transition-transform duration-300 group-hover:scale-110",
                active ? "text-white" : "text-zinc-400 dark:text-zinc-500 group-hover:text-violet-500"
              )} />
              {badgeCounts[tab.href] > 0 && (
                <span className="absolute -top-2 -right-2 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-extrabold text-white ring-2 ring-white dark:ring-[#0b0712] shadow-sm leading-none">
                  {badgeCounts[tab.href] > 99 ? '99+' : badgeCounts[tab.href]}
                  {tab.href === "/alerts" && <span className="absolute inset-0 rounded-full bg-rose-400 animate-ping opacity-75 -z-10" />}
                </span>
              )}
            </span>
            <span>{tab.label}</span>

            {/* Subtle active indicator for desktop if we want something extra, but the solid background is already good. 
                Let's add a tiny dot or underline for a "premium" feel. */}
            {active && (
              <span className="absolute -bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-violet-400 blur-[1px]" />
            )}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, pageTabs, ui } from "./designSystem";

function isActive(pathname, href) {
  if (pathname === href) {
    return true;
  }
  if (href !== "/" && pathname.startsWith(`${href}/`)) {
    return true;
  }
  return false;
}

export default function PageTabs({ className = "" }) {
  const pathname = usePathname();

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {pageTabs.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200",
              ui.ring,
              active
                ? "bg-violet-600 text-white border border-violet-600"
                : "bg-transparent text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

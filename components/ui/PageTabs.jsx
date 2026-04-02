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
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              ui.ring,
              active
                ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn, ui } from "./designSystem";

export default function AppSearchBar({
  placeholder = "Tìm kiếm sản phẩm...",
  initialValue = "",
  compact = false,
}) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const router = useRouter();

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = searchTerm.trim();
    if (!value) {
      return;
    }
    router.push(`/search/${encodeURIComponent(value)}`);
  };

  return (
    <form onSubmit={handleSubmit} className="relative w-full">
      <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </span>
      <input
        type="search"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 transition",
          compact ? "py-2 text-sm" : "py-3 text-base",
          "focus:border-cyan-500 focus:bg-white",
          ui.ring
        )}
      />
    </form>
  );
}

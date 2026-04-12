"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import { cn, ui } from "./designSystem";

export default function AppSearchBar({
  placeholder = "Tìm kiếm sản phẩm...",
  initialValue = "",
  compact = false,
}) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProducts();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchProducts = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`/api/pagination`, {
        params: { q: searchTerm, pageSize: 5, page: 1 },
      });
      setResults(response.data.data || []);
      setIsOpen(true);
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const value = searchTerm.trim();
    if (!value) {
      return;
    }
    router.push(`/search/${encodeURIComponent(value)}`);
    setIsOpen(false);
  };

  const handleSelectProduct = (product) => {
    router.push(`/product/${product.id}`);
    setSearchTerm("");
    setResults([]);
    setIsOpen(false);
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
        onFocus={() => searchTerm.trim() && setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-full border border-slate-200 bg-slate-50 pl-10 pr-4 text-slate-900 placeholder:text-slate-400 transition dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500",
          compact ? "py-2 text-sm" : "py-3 text-base",
          "focus:border-cyan-500 focus:bg-white dark:focus:border-cyan-500 dark:focus:bg-slate-900",
          ui.ring
        )}
      />

      {isOpen && (results.length > 0 || loading) && (
        <div className={cn(
          "absolute top-full left-0 right-0 z-20 mt-1 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800 dark:shadow-none",
          compact ? "text-sm" : ""
        )}>
          {loading ? (
            <div className="px-4 py-3 text-sm text-slate-500">Đang tìm kiếm...</div>
          ) : results.length > 0 ? (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelectProduct(product)}
                className="w-full flex items-center gap-3 border-b border-slate-100 px-4 py-3 hover:bg-cyan-50 text-left focus:outline-none focus:bg-cyan-50 dark:border-slate-700/50 dark:hover:bg-slate-700/50 dark:focus:bg-slate-700/50"
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-8 w-8 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate dark:text-slate-200">
                    {product.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{product.brand || "N/A"}</p>
                </div>
                {product.price && (
                  <p className="text-sm font-bold text-cyan-600 dark:text-cyan-400">formatPrice(product.price)</p>
                )}
              </button>
            ))
          ) : null}
        </div>
      )}
    </form>
  );
}

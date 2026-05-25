"use client";

import { useEffect, useState } from "react";
import { searchProducts } from "@/lib/apiClient";
import { formatPrice } from "@/app/utils/format";
import { cn, ui } from "./designSystem";

export default function ProductSearch({ onSelectProduct, placeholder = "Tìm kiếm sản phẩm..." }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProductsFn();
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const searchProductsFn = async () => {
    setLoading(true);
    try {
      const response = await searchProducts(query, 1, 5);
      setResults(response.data.data || []);
      setIsOpen(true);
    } catch (error) {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (product) => {
    onSelectProduct(product);
    setQuery("");
    setResults([]);
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onFocus={() => query.trim() && setIsOpen(true)}
        placeholder={placeholder}
        className={cn(
          "w-full rounded-xl border border-zinc-200 bg-white px-4 py-2.5 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:placeholder:text-zinc-500",
          ui.ring
        )}
      />

      {isOpen && (results.length > 0 || loading) && (
        <div className="absolute top-full left-0 right-0 z-10 mt-1 max-h-64 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg dark:border-zinc-700 dark:bg-zinc-800 dark:shadow-none">
          {loading ? (
            <div className="px-4 py-3 text-sm text-zinc-500 dark:text-zinc-400">Đang tìm kiếm...</div>
          ) : results.length > 0 ? (
            results.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => handleSelect(product)}
                className="w-full flex items-center gap-3 border-b border-zinc-100 px-4 py-3 hover:bg-violet-50 text-left focus:outline-none focus:bg-violet-50 dark:border-zinc-700/50 dark:hover:bg-zinc-700/50 dark:focus:bg-zinc-700/50"
              >
                {product.image_url && (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="h-10 w-10 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-200">
                    {product.name}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">{product.brand || "N/A"}</p>
                </div>
                {product.price && (
                  <p className="text-sm font-bold text-amber-600 dark:text-amber-400">{formatPrice(product.price)}</p>
                )}
              </button>
            ))
          ) : null}
        </div>
      )}
    </div>
  );
}

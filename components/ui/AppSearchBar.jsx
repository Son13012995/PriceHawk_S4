"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { searchProducts } from "@/lib/apiClient";
import { formatPrice } from "@/app/utils/format";
import { cn, ui } from "./designSystem";
import { Search, Command } from "lucide-react";

export default function AppSearchBar({
  placeholder = "Tìm kiếm sản phẩm...",
  initialValue = "",
  compact = false,
  onOpenChange,
}) {
  const [searchTerm, setSearchTerm] = useState(initialValue);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef(null);
  const router = useRouter();

  // Handle shortcut
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "/" && document.activeElement.tagName !== "INPUT" && document.activeElement.tagName !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Notify parent of dropdown visibility
  useEffect(() => {
    if (onOpenChange) {
      onOpenChange(isOpen && (results.length > 0 || loading));
    }
  }, [isOpen, results.length, loading, onOpenChange]);

  useEffect(() => {
    if (!searchTerm.trim()) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      searchProductsFn();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchProductsFn = async () => {
    setLoading(true);
    try {
      const response = await searchProducts(searchTerm, 1, 5);
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
    <form onSubmit={handleSubmit} className="relative w-full max-w-sm lg:max-w-md">
      <div className="group relative flex items-center">
        
        <input
          ref={inputRef}
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onFocus={() => searchTerm.trim() && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-4 pr-12 text-zinc-900 placeholder:text-zinc-400 transition-all duration-300 dark:border-white/10 dark:bg-zinc-900/50 dark:text-zinc-50 dark:placeholder:text-zinc-500",
            compact ? "py-2 text-sm" : "py-2.5 text-base",
            "focus:border-violet-500/50 focus:bg-white focus:ring-4 focus:ring-violet-500/10 dark:focus:border-violet-500/50 dark:focus:bg-zinc-900",
            "hover:border-zinc-300 dark:hover:border-white/20",
            ui.ring
          )}
        />
        <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center gap-1">
          <kbd className="hidden sm:flex h-5 select-none items-center gap-1 rounded border border-zinc-200 bg-white px-1.5 font-mono text-[10px] font-medium text-zinc-400 opacity-100 dark:border-zinc-800 dark:bg-zinc-950">
            <span>/</span>
          </kbd>
        </div>
      </div>

      {isOpen && (results.length > 0 || loading) && (
        <div className={cn(
          "absolute top-full left-0 right-0 z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-zinc-200 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-zinc-900/95 dark:shadow-none animate-in fade-in slide-in-from-top-1 duration-200",
          compact ? "text-sm" : ""
        )}>
          {loading ? (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-zinc-500">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
              Đang tìm kiếm...
            </div>
          ) : results.length > 0 ? (
            <div className="p-1.5">
              {results.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => handleSelectProduct(product)}
                  className="w-full flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-violet-50 text-left focus:outline-none focus:bg-violet-50 dark:hover:bg-white/5 dark:focus:bg-white/5 transition-colors group/item"
                >
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-10 w-10 rounded-lg object-cover border border-zinc-100 dark:border-white/10 group-hover/item:scale-105 transition-transform"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                      <Search className="h-4 w-4 text-zinc-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 truncate dark:text-zinc-50 group-hover/item:text-violet-600 dark:group-hover/item:text-violet-400 transition-colors">
                      {product.name}
                    </p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{product.brand || "PriceHawk"}</p>
                  </div>
                  {product.price && (
                    <p className="text-sm font-bold text-violet-600 dark:text-violet-400">{formatPrice(product.price)}</p>
                  )}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}
    </form>
  );
}

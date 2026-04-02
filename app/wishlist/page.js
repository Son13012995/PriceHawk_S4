"use client";

import { useEffect, useState } from "react";
import axios from "axios";
import SearchCard from "../../components/SearchCard";
import ProductSearch from "../../components/ui/ProductSearch";
import { cn, ui } from "../../components/ui/designSystem";

const STORAGE_KEY = "budspot:wishlist";

function loadWishlistIds() {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

export default function WishlistPage() {
  const [ids, setIds] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setIds(loadWishlistIds());
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
    }
  }, [ids]);

  useEffect(() => {
    let mounted = true;

    async function fetchProducts() {
      if (ids.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const requests = ids.map((id) => axios.get(`/api/product`, { params: { id } }));
        const responses = await Promise.all(requests);
        const merged = responses
          .map((res) => (Array.isArray(res.data) ? res.data[0] : null))
          .filter(Boolean);

        if (mounted) {
          setProducts(merged);
        }
      } catch (error) {
        if (mounted) {
          setMessage("Không thể tải đầy đủ wishlist. Vui lòng thử lại.");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    fetchProducts();

    return () => {
      mounted = false;
    };
  }, [ids]);

  const addToWishlist = (product) => {
    const id = String(product.id);
    if (ids.includes(id)) {
      setMessage("Sản phẩm này đã có trong wishlist.");
      return;
    }
    setIds((prev) => [id, ...prev]);
    setMessage("Đã thêm sản phẩm vào wishlist.");
  };

  const removeItem = (id) => {
    setIds((prev) => prev.filter((item) => item !== id));
  };

  return (
    <div className={cn(ui.pageWrap, "py-10")}> 
      <div className={cn(ui.container, "space-y-6")}> 
        <header className={cn(ui.card, "p-6 md:p-8")}> 
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">Saved Items</p>
          <h1 className={cn(ui.heading, "mt-3 text-3xl font-black sm:text-4xl")}>Wishlist</h1>
          <p className={cn(ui.mutedText, "mt-3")}>Giao diện tab tương tự giỏ hàng để lưu và quay lại sản phẩm yêu thích.</p>
        </header>

        <section className={cn(ui.card, "p-6 md:p-8")}> 
          <div className="max-w-md">
            <ProductSearch
              onSelectProduct={addToWishlist}
              placeholder="Tìm kiếm sản phẩm để thêm..."
            />
            {message ? <p className="mt-2 text-sm text-slate-500">{message}</p> : null}
          </div>
        </section>

        <section className={cn(ui.card, "p-6 md:p-8")}> 
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-slate-100" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((item) => (
                <div key={item.id} className="space-y-2">
                  <SearchCard
                    id={item.id}
                    name={item.name}
                    brand={item.brand}
                    imageUrl={item.image_url}
                  />
                  <button
                    onClick={() => removeItem(String(item.id))}
                    className={cn("w-full rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100", ui.ring)}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-10 text-center">
              <p className="text-lg font-semibold text-slate-700">Wishlist đang trống</p>
              <p className="mt-2 text-sm text-slate-500">Thêm sản phẩm từ Product ID hoặc từ trang chi tiết sản phẩm.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/apiClient";
import SearchCard from "../../components/SearchCard";
import ProductSearch from "../../components/ui/ProductSearch";
import { cn, ui } from "../../components/ui/designSystem";

export default function WishlistPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const fetchWishlist = async () => {
    setLoading(true);
    try {
      const response = await getWishlist();
      setProducts(response.data.data || []);
    } catch (error) {
      setMessage("Không thể tải wishlist. Vui lòng thử lại.");
      console.error("Error fetching wishlist:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWishlist();
  }, []);

  const handleAddToWishlist = async (product) => {
    try {
      const response = await addToWishlist(product.id);

      if (response.status === 201 || response.status === 200) {
        setMessage("Đã thêm sản phẩm vào wishlist.");
        setTimeout(() => setMessage(""), 3000);
        fetchWishlist();
      }
    } catch (error) {
      if (error.response?.status === 409) {
        setMessage("Sản phẩm này đã có trong wishlist.");
      } else {
        setMessage("Không thể thêm sản phẩm. Vui lòng thử lại.");
      }
      setTimeout(() => setMessage(""), 3000);
    }
  };

  const removeItem = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setMessage("Đã xóa khỏi wishlist.");
      setTimeout(() => setMessage(""), 3000);
      fetchWishlist();
    } catch (error) {
      setMessage("Không thể xóa sản phẩm. Vui lòng thử lại.");
      setTimeout(() => setMessage(""), 3000);
    }
  };

  return (
    <div className={cn(ui.pageWrap, "py-10")}> 
      <div className={cn(ui.container, "space-y-6")}> 
        <header className={cn(ui.card, "p-6 md:p-8")}> 
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600">Saved Items</p>
          <h1 className={cn(ui.heading, "mt-3 text-3xl font-black sm:text-4xl")}>Wishlist</h1>
          <p className={cn(ui.mutedText, "mt-3")}>Danh sách sản phẩm bạn đã lưu.</p>
        </header>

        <section className={cn(ui.card, "p-6 md:p-8")}> 
          <div className="max-w-md">
            <ProductSearch
              onSelectProduct={handleAddToWishlist}
              placeholder="Tìm kiếm sản phẩm để thêm..."
            />
            {message ? <p className="mt-2 text-sm text-zinc-500">{message}</p> : null}
          </div>
        </section>

        <section className={cn(ui.card, "p-6 md:p-8")}> 
          {loading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-72 animate-pulse rounded-2xl border border-zinc-200 bg-zinc-100" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((item) => (
                <div key={item.product_id} className="flex flex-col gap-3 h-full">
                  <div className="flex-1">
                    <SearchCard
                      id={item.product_id}
                      name={item.name}
                      brand={item.brand}
                      imageUrl={item.image_url}
                      currentPrice={item.current_price}
                    />
                  </div>
                  <button
                    onClick={() => removeItem(item.product_id)}
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-xl border border-rose-200 bg-white dark:bg-rose-950/20 px-3 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/40 transition-colors",
                      ui.ring
                    )}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                    Xóa
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-10 text-center">
              <p className="text-lg font-semibold text-zinc-700">Wishlist đang trống</p>
              <p className="mt-2 text-sm text-zinc-500">Thêm sản phẩm từ Product ID hoặc từ trang chi tiết sản phẩm.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

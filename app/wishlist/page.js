"use client";

import { useState } from "react";
import useSWR from "swr";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/apiClient";
import SearchCard from "../../components/SearchCard";
import ProductSearch from "../../components/ui/ProductSearch";
import AuthGuard from "../../components/ui/AuthGuard";
import { cn, ui } from "../../components/ui/designSystem";
import { ShoppingBasket, Package, Tags, Trash2 } from "lucide-react";
import { formatPrice } from "@/app/utils/format";

export default function WishlistPage() {
  return (
    <AuthGuard featureName="Giỏ hàng">
      <WishlistContent />
    </AuthGuard>
  );
}

function WishlistContent() {
  const [message, setMessage] = useState("");

  const { data, mutate, isLoading } = useSWR("wishlist-nav", () => getWishlist().then(res => res.data));
  const products = data?.data || [];
  
  const handleAddToWishlist = async (product) => {
    try {
      const response = await addToWishlist(product.id);
      if (response.status === 201 || response.status === 200) {
        setMessage("✓ Đã thêm sản phẩm vào giỏ hàng.");
        setTimeout(() => setMessage(""), 3000);
        mutate();
      }
    } catch (error) {
      if (error.response?.status === 401) {
        setMessage("⚠️ Bạn cần đăng nhập để sử dụng giỏ hàng.");
      } else if (error.response?.status === 409) {
        setMessage("Sản phẩm này đã có trong giỏ hàng.");
      } else {
        setMessage("Không thể thêm sản phẩm. Vui lòng thử lại.");
      }
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const removeItem = async (productId) => {
    try {
      await removeFromWishlist(productId);
      setMessage("Đã xóa khỏi giỏ hàng.");
      setTimeout(() => setMessage(""), 3000);
      mutate();
    } catch (error) {
      if (error.response?.status === 401) {
        setMessage("⚠️ Bạn cần đăng nhập để thực hiện thao tác này.");
      } else {
        setMessage("Không thể xóa sản phẩm. Vui lòng thử lại.");
      }
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // Calculate statistics
  const totalProducts = products.length;
  const totalPrice = products.reduce((sum, item) => sum + (item.current_price || 0), 0);

  return (
    <div className={cn(ui.pageWrap, "py-10")}> 
      <div className={cn(ui.container, "space-y-6")}> 
        
        {/* Header Section */}
        <header className={cn(ui.card, "p-8 md:p-10 relative overflow-hidden")}>
          {/* Decorative Background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <ShoppingBasket className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                </div>
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-violet-600 dark:text-violet-400">
                  Bộ sưu tập
                </p>
              </div>
              <h1 className={cn(ui.heading, "text-3xl font-black sm:text-5xl tracking-tight")}>
                Giỏ hàng
              </h1>
              <p className={cn(ui.mutedText, "mt-4 max-w-xl text-base")}>
                Danh sách những sản phẩm bạn đang lưu trong giỏ hàng. Cập nhật và lưu lại để mua sắm thông minh hơn.
              </p>
            </div>
            
            {/* Statistics */}
            <div className="flex gap-4">
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-w-[120px]">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                  <Package className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Số lượng</span>
                </div>
                <p className="text-2xl font-black text-zinc-900 dark:text-white">
                  {isLoading ? "-" : totalProducts}
                </p>
              </div>
              <div className="bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-4 min-w-[140px]">
                <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 mb-2">
                  <Tags className="w-4 h-4" />
                  <span className="text-xs font-bold uppercase tracking-wider">Tổng giá trị</span>
                </div>
                <p className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1 truncate">
                  {isLoading ? "-" : formatPrice(totalPrice)}
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Add Product Section */}
        <section className={cn(ui.card, "p-6 md:p-8 flex flex-col md:flex-row gap-6 items-start md:items-center")}>
          <div className="flex-1 w-full max-w-md">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-3">Thêm sản phẩm mới</h3>
            <ProductSearch
              onSelectProduct={handleAddToWishlist}
              placeholder="Tìm kiếm theo tên sản phẩm..."
            />
            {message && <p className="mt-3 text-sm font-medium text-emerald-600 dark:text-emerald-400">{message}</p>}
          </div>
          <div className="hidden md:block w-px h-16 bg-zinc-200 dark:bg-zinc-800 mx-4"></div>
          <p className="flex-1 text-sm text-zinc-500 dark:text-zinc-400">
            Bạn có thể tìm kiếm sản phẩm đang có trên hệ thống để thêm nhanh vào giỏ hàng.
          </p>
        </section>

        {/* Product Grid */}
        <section className={cn(ui.card, "p-6 md:p-8")}> 
          {isLoading ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="h-[340px] animate-pulse rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-zinc-900" />
              ))}
            </div>
          ) : products.length > 0 ? (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((item) => (
                <div key={item.product_id} className="flex flex-col h-full bg-white dark:bg-zinc-900/40 rounded-3xl border border-zinc-200 dark:border-zinc-800 overflow-hidden hover:border-violet-300 dark:hover:border-violet-700/50 transition-all shadow-sm hover:shadow-xl group">
                  <div className="flex-1 p-1">
                    <SearchCard
                      id={item.product_id}
                      name={item.name}
                      brand={item.brand}
                      imageUrl={item.image_url}
                      currentPrice={item.current_price}
                    />
                  </div>
                  <div className="p-3 border-t border-zinc-100 dark:border-zinc-800/60 bg-zinc-50 dark:bg-[#0b0712]/50">
                    <button
                      onClick={() => removeItem(item.product_id)}
                      className={cn(
                        "w-full flex items-center justify-center gap-2 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 px-4 py-2.5 text-sm font-semibold text-rose-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 dark:hover:bg-rose-950/30 dark:hover:border-rose-900/50 transition-all",
                        ui.ring
                      )}
                    >
                      <Trash2 className="w-4 h-4" />
                      Bỏ lưu
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/20 py-16 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4">
                <ShoppingBasket className="w-8 h-8 text-zinc-400 dark:text-zinc-500" />
              </div>
              <p className="text-xl font-bold text-zinc-800 dark:text-zinc-200 mb-2">Giỏ hàng đang trống</p>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto">
                Hãy tìm kiếm và thêm các sản phẩm bạn quan tâm vào đây để dễ dàng theo dõi biến động giá nhé.
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

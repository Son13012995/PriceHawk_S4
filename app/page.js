import Link from "next/link";
import Image from "next/image";

export default function Home() {
    return (
        <div className="w-full">
            {/* Hero Section */}
            <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-32 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-violet-50 via-zinc-50 to-zinc-50 dark:from-violet-900/20 dark:via-[#0f0a19] dark:to-[#0f0a19]"></div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        {/* Text Content */}
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-violet-50/80 dark:bg-violet-500/10 text-violet-700 dark:text-violet-400 font-bold text-[10px] tracking-[0.2em] uppercase mb-8 border border-violet-200 dark:border-violet-500/20 shadow-sm">
                                <span className="flex h-2 w-2 rounded-full bg-violet-500 dark:bg-violet-400 animate-pulse shadow-[0_0_8px_rgba(139,92,246,0.8)]"></span>
                                VNU IT Project - K68
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold text-zinc-900 dark:text-white tracking-tight mb-8 leading-[1.1]">
                                So sánh giá <br className="hidden sm:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-violet-500 dark:from-violet-400 dark:to-violet-300">
                                    Đồ Điện Tử
                                </span> thông minh
                            </h1>
                            <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-10 leading-relaxed max-w-xl font-medium">
                                PriceHawk giúp bạn dễ dàng tìm kiếm mức giá tốt nhất cho tai nghe và các thiết bị công nghệ từ những sàn thương mại điện tử hàng đầu.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-5">
                                <Link href="/product" className="inline-flex justify-center items-center px-8 py-4 text-base font-bold text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-600 dark:hover:bg-violet-500 rounded-2xl shadow-xl shadow-violet-600/20 hover:shadow-violet-600/40 transition-all duration-300 active:scale-95">
                                    Xem tất cả sản phẩm
                                </Link>
                                <Link href="#brands" className="inline-flex justify-center items-center px-8 py-4 text-base font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-white/5 border border-zinc-200 dark:border-white/10 hover:bg-zinc-50 dark:hover:bg-white/10 rounded-2xl transition-all duration-300">
                                    Khám phá thương hiệu
                                </Link>
                            </div>
                        </div>

                        {/* Image/Visual */}
                        <div className="relative mx-auto w-full max-w-lg lg:max-w-none z-10">
                            {/* Decorative Blobs */}
                            <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-300 dark:bg-indigo-500 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob"></div>
                            <div className="absolute top-0 -right-4 w-72 h-72 bg-violet-300 dark:bg-violet-500 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 dark:bg-pink-500 rounded-full mix-blend-multiply dark:mix-blend-lighten filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

                            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-zinc-200/50 dark:shadow-none border border-white/60 dark:border-zinc-700 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-sm p-2">
                                <Image
                                    src="/people.jpg"
                                    alt="Budspot Banner"
                                    width={800}
                                    height={600}
                                    className="object-cover rounded-xl w-full h-auto transform hover:scale-[1.02] transition-transform duration-700 ease-out"
                                    priority
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Brands Section */}
            <section id="brands" className="py-24 bg-white dark:bg-[#0f0a19] border-y border-zinc-100 dark:border-white/5 scroll-mt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-4">Thương hiệu nổi bật</h2>
                        <p className="text-zinc-500 dark:text-zinc-400 font-medium">Giá luôn được cập nhật liên tục từ các nguồn phân phối uy tín nhất</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                        {["Apple", "Sony", "Samsung", "Beats", "Jbl", "Bose", "Google", "Aukey", "Jaybird", "Belkin"].map((brand) => (
                            <Link key={brand} href={`/search/${brand.toLowerCase()}`} className="group flex items-center justify-center h-24 w-full bg-zinc-50 dark:bg-white/5 border border-zinc-100 dark:border-white/10 rounded-2xl hover:bg-white dark:hover:bg-white/10 hover:border-violet-200 dark:hover:border-violet-500/50 hover:shadow-xl hover:shadow-indigo-50 dark:hover:shadow-none transition-all duration-300">
                                <span className="font-bold text-zinc-600 dark:text-zinc-400 group-hover:text-violet-600 dark:group-hover:text-white text-lg transition-colors">
                                    {brand}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Demo Products Section */}
            <section className="py-24 bg-zinc-50 dark:bg-[#0c0814]">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-zinc-900 dark:text-white mb-2">Trải nghiệm nhanh</h2>
                            <p className="text-zinc-500 dark:text-zinc-400 font-medium">Xem ngay các sản phẩm đang được tự động so sánh giá</p>
                        </div>
                        <Link href="/product" className="text-violet-600 dark:text-violet-400 font-bold hover:text-violet-700 dark:hover:text-white flex items-center gap-1 transition-colors">
                            Xem tất cả danh mục <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                        {[147, 149, 150, 192, 193].map((id) => (
                            <Link key={id} href={`/product/${id}`} className="group relative bg-white dark:bg-white/5 p-6 rounded-3xl border border-zinc-100 dark:border-white/10 shadow-sm hover:shadow-xl hover:border-violet-200 dark:hover:border-violet-500/30 transition-all duration-300">
                                <div className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-violet-500 ring-4 ring-violet-50 dark:ring-violet-500/20"></div>
                                <div className="h-14 w-14 bg-violet-50/50 dark:bg-violet-500/10 rounded-2xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-violet-100 dark:group-hover:bg-violet-500/20 transition-all duration-300">
                                    <svg className="w-7 h-7 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zM21 16c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z" />
                                    </svg>
                                </div>
                                <div className="text-lg font-bold text-zinc-900 dark:text-white mb-1">ID #{id}</div>
                                <div className="text-sm font-medium text-zinc-500 dark:text-zinc-500">Sản phẩm mẫu</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
}
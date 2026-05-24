import Link from "next/link";
import Image from "next/image";
import HeroSearch from "@/components/HeroSearch";
import TrendingDeals from "@/components/TrendingDeals";

export default function Home() {
    return (
        <div className="w-full flex flex-col min-h-screen bg-zinc-50 dark:bg-[#09090b]">
            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden flex flex-col items-center justify-center text-center px-4">
                {/* Background Gradient / Blobs */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-violet-100/50 via-zinc-50 to-zinc-50 dark:from-violet-900/20 dark:via-[#09090b] dark:to-[#09090b]"></div>
                
                <h1 className="text-4xl sm:text-5xl lg:text-[4rem] font-extrabold text-zinc-900 dark:text-white tracking-tight mb-6 leading-tight max-w-4xl mx-auto">
                    Săn giá thông minh với <br className="hidden sm:block" />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-600 to-violet-400 dark:from-violet-500 dark:to-violet-300">
                        PriceHawk Intelligence
                    </span>
                </h1>
                
                <p className="text-lg sm:text-xl text-zinc-600 dark:text-zinc-400 mb-12 max-w-2xl mx-auto leading-relaxed">
                    Hệ thống theo dõi giá thời gian thực giúp bạn luôn chốt đơn với mức giá tối ưu nhất trên mọi sàn thương mại điện tử.
                </p>

                {/* Big Search Bar */}
                <div className="w-full max-w-2xl mx-auto relative z-20 flex justify-center">
                    <div className="w-full shadow-2xl shadow-violet-500/10 rounded-[18px] bg-white dark:bg-[#18181b] p-1 flex gap-2 border border-zinc-200 dark:border-zinc-800">
                        <HeroSearch />
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-12 relative z-10 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Feature 1 */}
                        <div className="bg-white dark:bg-[#18181b] p-8 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="h-12 w-12 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition-all">
                                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Price Tracking</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Biểu đồ biến động giá chi tiết trong 7 ngày, giúp bạn nhận diện đâu là đợt giảm giá ảo.
                            </p>
                        </div>
                        
                        {/* Feature 2 */}
                        <div className="bg-white dark:bg-[#18181b] p-8 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="h-12 w-12 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition-all">
                                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Instant Alerts</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                Nhận thông báo ngay lập tức khi sản phẩm chạm mức giá bạn mong đợi.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-white dark:bg-[#18181b] p-8 rounded-[24px] border border-zinc-200 dark:border-zinc-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                            <div className="h-12 w-12 bg-violet-50 dark:bg-violet-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:bg-violet-100 dark:group-hover:bg-violet-900/40 transition-all">
                                <svg className="w-6 h-6 text-violet-600 dark:text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-3">Multi-store Comparison</h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                                So sánh giá tự động giữa FPT Shop, Thế Giới Di Động, CellphoneS và các hệ thống bán lẻ hàng đầu.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Trending Deals */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-6xl">
                    <div className="flex items-center justify-between mb-8">
                        <div>
                            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block mb-1">Live Updates</span>
                            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">Trending Deals</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                            </button>
                            <button className="w-10 h-10 rounded-full border border-zinc-200 dark:border-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                    
                    <TrendingDeals />
                </div>
            </section>

            {/* Partners Section */}
            <section className="py-12 px-4">
                <div className="container mx-auto max-w-6xl text-center">
                    <p className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest mb-8">
                        ĐỐI TÁC TIN CẬY TỪ HƠN 50+ NHÀ BÁN LẺ
                    </p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-60 grayscale hover:grayscale-0 transition-all duration-500">
                        {/* Only Crawled Partners */}
                        <span className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 text-lg">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs border border-zinc-300 dark:border-zinc-700">F</div>
                            FPT Shop
                        </span>
                        <span className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 text-lg">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs border border-zinc-300 dark:border-zinc-700">TG</div>
                            Thế Giới Di Động
                        </span>
                        <span className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 text-lg">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs border border-zinc-300 dark:border-zinc-700">CP</div>
                            CellphoneS
                        </span>
                        <span className="flex items-center gap-2 font-bold text-zinc-700 dark:text-zinc-300 text-lg">
                            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-xs border border-zinc-300 dark:border-zinc-700">HH</div>
                            Hoàng Hà
                        </span>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 px-4">
                <div className="container mx-auto max-w-5xl">
                    <div className="bg-violet-600 rounded-[2.5rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl shadow-violet-500/20">
                        {/* Decorative background elements */}
                        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3"></div>
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3"></div>
                        
                        <div className="relative z-10">
                            <h2 className="text-3xl md:text-5xl font-extrabold text-white mb-6 tracking-tight">
                                Sẵn sàng để mua sắm thông minh hơn?
                            </h2>
                            <p className="text-violet-100 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed font-medium">
                                Tham gia cùng hơn 100,000 người dùng PriceHawk để tiết kiệm hàng triệu đồng mỗi tháng. Miễn phí hoàn toàn cho người dùng cá nhân.
                            </p>
                            <Link href="/product" className="inline-flex justify-center items-center px-10 py-4 text-lg font-bold text-violet-700 bg-white hover:bg-zinc-50 rounded-xl shadow-xl transition-transform hover:-translate-y-1">
                                Bắt đầu ngay
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
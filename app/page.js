import Link from "next/link";
import Image from "next/image";

export default function Home() {
    return (
        <div className="w-full">
            {/* Hero Section */}
            <section className="relative pt-20 pb-24 lg:pt-32 lg:pb-32 overflow-hidden">
                {/* Background Gradient */}
                <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50 via-slate-50 to-slate-50"></div>

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl relative">
                    <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
                        {/* Text Content */}
                        <div className="max-w-2xl">
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-100/80 text-indigo-700 font-semibold text-xs tracking-wide uppercase mb-6 border border-indigo-200 shadow-sm">
                                <span className="flex h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
                                VNU IT Project - K68
                            </div>
                            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-slate-900 tracking-tight mb-6 leading-[1.15]">
                                So sánh giá <br className="hidden sm:block" />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                                    Đồ Điện Tử
                                </span> thông minh
                            </h1>
                            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                                PriceHawk giúp bạn dễ dàng tìm kiếm mức giá tốt nhất cho tai nghe và các thiết bị công nghệ từ những sàn thương mại điện tử hàng đầu.
                            </p>
                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link href="/product" className="inline-flex justify-center items-center px-8 py-3.5 text-base font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:shadow-indigo-300 hover:-translate-y-0.5 transition-all duration-300">
                                    Xem tất cả sản phẩm
                                </Link>
                                <Link href="#brands" className="inline-flex justify-center items-center px-8 py-3.5 text-base font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl transition-all duration-300">
                                    Khám phá thương hiệu
                                </Link>
                            </div>
                        </div>

                        {/* Image/Visual */}
                        <div className="relative mx-auto w-full max-w-lg lg:max-w-none z-10">
                            {/* Decorative Blobs */}
                            <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
                            <div className="absolute top-0 -right-4 w-72 h-72 bg-violet-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
                            <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-300 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-4000"></div>

                            <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-slate-200/50 border border-white/60 bg-white/50 backdrop-blur-sm p-2">
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
            <section id="brands" className="py-24 bg-white border-y border-slate-100 scroll-mt-16">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <h2 className="text-3xl font-bold text-slate-900 mb-4">Thương hiệu nổi bật</h2>
                        <p className="text-slate-500">Giá luôn được cập nhật liên tục từ các nguồn phân phối uy tín nhất</p>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 lg:gap-6">
                        {["Apple", "Sony", "Samsung", "Beats", "Jbl", "Bose", "Google", "Aukey", "Jaybird", "Belkin"].map((brand) => (
                            <Link key={brand} href={`/search/${brand.toLowerCase()}`} className="group flex items-center justify-center h-24 w-full bg-slate-50 border border-slate-100 rounded-2xl hover:bg-white hover:border-indigo-200 hover:shadow-xl hover:shadow-indigo-50 hover:-translate-y-1 transition-all duration-300">
                                <span className="font-bold text-slate-600 group-hover:text-indigo-600 text-lg transition-colors">
                                    {brand}
                                </span>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

            {/* Demo Products Section */}
            <section className="py-24 bg-slate-50">
                <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
                        <div>
                            <h2 className="text-3xl font-bold text-slate-900 mb-2">Trải nghiệm nhanh</h2>
                            <p className="text-slate-500">Xem ngay các sản phẩm đang được tự động so sánh giá</p>
                        </div>
                        <Link href="/product" className="text-indigo-600 font-semibold hover:text-indigo-800 flex items-center gap-1 transition-colors">
                            Xem tất cả danh mục <span aria-hidden="true">&rarr;</span>
                        </Link>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 lg:gap-6">
                        {[147, 149, 150, 192, 193].map((id) => (
                            <Link key={id} href={`/product/${id}`} className="group relative bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-indigo-50/80 hover:border-indigo-200 hover:-translate-y-1 transition-all duration-300">
                                <div className="absolute top-4 right-4 h-2.5 w-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-50"></div>
                                <div className="h-14 w-14 bg-indigo-50/50 rounded-xl flex items-center justify-center mb-5 group-hover:scale-110 group-hover:bg-indigo-100 transition-all duration-300">
                                    {/* Thay icon svg mặc định cho sinh động hơn */}
                                    <svg className="w-7 h-7 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2zM21 16c-1.105 0-2 .895-2 2s.895 2 2 2 2-.895 2-2-.895-2-2-2z" />
                                    </svg>
                                </div>
                                <div className="text-lg font-bold text-slate-900 mb-1">ID #{id}</div>
                                <div className="text-sm font-medium text-slate-500">Sản phẩm mẫu</div>
                            </Link>
                        ))}
                    </div>
                </div>
            </section>

        </div>
    );
}
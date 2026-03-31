"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    const handleSubmit = (event) => {
        event.preventDefault();

        // Tránh lỗi khi người dùng bấm tìm kiếm chuỗi rỗng hoặc toàn dấu cách
        if (searchTerm.trim() !== "") {
            try {
                // Sử dụng encodeURIComponent để URL không bị lỗi nếu gõ ký tự đặc biệt
                router.push(`/search/${encodeURIComponent(searchTerm.trim())}`);
            } catch (error) {
                console.error("Error during search", error);
            }
        }
    };

    return (
        <nav className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm transition-all">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between items-center h-16 gap-4">

                    {/* 1. Logo (Bên trái) */}
                    <div className="flex-shrink-0 flex items-center">
                        <Link href="/" className="text-2xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600 tracking-tight">
                            BudSpot
                        </Link>
                    </div>

                    {/* 2. Menu Links (Ở giữa - Ẩn trên Mobile) */}
                    <div className="hidden md:flex space-x-8 items-center">
                        <Link href="/product" className="text-slate-600 hover:text-indigo-600 font-semibold transition-colors">
                            Products
                        </Link>
                        <Link
                            target="_blank"
                            rel="noopener noreferrer"
                            href="https://github.com/Son13012995/PriceHawk_S4"
                            className="text-slate-600 hover:text-indigo-600 font-semibold transition-colors"
                        >
                            Project Report
                        </Link>
                    </div>

                    {/* 3. Search Bar (Bên phải) */}
                    <div className="flex-1 max-w-sm w-full lg:max-w-xs ml-auto">
                        <form onSubmit={handleSubmit} className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                {/* Search Icon */}
                                <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            <input
                                type="search"
                                placeholder="Tìm kiếm sản phẩm..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="block w-full pl-10 pr-4 py-2 border border-slate-200 rounded-full text-sm text-slate-900 bg-slate-50 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all shadow-inner"
                            />
                        </form>
                    </div>

                </div>
            </div>
        </nav>
    );
}